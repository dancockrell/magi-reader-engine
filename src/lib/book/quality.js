/**
 * Is this book any good, as opposed to merely well formed?
 *
 * `validate.js` answers a different question. It asks whether a book can
 * be read at all: does every glossed word appear, does `correct` point
 * at an option that exists, is the markup balanced. A book that passes
 * it is safe to put in front of a class. It is not necessarily worth
 * putting in front of a class.
 *
 * That gap is the whole problem with generating books at scale. A model
 * asked for eight comprehension questions will return eight
 * well-formed comprehension questions every time, and some of them will
 * test nothing. The contract cannot see it, because there is nothing
 * malformed to see.
 *
 * So this is the second gate, and it is a different kind of thing:
 *
 *   validate.js  hard, deterministic, runs in CI, blocks a merge
 *   quality.js   advisory, deterministic, runs at authoring time,
 *                reports and scores
 *
 * Advisory matters. A human author can knowingly break any rule here and
 * be right to; a generator producing a hundred books cannot, so the
 * report is where a person looks before letting a batch through.
 *
 * EVERY CHECK HERE IS A TEST-TAKING HEURISTIC, not a matter of taste.
 * The bar for adding one is that a student could exploit it to score
 * without reading. "This question is boring" is not checkable and is not
 * here. What is here was measured against the shipping book first: the
 * position-bias check found that 43% of its answers sit in option 0.
 *
 * ONE CHECK WAS TRIED AND REMOVED. "A gloss that explains a word using a
 * longer word" sounded reasonable and flagged `coax` as "gently
 * persuade" and `truant` as "staying away from school without
 * permission", both of which are exactly right. Length is not
 * difficulty. Doing that properly needs a frequency list, which is a
 * real thing to add later and worth more than the proxy was.
 *
 * WHAT THIS STILL CANNOT SEE, and it is the important half: whether a
 * question can be answered without reading the passage. That needs a
 * model in the loop, answering with the text withheld and being scored
 * against chance. Deterministic code cannot do it. The shape is
 * described in docs/BOOK-FORMAT.md so it is a known gap rather than an
 * assumed capability.
 */

/**
 * `detail` marks a finding that elaborates another one rather than
 * standing on its own — the per-question breakdown under a book-wide
 * fault. Reported, but not scored, so a book is not punished once for a
 * defect and again for every place the tool can point at it.
 *
 * @typedef {{kind: string, severity: 'high'|'low', where: string, what: string, why: string, detail?: boolean}} Finding
 */

/**
 * Words that make an option look wrong to anyone who has sat an exam.
 *
 * Phrases, matched with word boundaries, not substrings. The first
 * version listed "all of", which flagged "Why she spent all of their
 * saved money" — ordinary prose and a perfectly good distractor. That is
 * the over-firing failure this file warns about two paragraphs up, so it
 * is worth saying plainly that it happened here: the same loose pattern
 * was in `tools/debias.mjs` and made it skip that question too.
 *
 * "all of the above" IS a real tell. "all of" is not.
 */
const ABSOLUTES = [
  /\balways\b/i,
  /\bnever\b/i,
  /\b(all|none|both)\s+of\s+the\s+(above|following)\b/i,
  /\bevery\s+single\b/i,
  /\bnobody\s+ever\b/i,
  /\bno\s+one\s+ever\b/i,
];

const words = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z'\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/**
 * Every question a student is actually marked on.
 *
 * Including the act reviews, which this missed at first. A recap is
 * marked by the same code as a multiple-choice question — `assessment.js`
 * compares `choice === q.correct` for both — so it can be gamed the same
 * ways, and skipping it meant the gate reported on 28 of the 32
 * questions a reader builds. The four it ignored were exactly the four
 * that had already spent a release being ignored by everything else.
 *
 * The rule for this file: if a student can score a mark on it, it is
 * checked. Where the book files it is not interesting.
 */
export function questionsOf(book) {
  const out = [];
  for (const [id, t] of Object.entries(book?.teaching || {})) {
    for (const [i, q] of (t?.mc || []).entries()) out.push({ unit: id, i, ...q });
    if (t?.recap) out.push({ unit: id, i: 'recap', ...t.recap });
  }
  return out;
}

/** Where a finding is, said the way a person would say it. A recap has
 *  no number, and "s3 question recap1" is what happens if you forget. */
const whereOf = (q) =>
  q.i === 'recap' ? `${q.unit} act review` : `${q.unit} question ${q.i + 1}`;

/** Every glossed word, flattened out of the units. */
export function glossesOf(book) {
  const out = [];
  for (const u of book?.units || []) {
    for (const g of u?.gloss || []) {
      const [w, d] = Array.isArray(g) ? g : [g?.w, g?.d];
      if (w) out.push({ unit: u.id, w: String(w), d: String(d || '') });
    }
  }
  return out;
}

/**
 * Where does the right answer sit?
 *
 * The single commonest defect in generated multiple choice, and the
 * easiest for a student to exploit: if the answer is usually first, then
 * always answering first beats reading. Measured against what an even
 * spread would give for the options actually offered, so a book of
 * three-option questions is not judged against a four-option baseline.
 */
export function positionBias(questions) {
  if (!questions.length) return null;
  const slots = new Map();
  for (const q of questions) slots.set(q.correct, (slots.get(q.correct) || 0) + 1);

  const widest = Math.max(...questions.map((q) => (q.opts || []).length), 1);
  const even = 1 / widest;
  let worst = { slot: 0, share: 0 };
  for (const [slot, n] of slots) {
    const share = n / questions.length;
    if (share > worst.share) worst = { slot, share };
  }
  return { ...worst, even, excess: worst.share - even };
}

/**
 * Does the answer key repeat?
 *
 * Added when `tools/debias.mjs` was written to fix position bias. The
 * obvious fix is to assign slots round-robin, which produces a perfect
 * even spread — and the sequence 0,1,2,3,0,1,2,3, which scores 100% for
 * any student who notices. `positionBias` would report that as clean,
 * because it is: every slot gets exactly its share.
 *
 * So a balanced key is necessary and not sufficient, and a gate that
 * only checked balance would have blessed a book that was *more*
 * exploitable than the one it started from. Any fix that satisfies a
 * check while defeating its purpose is worth a check of its own.
 *
 * Returns the shortest period that explains most of the key, or null.
 */
export function answerCycle(questions) {
  const seq = questions.map((q) => q.correct).filter((n) => typeof n === 'number');
  if (seq.length < 8) return null;

  for (let p = 1; p <= 4; p++) {
    if (seq.length < p * 3) break;
    let hits = 0;
    for (let i = p; i < seq.length; i++) if (seq[i] === seq[i - p]) hits++;
    const share = hits / (seq.length - p);
    if (share > 0.85) return { period: p, share, length: seq.length };
  }
  return null;
}

/**
 * Score a book, and say what is wrong with it.
 *
 * @param {object} book
 * @returns {{score: number, findings: Finding[], counts: {questions: number, glosses: number}}}
 */
export function qualityOf(book) {
  /** @type {Finding[]} */
  const findings = [];
  const questions = questionsOf(book);
  const glosses = glossesOf(book);

  /* ---- the answer is in the same place too often ---- */
  const bias = positionBias(questions);
  if (bias && bias.excess > 0.15) {
    findings.push({
      kind: 'answer-position',
      severity: bias.excess > 0.25 ? 'high' : 'low',
      where: 'the whole book',
      what: `the answer is option ${bias.slot} in ${Math.round(bias.share * 100)}% of ${questions.length} questions`,
      why:
        `an even spread would be about ${Math.round(bias.even * 100)}%. A student who always ` +
        `picks option ${bias.slot} scores ${Math.round(bias.share * 100)}% without reading.`,
    });
  }

  /* ---- the answer key repeats ---- */
  const cycle = answerCycle(questions);
  if (cycle) {
    findings.push({
      kind: 'answer-cycle',
      severity: 'high',
      where: 'the whole book',
      what:
        `the answer position repeats every ${cycle.period} question(s) ` +
        `across ${cycle.length} questions`,
      why:
        'a student who spots the pattern scores every mark without reading. ' +
        'An even spread is not enough on its own; the order has to be unpredictable too.',
    });
  }

  /* ---- the longest option is the answer ----
   *
   * Reported per question as well as in aggregate. "82% of questions"
   * is a true statement nobody can act on: it names no question to fix.
   * The book-wide finding says how bad it is; the per-question ones say
   * where to start, worst margin first, because the question whose
   * answer runs 60 characters longer than every distractor is the one
   * giving the game away. */
  if (questions.length >= 5) {
    const offenders = [];
    for (const q of questions) {
      const lens = (q.opts || []).map((o) => String(o).length);
      if (lens.length < 2) continue;
      const mine = lens[q.correct];
      if (mine !== Math.max(...lens)) continue;
      const others = lens.filter((_, i) => i !== q.correct);
      offenders.push({ q, margin: mine - Math.max(...others) });
    }

    const share = offenders.length / questions.length;
    if (share > 0.55) {
      findings.push({
        kind: 'longest-option',
        severity: share > 0.7 ? 'high' : 'low',
        where: 'the whole book',
        what: `the longest option is the answer in ${Math.round(share * 100)}% of questions`,
        why:
          'writers elaborate the option they know is true and leave the others terse. ' +
          'Picking the longest is a strategy that works on this book.',
      });

      /* Only the ones where length alone gives it away. A one-character
         margin is noise; a long one is a tell a student can see. */
      for (const o of offenders
        .filter((x) => x.margin >= 10)
        .sort((a, b) => b.margin - a.margin)) {
        findings.push({
          kind: 'longest-option-question',
          severity: 'low',
          /* Detail of the book-wide finding above, not a separate fault.
             Without this the same defect is scored eighteen times and
             the book drops from 62 to 9 for getting MORE informative,
             which would teach everyone to distrust the score. */
          detail: true,
          where: whereOf(o.q),
          what: `its answer is ${o.margin} characters longer than any other option`,
          why:
            'length alone points at the answer here. Lengthen the distractors ' +
            'or trim the answer until they are comparable.',
        });
      }
    }
  }

  /* ---- a distractor nobody would pick ---- */
  for (const q of questions) {
    for (const [i, opt] of (q.opts || []).entries()) {
      if (i === q.correct) continue;
      const hit = ABSOLUTES.map((a) => String(opt).match(a)).find(Boolean);
      if (hit) {
        findings.push({
          kind: 'absolute-distractor',
          severity: 'low',
          where: whereOf(q),
          what: `a wrong option says "${hit[0]}"`,
          why: 'absolutes read as false to anyone who has sat an exam, so the option does no work.',
        });
      }
    }
  }

  /* ---- a definition that uses the word it defines ----
   *
   * Skips proper nouns, because for a name the full form IS the
   * definition: "Pallas" as "Pallas Athena, Greek goddess of wisdom"
   * reads as circular to a string comparison and is exactly what a
   * student needs. Caught by running this against The Raven, which
   * glosses Pallas, Plutonian, Gilead and Aidenn. A check that fires on
   * good work gets ignored, and then it is worth nothing when it fires
   * on bad work. */
  for (const g of glosses) {
    if (/^[A-Z]/.test(g.w)) continue;
    const stem = g.w.toLowerCase().replace(/(ing|ed|es|s)$/, '');
    if (stem.length > 3 && words(g.d).some((x) => x.startsWith(stem))) {
      findings.push({
        kind: 'circular-gloss',
        severity: 'high',
        where: `${g.unit}, "${g.w}"`,
        what: `defined as "${g.d}"`,
        why: 'a definition containing its own word teaches nothing to someone who does not know it.',
      });
    }
  }

  /* ---- the same question twice ---- */
  const seen = new Map();
  for (const q of questions) {
    const key = words(q.q).join(' ');
    if (!key) continue;
    if (seen.has(key)) {
      findings.push({
        kind: 'duplicate-question',
        severity: 'low',
        where: whereOf(q),
        what: `asks the same thing as ${seen.get(key)}`,
        why: 'two marks for one piece of understanding, and one fewer thing taught.',
      });
    } else seen.set(key, whereOf(q));
  }

  /* ---- a part of the book nothing asks about ---- */
  const asked = new Set(questions.map((q) => q.unit));
  for (const u of book?.units || []) {
    /* A null unit is the contract's problem, not this one's. Quality
       runs on books that may not be valid yet, so it has to survive
       anything validate.js would reject rather than throwing over it. */
    if (!u?.id) continue;
    if (!asked.has(u.id)) {
      findings.push({
        kind: 'unasked-part',
        severity: 'low',
        where: u.id,
        what: 'no question anywhere refers to this part',
        why: 'a part that is never asked about is a part a student can skip without cost.',
      });
    }
  }

  /* A score, so a batch can be sorted worst-first. Not a grade: it
     exists to put the book most worth a human's attention at the top.

     Detail findings are excluded. They elaborate a fault already counted
     above, and scoring both means a book is punished once for the defect
     and again for every place the tool can point at it. */
  const scored = findings.filter((f) => !f.detail);
  const high = scored.filter((f) => f.severity === 'high').length;
  const low = scored.length - high;
  const score = Math.max(0, 100 - high * 15 - low * 4);

  return { score, findings, counts: { questions: questions.length, glosses: glosses.length } };
}
