/**
 * Prove the sweep is not vacuous.
 *
 * A test that loops over an empty list passes. Twice in this project a
 * "verified" result turned out to be an assertion over nothing, so the
 * coverage is printed rather than assumed.
 */
import { readFileSync } from 'node:fs';
import { inlineGlosses } from '../src/lib/book/validate.js';
import { lineFor } from '../src/lib/vocab/text.js';
import { kindsFor, buildQuestion, swapFor, oddSet } from '../src/lib/vocab/kinds.js';

const book = JSON.parse(readFileSync('src/books/magi/book.json', 'utf8'));
const seen = new Map();
for (const u of book.units) {
  const entries = (u.gloss || []).map((e) => ({ w: e[0], d: e[1] }));
  for (const sz of u.stanzas || []) entries.push(...inlineGlosses(sz));
  for (const e of entries) {
    const k = e.w.toLowerCase();
    if (!seen.has(k)) seen.set(k, { w: e.w, d: e.d, unit: u.id, hits: 0, asked: 1 });
  }
}
const items = [...seen.values()];
const ctx = { book, swaps: book.swaps, all: items };
const seeded = (s) => () => ((s = (s * 1664525 + 1013904223) % 4294967296), s / 4294967296);

const byKind = new Map();
let built = 0;
for (const item of items) {
  for (const kind of kindsFor(ctx, item, items)) {
    for (let s = 1; s < 6; s++) {
      buildQuestion(ctx, kind, item, items, seeded(s));
      built++;
      byKind.set(kind, (byKind.get(kind) || 0) + 1);
    }
  }
}

console.log(`words in the book:      ${items.length}`);
console.log(`with a line in the text:${items.filter((i) => lineFor(book, i)).length}`);
console.log(`with a substitution:    ${items.filter((i) => swapFor(ctx, i)).length}`);
console.log(`odd-one-out available:  ${items.filter((i) => oddSet(ctx, i, items)).length}`);
console.log(`\nquestions actually built: ${built}`);
for (const [k, n] of [...byKind].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(11)} ${n}`);
}
if (built < 500) {
  console.error('\nSWEEP IS TOO SMALL — it is not exercising the book');
  process.exit(1);
}
