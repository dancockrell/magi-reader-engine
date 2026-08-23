import { readFileSync } from 'node:fs';
import { validateBook } from '../src/lib/book/validate.js';

const path = process.argv[2] || 'src/books/magi/book.json';
const book = JSON.parse(readFileSync(path, 'utf8'));
const { ok, errors, wordCount } = validateBook(book);

console.log(`book:   ${book.meta.title}`);
console.log(`units:  ${book.units.length}`);
console.log(`words:  ${wordCount}`);
console.log(`swaps:  ${Object.keys(book.swaps || {}).length}`);
console.log(ok ? '\nPASSES the contract' : `\n${errors.length} PROBLEM(S):\n`);

const byKind = new Map();
for (const e of errors) {
  const kind = e.message.replace(/"[^"]*"/g, '"…"').replace(/\(\d+[^)]*\)/, '(…)');
  if (!byKind.has(kind)) byKind.set(kind, []);
  byKind.get(kind).push(e);
}
for (const [kind, list] of byKind) {
  console.log(`  ${list.length} × ${kind}`);
  for (const e of list.slice(0, 6)) console.log(`      ${e.path}  ${e.message}`);
  if (list.length > 6) console.log(`      … and ${list.length - 6} more`);
}
process.exit(ok ? 0 : 1);
