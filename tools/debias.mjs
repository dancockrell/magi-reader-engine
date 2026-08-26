/**
 * Move the right answer around, without changing a word of the book.
 *
 * The quality gate reports the same defect in every book we have: the
 * answer sits in one slot far more often than chance. The Raven and the
 * fixture put it in option 1 half the time; Magi puts it in option 0 in
 * 41% of 32 questions. A student who always picks that slot scores that
 * much without reading, which is the plainest way a comprehension
 * question can fail to comprehend anything.
 *
 * It is a mechanical defect, so it gets a mechanical fix. Nothing here
 * edits text: it permutes each question's options and moves `correct` to
 * match, which cannot change what the question asks or what is true.
 *
 * TWO THINGS THIS HAS TO GET RIGHT, and the second is the interesting one.
 *
 * 1. Some option sets are order-dependent. "All of the above" means
 *    nothing in position 0. Anything containing all of / none of / both
 *    of / above is left exactly as it is, and reported as skipped rather
 *    than silently passed over.
 *
 * 2. A balanced answer key can still be trivially exploitable. Assigning
 *    slots round-robin gives a perfect 25/25/25/25 and a visible cycle
 *    0,1,2,3,0,1,2,3 — which scores 100% for any student who notices, and
 *    the position-bias check would call it clean. So the target slots are
 *    a balanced multiset put through a seeded shuffle: even counts, no
 *    period. Seeded, so running this twice gives the same book.
 *
 * That second point is why `quality.js` now also checks for a cycle. A
 * fix that satisfies the existing gate while creating a worse exploit is
 * exactly the sort of thing an advisory gate is supposed to catch.
 *
 *   node tools/debias.mjs <book.json> [--write]
 *
 * Prints what it would do. Only writes with --write.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/* An option whose meaning depends on where it sits. Matched as phrases,
   not substrings: "all of" alone catches "she spent all of their saved
   money", which is ordinary prose and perfectly movable. The first
   version did exactly that and skipped a good question, which is the
   over-firing failure quality.js warns about in its own header. */
const ORDER_DEPENDENT = [
  /\b(all|none|both|any|either|neither)\s+of\s+the\s+(above|following|others?)\b/i,
  /\b(the\s+)?(first|second|third|last)\s+(two|three|option|answer)\b/i,
  /\b[ab]\s+and\s+[bc]\b/i,
  /\bnone\s+of\s+these\b/i,
];

/* Deterministic PRNG. Math.random would make the output unreproducible,
   so a book could not be regenerated and diffed against its own history. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(s) {
  let h = 2166136261;
  for (const ch of String(s)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffled(list, rand) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Every question, with a setter so we can write `correct` back in place. */
function questionsOf(book) {
  const out = [];
  for (const [id, t] of Object.entries(book?.teaching || {})) {
    for (const [i, q] of (t?.mc || []).entries()) out.push({ id, where: `${id} q${i + 1}`, q });
    if (t?.recap) out.push({ id, where: `${id} act review`, q: t.recap });
  }
  return out;
}

const file = resolve(process.argv[2] || '');
const write = process.argv.includes('--write');
if (!process.argv[2]) {
  console.error('usage: node tools/debias.mjs <book.json> [--write]');
  process.exit(2);
}

const raw = readFileSync(file, 'utf8');
const book = JSON.parse(raw);

/* Match the file's own formatting. These books are written with a ONE
   space indent; re-emitting at the JSON.stringify default of 2 would
   rewrite all 12,757 lines of Magi to change nineteen numbers, and the
   real edit would be unreviewable inside the noise. Detected rather than
   assumed, so a differently-formatted pack survives this too. */
const indentOf = (text) => {
  const m = text.match(/^\{\r?\n([ \t]+)"/);
  return m ? m[1] : 2;
};
const INDENT = indentOf(raw);
const TRAILING_NEWLINE = /\n$/.test(raw) ? '\n' : '';
const all = questionsOf(book);

console.log(`questions found: ${all.length}`);
if (!all.length) {
  console.error('NO QUESTIONS FOUND — nothing to balance, and that is not a clean result');
  process.exit(2);
}

const movable = [];
const skipped = [];
for (const item of all) {
  const opts = item.q?.opts;
  if (!Array.isArray(opts) || opts.length < 2) {
    skipped.push({ ...item, why: 'fewer than two options' });
    continue;
  }
  if (typeof item.q.correct !== 'number' || !(item.q.correct in opts)) {
    skipped.push({ ...item, why: 'correct does not point at an option' });
    continue;
  }
  const hit = opts.find((o) => ORDER_DEPENDENT.some((p) => p.test(String(o))));
  if (hit) {
    skipped.push({ ...item, why: `order-dependent option ("${String(hit).slice(0, 40)}")` });
    continue;
  }
  movable.push(item);
}

console.log(`movable: ${movable.length}   left alone: ${skipped.length}`);
for (const s of skipped) console.log(`  skip  ${s.where}: ${s.why}`);
console.log();

/* Build a balanced multiset of target slots, sized to each question's own
   option count, then shuffle it. Questions with three options must not be
   handed slot 3. So: group by width, balance within each group. */
const byWidth = new Map();
for (const m of movable) {
  const w = m.q.opts.length;
  if (!byWidth.has(w)) byWidth.set(w, []);
  byWidth.get(w).push(m);
}

const rand = mulberry32(seedFrom(book.id || book.title || file));
let moved = 0;

for (const [width, group] of [...byWidth].sort((a, b) => a[0] - b[0])) {
  const targets = [];
  for (let i = 0; i < group.length; i++) targets.push(i % width);
  const assigned = shuffled(targets, rand);

  group.forEach((item, i) => {
    const want = assigned[i];
    const have = item.q.correct;
    if (want === have) return;
    const opts = item.q.opts;
    [opts[have], opts[want]] = [opts[want], opts[have]];
    item.q.correct = want;
    moved++;
  });

  console.log(`width ${width}: ${group.length} question(s) balanced across ${width} slot(s)`);
}

console.log(`\nmoved ${moved} answer(s).`);

const after = new Map();
for (const m of movable) after.set(m.q.correct, (after.get(m.q.correct) || 0) + 1);
console.log('resulting spread over the movable questions:');
for (const [slot, n] of [...after].sort((a, b) => a[0] - b[0])) {
  console.log(`  option ${slot}: ${n} (${Math.round((n / movable.length) * 100)}%)`);
}

if (!write) {
  console.log('\ndry run. pass --write to apply.');
  process.exit(0);
}

const out = JSON.stringify(book, null, INDENT) + TRAILING_NEWLINE;

/* A permutation changes no text, so the file's length should move only by
 * whatever the reordering does to line lengths. A large swing means this
 * file does not round-trip through JSON.stringify — usually because it
 * was written with short arrays kept inline, which the serializer always
 * expands — and the diff is about to be reformatting with the real edit
 * buried in it.
 *
 * Refuse by default rather than warn, because a warning printed above a
 * successful write is a warning nobody reads. `--reformat` makes it the
 * caller's explicit decision. */
const drift = Math.abs(out.length - raw.length) / raw.length;
if (drift > 0.05 && !process.argv.includes('--reformat')) {
  console.error(
    `\nREFUSING TO WRITE: output differs from input by ${Math.round(drift * 100)}% ` +
      `(${raw.length} -> ${out.length} chars).`
  );
  console.error('This edit only permutes options, so the size should barely move.');
  console.error('This file does not round-trip through JSON.stringify, so writing it');
  console.error('would reformat the whole thing and hide the real change.');
  console.error('\nEither leave it alone, or pass --reformat to accept the rewrite.');
  console.error('Then check the result with tools/verify-debias.mjs, which compares');
  console.error('meaning rather than bytes and does not care about formatting.');
  process.exit(1);
}
if (drift > 0.05) {
  console.log(
    `\nreformatting (${raw.length} -> ${out.length} chars), because --reformat was given.`
  );
}

writeFileSync(file, out, 'utf8');
console.log(`\nwritten: ${file}  (${raw.length} -> ${out.length} bytes)`);
