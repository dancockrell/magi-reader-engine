/**
 * Rewrite named option texts, refusing to touch anything that has moved.
 *
 * The Raven's answers were the longest option in 82% of its questions,
 * because whoever wrote them elaborated the true one and left the wrong
 * ones terse. That is a real exploit: pick the longest, score 82%.
 *
 * The fix is writing, not permutation, so it cannot be automated — but
 * APPLYING it can be, and applying 60-odd string replacements by hand to
 * a JSON file is how you quietly corrupt a book. Every edit here names
 * the text it expects to find. If the file has changed underneath, the
 * edit is refused rather than applied to whatever now sits at that index.
 *
 * Edits are given as: unit, question tag, option index, expected, replacement.
 *
 *   node tools/patch-options.mjs <book.json> <edits.json> [--write]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [file, editsFile] = process.argv.slice(2);
const write = process.argv.includes('--write');
if (!file || !editsFile) {
  console.error('usage: node tools/patch-options.mjs <book.json> <edits.json> [--write]');
  process.exit(2);
}

const raw = readFileSync(file, 'utf8');
const book = JSON.parse(raw);
const edits = JSON.parse(readFileSync(editsFile, 'utf8'));

console.log(`edits to apply: ${edits.length}`);
if (!edits.length) {
  console.error('NO EDITS — nothing to do, and that is not a clean result');
  process.exit(2);
}

const pick = (unit, tag) => {
  const t = book?.teaching?.[unit];
  if (!t) return null;
  if (tag === 'recap') return t.recap || null;
  const i = Number(String(tag).replace(/^q/, '')) - 1;
  return (t.mc || [])[i] || null;
};

const refused = [];
let applied = 0;

for (const e of edits) {
  const q = pick(e.unit, e.tag);
  const at = `${e.unit} ${e.tag} [${e.i}]`;
  if (!q) {
    refused.push(`${at}: no such question`);
    continue;
  }
  const current = String((q.opts || [])[e.i]);
  if (current !== e.expected) {
    refused.push(`${at}: expected "${e.expected}"\n      found    "${current}"`);
    continue;
  }
  q.opts[e.i] = e.to;
  applied++;
}

console.log(`applied: ${applied}   refused: ${refused.length}`);
for (const r of refused) console.log(`  REFUSED ${r}`);

if (refused.length) {
  console.error('\nSome edits did not match. Nothing written.');
  process.exit(1);
}
if (!applied) {
  console.error('\nNOTHING APPLIED — this run did nothing.');
  process.exit(1);
}

/* Indentation, matched to the file the way debias.mjs does it. */
const m = raw.match(/^\{\r?\n([ \t]+)"/);
const out = JSON.stringify(book, null, m ? m[1] : 2) + (/\n$/.test(raw) ? '\n' : '');

if (!write) {
  console.log('\ndry run. pass --write to apply.');
  process.exit(0);
}
writeFileSync(file, out, 'utf8');
console.log(`\nwritten: ${file}`);
