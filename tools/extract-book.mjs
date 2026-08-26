/**
 * Pull the book data out of the single-file reader.
 *
 * The old app is the specification, so the first thing the new one has
 * to do is read it. This lifts `var UNITS = [...]` and `var SWAPS = {...}`
 * out of index.html by balancing brackets (a regex cannot, the stanzas
 * are full of braces) and evaluating the literal in isolation.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

function literalAfter(src, declaration, open, close) {
  /* Match the whole name, not a prefix of it.
   *
   * indexOf('var CAST') finds `var CAST_ART` — which is declared first —
   * and silently returns the wrong object. Nothing errors; the package
   * just quietly contains art paths where the cast should be. The name
   * has to be followed by whitespace or '=' to count. */
  const name = declaration.replace(/^var\s+/, '');
  const re = new RegExp(`\\bvar\\s+${name}\\s*=`, 'g');
  const m = re.exec(src);
  if (!m) throw new Error(`could not find ${declaration}`);
  const start = m.index;
  let i = src.indexOf(open, start + m[0].length - 1);
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

/* legacy/index.html is the copy in this repository, and it is the one
   that ships. Reading from wherever the reader happened to live on one
   machine made this unrunnable the moment that folder moved — which it
   did. */
const htmlPath = process.argv[2] || 'legacy/index.html';
const outPath = process.argv[3] || resolve(process.cwd(), 'src/books/magi/book.json');

const src = readFileSync(htmlPath, 'utf8');

/**
 * A literal that a book may legitimately not have.
 *
 * Found by pointing this at a second book. The Raven has no `SWAPS` —
 * it was built before the vocabulary trainer existed — and the
 * extractor stopped dead rather than saying so. A book without
 * vocabulary swaps is a book; a book without text is not. So the text
 * stays required and everything else reports what is missing and
 * carries on.
 */
function optionalLiteral(source, declaration, open, close, fallback) {
  try {
    const text = literalAfter(source, declaration, open, close);
    return { value: Function(`"use strict"; return (${text});`)(), found: true };
  } catch {
    return { value: fallback, found: false };
  }
}

/**
 * Everything later pushed onto an array that was already declared.
 *
 * Found by pointing this at a second book. The Raven declares four
 * units in its literal, closes the array, and then adds the other eight
 * with `TEXT_UNITS.push(...)` further down the file. Reading only the
 * literal got a third of the poem and reported nothing wrong — the
 * worst kind of extraction failure, because the result looks like a
 * book.
 *
 * So: gather the pushes too, in the order they appear.
 */
function pushedOnto(source, name) {
  const re = new RegExp(`\\b${name}\\s*\\.\\s*push\\s*\\(`, 'g');
  const out = [];
  let m;

  while ((m = re.exec(source))) {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let i = open;
    let inStr = null;
    let escaped = false;

    for (; i < source.length; i++) {
      const ch = source[i];
      if (inStr) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') inStr = ch;
      else if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
    /* the arguments, as an array literal */
    const args = source.slice(open + 1, i);
    out.push(...Function(`"use strict"; return ([${args}]);`)());
  }
  return out;
}

/* TEXT_UNITS is the data. UNITS is a derived view of it
   (BOOK.order.map(...)), so extracting UNITS gets a function body.
   Required: this is the story. */
const unitsLiteral = literalAfter(src, 'var TEXT_UNITS', '[', ']');
const declaredUnits = Function(`"use strict"; return (${unitsLiteral});`)();
const pushedUnits = pushedOnto(src, 'TEXT_UNITS');
const units = [...declaredUnits, ...pushedUnits];

const swapsPart = optionalLiteral(src, 'var SWAPS', '{', '}', {});
/* The art is content-addressed: files are named by hash, not by scene,
   so the scene-to-file map has to travel with the book or the pictures
   simply do not resolve. */
const platesPart = optionalLiteral(src, 'var PLATES', '{', '}', {});

const swaps = swapsPart.value;
const plates = platesPart.value;
const missingParts = [
  ...(swapsPart.found ? [] : ['swaps']),
  ...(platesPart.found ? [] : ['plates']),
];

/**
 * Everything else the book is made of, still welded into the HTML.
 *
 * A book cannot travel while its questions, its characters' lines and its
 * translations live inside a 14,000-line script. Each of these is a plain
 * literal; any that turns out to be computed rather than declared is
 * reported rather than silently skipped, because a missing question is
 * invisible until a class reaches it.
 */
const CONTENT = {
  teaching: ['var TEACHING', '{'],
  info: ['var TEXT_INFO', '{'],
  guideVoice: ['var GUIDE_VOICE', '{'],
  wrenLines: ['var WREN_LINES', '{'],
  wrenReactions: ['var WREN_REACTIONS', '{'],
  preshow: ['var GUIDE_PRESHOW', '['],
  recaps: ['var RECAPS', '{'],
  dialogue: ['var DIALOGUE', '{'],
  cast: ['var CAST', '{'],
  castArt: ['var CAST_ART', '{'],
  languages: ['var TR_LANGS', '['],
  lineTranslations: ['var TR_LINES', '{'],
  wordTranslations: ['var TR_WORDS', '{'],
  uiTranslations: ['var UI_TR', '{'],
  /* What Wren and the Professor say, translated. Keyed by the English
     sentence rather than by a clip id, because a line composed of two
     recorded parts translates as its parts. */
  speechTranslations: ['var SP_TR', '{'],
};

const content = {};
const notLiteral = [];
for (const [key, [decl, open]] of Object.entries(CONTENT)) {
  const close = open === '[' ? ']' : '}';
  try {
    const text = literalAfter(src, decl, open, close);
    content[key] = Function(`"use strict"; return (${text});`)();
  } catch (err) {
    notLiteral.push(`${key} (${decl}): ${err.message}`);
  }
}

/* Wren's portrait is a bare string rather than an entry in CAST_ART,
   because she is drawn by her own rig in the shipping reader and never
   went through the cast map. She is still a member of the cast, so her
   picture belongs with the others rather than in whichever component
   happens to draw her. */
const wrenArt = /var\s+WREN_ART\s*=\s*"([^"]+)"/.exec(src);
if (wrenArt && content.castArt) content.castArt.wren = wrenArt[1];
if (content.cast && content.castArt) {
  for (const [id, member] of Object.entries(content.cast.members || {})) {
    if (content.castArt[id]) member.art = content.castArt[id];
  }
}
/**
 * The act reviews, folded in where the engine actually looks for them.
 *
 * The prototype keeps them in `var RECAPS`, keyed by the unit that ends
 * each act, and this tool used to hand them over as `book.recaps`. The
 * engine reads a recap from `teaching[id].recap` and nothing anywhere
 * reads `book.recaps`, so four authored act reviews travelled all the
 * way into the shipping pack and were never once put to a student.
 *
 * Nothing failed. The pack validated, the reading ran, and the only
 * evidence was four questions that existed and were never asked. That is
 * the worst kind of defect this tool can produce, and it is the third of
 * its kind: `SWAPS` stopped the run, `TEXT_UNITS.push` lost two thirds
 * of a poem, and this lost a whole layer of teaching in silence.
 *
 * One place for a recap, and it is the place the engine reads.
 */
const foldedRecaps = [];
if (content.recaps && content.teaching) {
  for (const [unitId, recap] of Object.entries(content.recaps)) {
    if (!recap) continue;
    if (!content.teaching[unitId]) content.teaching[unitId] = {};
    content.teaching[unitId].recap = recap;
    foldedRecaps.push(unitId);
  }
}

/* Folded, not dropped — and said WHERE below, because a key that
   vanishes between the extract and the summary reads as an extraction
   failure, and one that says it went somewhere it did not is worse. */
/** @type {Record<string,string>} */
const folded = {};
if ('castArt' in content) folded.castArt = 'folded into cast';
delete content.castArt;
if (foldedRecaps.length) {
  folded.recaps = `folded into teaching (${foldedRecaps.join(', ')})`;
  delete content.recaps;
}

const titleMatch = /title\s*:\s*"([^"]+)"/.exec(src.slice(src.indexOf('var BOOK')));
if (!titleMatch)
  throw new Error(`no title in ${htmlPath} — a book without one fails the contract`);

/**
 * Which book this is.
 *
 * It used to be the literal `'magi'`, because the extractor was written
 * for one book and nobody changed it when it was pointed at a second.
 * The Raven came out as `{ id: 'magi', title: 'The Raven' }` — two packs
 * claiming one id. Nothing errors: `bookById('magi')` quietly returns
 * whichever was registered first, and every per-book storage key
 * (`reader.where.v1.magi`, `reader.attempt.v2.magi.2`,
 * `reader.outbox.v1.magi`) is shared between two different books, so a
 * class reading The Raven would overwrite its own progress in Magi.
 *
 * The id now comes from where the pack is being written, or from an
 * explicit fourth argument, and a value that is plainly not a book id is
 * refused rather than shipped.
 */
const GENERIC = new Set(['book', 'books', 'src', 'dist', 'out', 'tmp', 'data', 'public']);
const bookId = process.argv[4] || basename(dirname(outPath));
if (!/^[a-z][a-z0-9-]*$/.test(bookId) || GENERIC.has(bookId)) {
  throw new Error(
    `"${bookId}" is not a book id — it came from the output folder name. ` +
      `Pass one explicitly:\n` +
      `  node tools/extract-book.mjs <reader.html> <out.json> <id>`
  );
}

const book = {
  meta: {
    id: bookId,
    title: titleMatch[1],
    source: 'extracted from index.html',
  },
  units,
  swaps,
  plates,
  ...content,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(book, null, 1), 'utf8');

const size = (v) =>
  Array.isArray(v)
    ? `${v.length} items`
    : v && typeof v === 'object'
      ? `${Object.keys(v).length} keys`
      : String(v);

console.log(`units:   ${units.length}`);
console.log(`swaps:   ${Object.keys(swaps).length}`);
console.log(`plates:  ${Object.keys(plates).length}`);
for (const key of Object.keys(CONTENT)) {
  const how = folded[key] || (key in content ? size(content[key]) : 'NOT A LITERAL');
  console.log(`${(key + ':').padEnd(9)}${how}`);
}
/* Said out loud rather than left as an empty object in the output. A
   book without swaps is fine; a book without swaps *because the
   extractor could not find them* is not, and the two look identical in
   the JSON. */
if (missingParts.length) {
  console.log(`\nthis book has no: ${missingParts.join(', ')}`);
}

if (notLiteral.length) {
  console.log('\ncould not lift (computed, not declared):');
  for (const n of notLiteral) console.log(`  ${n}`);
}
console.log(`\nwritten: ${outPath}`);
