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

  it('never names a book', () => {
    /* `src/books/index.js` is the one place a title is named, and it is
       a pack directory, not the engine. Everything else asks it. */
    const guilty = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      const lines = text.split('\n');
      for (const id of BOOK_NAMES) {
        const re = new RegExp(`\\b${id}\\b`, 'i');
        lines.forEach((line, i) => {
          /* a comment may quote the reading it is describing */
          const code = line.replace(/\/\*.*?\*\/|\/\/.*$|^\s*\*.*$/g, '');
          if (re.test(code)) guilty.push(`${file}:${i + 1}: ${line.trim()}`);
        });
      }
    }
    expect(guilty).toEqual([]);
  });

  it('never hard-codes where a book keeps its media', () => {
    const guilty = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      text.split('\n').forEach((line, i) => {
        const code = line.replace(/\/\*.*?\*\/|\/\/.*$|^\s*\*.*$/g, '');
        if (/['"][\w-]*(audio|cues)\/[\w-]*\.?\w*['"]/.test(code)) {
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
