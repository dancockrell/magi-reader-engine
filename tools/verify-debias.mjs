/**
 * Did debias change any book's meaning?
 *
 * The permutation is only safe if, for every question, the option text
 * that `correct` points at is the SAME STRING before and after, and the
 * set of options is unchanged. Everything else about the file may move.
 *
 * This compares a book against a reference copy (normally the git HEAD
 * version, piped to a file) rather than trusting that a permutation is
 * self-evidently harmless. A swap with an off-by-one would look exactly
 * like a successful run from the tool's own output.
 *
 *   git show HEAD:src/books/magi/book.json > /tmp/before.json
 *   node tools/verify-debias.mjs /tmp/before.json src/books/magi/book.json
 */
import { readFileSync } from 'node:fs';

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error('usage: node tools/verify-debias.mjs <before.json> <after.json>');
  process.exit(2);
}

const load = (p) => JSON.parse(readFileSync(p, 'utf8'));

function questions(book) {
  const out = new Map();
  for (const [id, t] of Object.entries(book?.teaching || {})) {
    (t?.mc || []).forEach((q, i) => out.set(`${id}#${i}`, q));
    if (t?.recap) out.set(`${id}#recap`, t.recap);
  }
  return out;
}

const before = questions(load(beforePath));
const after = questions(load(afterPath));

console.log(`questions before: ${before.size}`);
console.log(`questions after : ${after.size}`);
if (!before.size || !after.size) {
  console.error('NO QUESTIONS ON ONE SIDE — this comparison means nothing');
  process.exit(2);
}

const problems = [];
let moved = 0;
let checked = 0;

for (const [key, b] of before) {
  const a = after.get(key);
  if (!a) {
    problems.push(`${key}: disappeared`);
    continue;
  }
  checked++;

  if (String(b.q) !== String(a.q)) problems.push(`${key}: question text changed`);

  const bOpts = [...(b.opts || [])].map(String).sort();
  const aOpts = [...(a.opts || [])].map(String).sort();
  if (JSON.stringify(bOpts) !== JSON.stringify(aOpts)) {
    problems.push(`${key}: the SET of options changed`);
    continue;
  }

  const bAnswer = String((b.opts || [])[b.correct]);
  const aAnswer = String((a.opts || [])[a.correct]);
  if (bAnswer !== aAnswer) {
    problems.push(`${key}: THE ANSWER CHANGED\n      was: ${bAnswer}\n      now: ${aAnswer}`);
  } else if (b.correct !== a.correct) {
    moved++;
  }
}

for (const [key] of after) if (!before.has(key)) problems.push(`${key}: appeared from nowhere`);

console.log(`compared: ${checked}   answers relocated: ${moved}`);

/* Report what is WRONG before reporting that nothing happened.
 *
 * The first version had these the other way round, and an injected
 * off-by-one exited 1 with the message "NO ANSWER MOVED" while never
 * printing the corruption it had just found. Right exit code, wrong
 * reason, and the actual finding discarded by a guard standing in front
 * of it — which is the rule about not letting a guard throw away good
 * work, in the tool written to enforce that rule. Caught only by
 * injecting the fault and reading the output rather than the exit code. */
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

/* The relocation count is the fragile number here. With no problems AND
   nothing moved, the run is vacuous: every assertion above passed by
   comparing a file with itself. */
if (moved === 0) {
  console.error('\nNO ANSWER MOVED — debias did nothing, so this proves nothing.');
  process.exit(1);
}

console.log(`\nevery one of ${checked} questions keeps its exact answer text.`);
console.log(`${moved} of them now sit in a different slot.`);
