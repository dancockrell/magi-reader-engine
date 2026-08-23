/**
 * A submission, turned into a gradebook row.
 *
 * This is the seam where the reader stops and the gradebook starts, and
 * it is where two of the worst defects in the original lived. Both are
 * encoded as invariants here rather than as remembered care.
 */

/** Does this submission carry an automatically-marked score at all? */
export function hasAutoScore(payload) {
  return (
    payload != null &&
    payload.score !== null &&
    payload.score !== undefined &&
    Number.isFinite(payload.score)
  );
}

/**
 * Reading 3 sends score:null with totalItems set to the number of
 * WRITTEN questions. Recording an "out of" with no score made those
 * questions count twice — once in the automatic total, where they can
 * never be earned, and again as written marks the teacher awards. A
 * student who answered everything perfectly scored 8/12.
 *
 * So the automatic fields travel together or not at all.
 */
export function autoColumns(payload) {
  if (!hasAutoScore(payload)) return { score: '', outOf: '', percent: '' };
  const n = (v) => (Number.isFinite(v) ? v : '');
  return {
    score: n(payload.score),
    outOf: n(payload.totalItems),
    percent: n(payload.percent),
  };
}

/**
 * @param {string|object|null|undefined} json
 * @param {string} [filename]
 * @returns {import('../types.js').Row|null}
 */
export function parseSubmission(json, filename = '') {
  let p = json;
  if (typeof json === 'string') {
    try {
      p = JSON.parse(json);
    } catch {
      return null;
    }
  }
  if (!p || !p.assignment || !Array.isArray(p.items)) return null;

  let right = 0;
  let total = 0;
  let retried = 0;
  for (const it of p.items) {
    if (it.kind === 'written' || it.answer != null) continue;
    total += 1;
    if (it.isCorrect) right += 1;
    if (it.retried) retried += 1;
  }

  const auto = autoColumns(p);
  return {
    file: filename,
    cls: p.className || '',
    no: p.studentNo || '',
    name: p.realName || p.nickname || '',
    assignment: p.assignment,
    pass: p.pass,
    when: String(p.submittedAt || '')
      .slice(0, 16)
      .replace('T', ' '),
    minutes: p.minutesSpent || 0,
    scoreNum: auto.score,
    totalNum: auto.outOf,
    percentNum: auto.percent,
    autoRight: right,
    autoTotal: total,
    retried: retried || '',
    payload: p,
  };
}

/**
 * The newest attempt wins — but it says so.
 *
 * Silently replacing a grade is the worst thing a gradebook can do: a
 * student who reopens the reading and hands in a half-finished second
 * attempt would overwrite a complete first one, and the teacher would
 * see the lower mark with nothing to say a better one had existed.
 */
/**
 * @param {import('../types.js').Row[]} rows
 * @param {import('../types.js').Row} row
 * @returns {import('../types.js').Row[]}
 */
export function mergeAttempt(rows, row) {
  /** @param {import('../types.js').Row} r */
  const key = (r) => [r.no || r.name, r.assignment].join('||');
  const k = key(row);
  /** @type {import('../types.js').Row|null} */
  let prior = null;
  const kept = rows.filter((r) => {
    if (key(r) !== k) return true;
    prior = r;
    return false;
  });
  if (prior) {
    row.attempts = (prior.attempts || 1) + 1;
    row.priorScore = prior.scoreNum;
    row.priorPercent = prior.percentNum;
    row.lowerThanPrior =
      typeof row.percentNum === 'number' &&
      typeof prior.percentNum === 'number' &&
      row.percentNum < prior.percentNum;
  } else {
    row.attempts = 1;
  }
  kept.push(row);
  return kept;
}
