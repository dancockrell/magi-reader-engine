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

/* TEXT_UNITS is the data. UNITS is a derived view of it
   (BOOK.order.map(...)), so extracting UNITS gets a function body. */
const unitsLiteral = literalAfter(src, 'var TEXT_UNITS', '[', ']');
const swapsLiteral = literalAfter(src, 'var SWAPS', '{', '}');
/* The art is content-addressed: files are named by hash, not by scene,
   so the scene-to-file map has to travel with the book or the pictures
   simply do not resolve. */
const platesLiteral = literalAfter(src, 'var PLATES', '{', '}');

/* Plain data literals, evaluated with nothing in scope. */
const units = Function(`"use strict"; return (${unitsLiteral});`)();
const swaps = Function(`"use strict"; return (${swapsLiteral});`)();
const plates = Function(`"use strict"; return (${platesLiteral});`)();

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
/* Folded, not dropped — and said so below, because a key that vanishes
   between the extract and the summary reads as an extraction failure. */
const folded = 'castArt' in content ? ['castArt'] : [];
delete content.castArt;

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
  const how = folded.includes(key)
    ? 'folded into cast'
    : key in content
      ? size(content[key])
      : 'NOT A LITERAL';
  console.log(`${(key + ':').padEnd(9)}${how}`);
}
if (notLiteral.length) {
  console.log('\ncould not lift (computed, not declared):');
  for (const n of notLiteral) console.log(`  ${n}`);
}
console.log(`\nwritten: ${outPath}`);
