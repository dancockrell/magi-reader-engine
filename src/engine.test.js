import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BOOKS, defaultBook, bookById, mediaOf } from './books/index.js';

/**
 * One engine, many books.
 *
 * This is a goal, not a description: a second title should be a new
 * folder under `src/books/` and no change anywhere else — new content,
 * no new code. That only stays true if something checks, because the
 * cheapest way to write any feature is to reach for the book you have in
 * front of you, and it is invisible until the day somebody tries to ship
 * a second one.
 *
 * So: the engine may not know the name of a book. Not its id, not its
 * folder, not its audio directory, not its cue file. It asks the pack.
 */

const ROOT = 'src';
const BOOK_NAMES = BOOKS.map((b) => b.meta.id);

/**
 * The engine is named after one of its own books, and this test cannot
 * see the difference.
 *
 * `magi` is a book id. "Magi Reader" is the product. A plain search for
 * the id matches both, so `const APP = 'Magi Reader'` would be reported
 * as the engine naming a book — which is the opposite of true, and the
 * failure message would send whoever hit it looking for a layering bug
 * that is not there.
 *
 * It has already happened once: the backend file was briefly
 * `magi-backend.gs`, named after the product, and this test failed. The
 * file was renamed to `backend.gs`, which was the right move for its own
 * reasons, but it left the collision unfixed and waiting for the first
 * page title or about box.
 *
 * So the product's own name is removed before the search, and only that.
 * A bare `magi` anywhere still fails, which the test below proves.
 */
const PRODUCT = /\bmagi[ -]reader\b/gi;

/** One line with its comments and the product's name taken out. */
function codeOf(line) {
  return line.replace(/\/\*.*?\*\/|\/\/.*$|^\s*\*.*$/g, '').replace(PRODUCT, '');
}

function namesABook(line) {
  const code = codeOf(line);
  return BOOK_NAMES.some((id) => new RegExp(`\\b${id}\\b`, 'i').test(code));
}

/** Every source file in the engine — everything except the packs. */
function engineFiles(dir = ROOT, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      /* the packs are allowed to know what they are called */
      if (path === join(ROOT, 'books')) continue;
      engineFiles(path, out);
      continue;
    }
    if (!/\.(js|jsx|css)$/.test(name)) continue;
    /* tests load a real book on purpose; they are not shipped */
    if (/\.test\.jsx?$/.test(name)) continue;
    if (name === 'engine.test.js') continue;
    out.push(path);
  }
  return out;
}

describe('the engine does not know which book it is reading', () => {
  const files = engineFiles();

  it('has source files to check, so this test cannot pass by finding none', () => {
    expect(files.length).toBeGreaterThan(15);
  });

  it('tells the product from the book it is named after', () => {
    /* The exception above, kept honest. If this test ever passes by
       matching nothing, the one above is worthless. */
    expect(namesABook("const APP_NAME = 'Magi Reader';")).toBe(false);
    expect(namesABook('const zip = `magi-reader-${version}.zip`;')).toBe(false);

    expect(namesABook("import book from './books/magi/book.json';")).toBe(true);
    expect(namesABook("if (id === 'magi') return DEFAULT;")).toBe(true);
    /* the exception removes the product's name, not the whole line */
    expect(namesABook("const t = 'Magi Reader'; const b = 'magi';")).toBe(true);
  });

  it('never names a book', () => {
    /* `src/books/index.js` is the one place a title is named, and it is
       a pack directory, not the engine. Everything else asks it. */
    const guilty = [];
    for (const file of files) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        /* a comment may quote the reading it is describing */
        if (namesABook(line)) guilty.push(`${file}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(guilty).toEqual([]);
  });

  it('never hard-codes where a book keeps its media', () => {
    const guilty = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      text.split('\n').forEach((line, i) => {
        if (/['"][\w-]*(audio|cues)\/[\w-]*\.?\w*['"]/.test(codeOf(line))) {
          guilty.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(guilty).toEqual([]);
  });
});

describe('a book pack says what it is and where its media lives', () => {
  it('names itself', () => {
    for (const b of BOOKS) {
      expect(b.meta.id, 'a pack with no id cannot be told from another').toBeTruthy();
      expect(b.meta.title).toBeTruthy();
    }
  });

  it('has a unique id, so two packs cannot share a gradebook', () => {
    expect(new Set(BOOK_NAMES).size).toBe(BOOKS.length);
  });

  it('says where its recordings and cues are, relatively', () => {
    for (const b of BOOKS) {
      const m = mediaOf(b);
      expect(m.audio, `${b.meta.id} has no audio path`).toBeTruthy();
      expect(m.cues, `${b.meta.id} has no cue file`).toBeTruthy();
      /* itch serves from a nested path: a leading slash 404s everything */
      for (const p of [m.audio, m.cues]) {
        expect(p.startsWith('/'), `"${p}" is absolute and would 404 on itch`).toBe(false);
        expect(p.startsWith('http')).toBe(false);
      }
    }
  });

  it('carries the whole book, not a stub', () => {
    for (const b of BOOKS) {
      expect(b.units.length).toBeGreaterThan(0);
      for (const part of ['teaching', 'plates', 'cast', 'dialogue']) {
        expect(
          Object.keys(b[part] || {}).length,
          `${b.meta.id} has no ${part}`
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe('choosing a book', () => {
  it('opens with the first one', () => {
    expect(defaultBook).toBe(BOOKS[0]);
  });

  it('finds one by name', () => {
    expect(bookById(BOOKS[0].meta.id)).toBe(BOOKS[0]);
  });

  it('falls back rather than handing back nothing', () => {
    /* a stale link to a book this build does not carry should open the
       reader, not a blank page */
    expect(bookById('a-book-that-is-not-here')).toBe(defaultBook);
    expect(bookById('')).toBe(defaultBook);
  });

  it('gives empty paths for a pack with no media, rather than throwing', () => {
    expect(mediaOf({})).toEqual({ audio: '', cues: '' });
    expect(mediaOf(null)).toEqual({ audio: '', cues: '' });
  });
});
