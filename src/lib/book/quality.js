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

/** @typedef {{kind: string, severity: 'high'|'low', where: string, what: string, why: string}} Finding */

/** Words that make an option look wrong to anyone who has sat an exam. */
const ABSOLUTES = ['always', 'never', 'all of', 'none of', 'every single', 'nobody ever'];

const words = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z'\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/** Every multiple-choice question, from wherever a book keeps them. */
export function questionsOf(book) {
  const out = [];
  for (const [id, t] of Object.entries(book?.teaching || {})) {
    for (const [i, q] of (t?.mc || []).entries()) out.push({ unit: id, i, ...q });
  }
  for (const u of book?.units || []) {
    for (const [i, q] of (u?.mc || []).entries()) out.push({ unit: u.id, i, ...q });
  }
  return out;
}

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

  /* ---- the longest option is the answer ---- */
  if (questions.length >= 5) {
    const longest = questions.filter((q) => {
      const lens = (q.opts || []).map((o) => String(o).length);
      return lens.length > 1 && lens[q.correct] === Math.max(...lens);
    }).length;
    const share = longest / questions.length;
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
    }
  }

  /* ---- a distractor nobody would pick ---- */
  for (const q of questions) {
    for (const [i, opt] of (q.opts || []).entries()) {
      if (i === q.correct) continue;
      const low = String(opt).toLowerCase();
      const hit = ABSOLUTES.find((a) => low.includes(a));
      if (hit) {
        findings.push({
          kind: 'absolute-distractor',
          severity: 'low',
          where: `${q.unit} question ${q.i + 1}`,
          what: `a wrong option says "${hit}"`,
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
        where: `${q.unit} question ${q.i + 1}`,
        what: `asks the same thing as ${seen.get(key)}`,
        why: 'two marks for one piece of understanding, and one fewer thing taught.',
      });
    } else seen.set(key, `${q.unit} question ${q.i + 1}`);
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
     exists to put the book most worth a human's attention at the top. */
  const high = findings.filter((f) => f.severity === 'high').length;
  const low = findings.length - high;
  const score = Math.max(0, 100 - high * 15 - low * 4);

  return { score, findings, counts: { questions: questions.length, glosses: glosses.length } };
}
