/**
 * Pull the book data out of the single-file reader.
 *
 * The old app is the specification, so the first thing the new one has
 * to do is read it. This lifts `var UNITS = [...]` and `var SWAPS = {...}`
 * out of index.html by balancing brackets (a regex cannot, the stanzas
 * are full of braces) and evaluating the literal in isolation.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function literalAfter(src, declaration, open, close) {
  const start = src.indexOf(declaration);
  if (start < 0) throw new Error(`could not find ${declaration}`);
  let i = src.indexOf(open, start);
  if (i < 0) throw new Error(`no ${open} after ${declaration}`);

  let depth = 0;
  let inStr = null;
  let escaped = false;
  const from = i;

  for (; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      i = src.indexOf('*/', i) + 1;
      continue;
    }
    if (ch === '/' && src[i + 1] === '/') {
      i = src.indexOf('\n', i);
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return src.slice(from, i + 1);
    }
  }
  throw new Error(`unbalanced ${open} for ${declaration}`);
}

const htmlPath =
  process.argv[2] || 'C:/Users/Admin/Downloads/magi-itch-improved (20)/index.html';
const outPath = process.argv[3] || resolve(process.cwd(), 'src/books/magi/book.json');

const src = readFileSync(htmlPath, 'utf8');

/* TEXT_UNITS is the data. UNITS is a derived view of it
   (BOOK.order.map(...)), so extracting UNITS gets a function body. */
const unitsLiteral = literalAfter(src, 'var TEXT_UNITS', '[', ']');
const swapsLiteral = literalAfter(src, 'var SWAPS', '{', '}');
/* The art is content-addressed: files are named by hash, not by scene,
   so the scene-to-file map has to travel with the book or the pictures
   simply do not resolve. */
const platesLiteral = literalAfter(src, 'var PLATES', '{', '}');

/* Plain data literals â€” evaluated with nothing in scope. */
const units = Function(`"use strict"; return (${unitsLiteral});`)();
const swaps = Function(`"use strict"; return (${swapsLiteral});`)();
const plates = Function(`"use strict"; return (${platesLiteral});`)();

const titleMatch = /title\s*:\s*"([^"]+)"/.exec(src.slice(src.indexOf('var BOOK')));

const book = {
  meta: {
    id: 'magi',
    title: titleMatch ? titleMatch[1] : 'The Gift of the Magi',
    source: 'extracted from index.html',
  },
  units,
  swaps,
  plates,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(book, null, 1), 'utf8');

console.log(`units:  ${units.length}`);
console.log(`swaps:  ${Object.keys(swaps).length}`);
console.log(`plates: ${Object.keys(plates).length}`);
console.log(`written: ${outPath}`);
