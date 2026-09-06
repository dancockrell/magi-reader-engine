import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG, catalogBook } from './lib/library/catalog.js';

/**
 * One focused reader with a clean book boundary.
 *
 * The redesign has one deliberate content boundary: `library/catalog.js`.
 * That file is allowed to know which titles are on the shelf and where a
 * remote pack lives. The reader, vocabulary trainer, media code and UI
 * below the bookshelf are not. Keeping the exception explicit is stronger
 * than the old rule that pretended the application could have a bookshelf
 * without any code ever naming a book.
 */

const ROOT = 'src';
const CATALOG_FILE = join(ROOT, 'lib', 'library', 'catalog.js');
const PRODUCT = /\bmagi[ -]reader\b/gi;
const BOOK_NAMES = CATALOG.flatMap((entry) => [
  ...(entry.id.length >= 4 ? [entry.id] : []),
  ...(entry.title.length >= 4 ? [entry.title] : []),
  entry.author,
]).filter(Boolean);
const SHORT_BOOK_TITLES = CATALOG.map((entry) => entry.title).filter(
  (title) => title && title.length < 4
);

const escape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function codeOf(line) {
  return String(line)
    .replace(/\/\*.*?\*\/|\/\/.*$|^\s*\*.*$/g, '')
    .replace(PRODUCT, '');
}

function codeLinesOf(text) {
  return String(text)
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, '')
    .split('\n');
}

function namesABook(line) {
  const code = codeOf(line);
  return (
    BOOK_NAMES.some((name) => new RegExp(`(?<!\\w)${escape(name)}(?!\\w)`, 'i').test(code)) ||
    SHORT_BOOK_TITLES.some((title) => new RegExp(`(['"])${escape(title)}\\1`, 'i').test(code))
  );
}

/** Every shipped source file that should remain title-agnostic. */
function engineFiles(dir = ROOT, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (path === join(ROOT, 'books')) continue;
      engineFiles(path, out);
      continue;
    }
    if (!/\.(js|jsx|css)$/.test(name)) continue;
    if (/\.test\.jsx?$/.test(name)) continue;
    if (name === 'engine.test.js') continue;
    if (path === CATALOG_FILE) continue;
    out.push(path);
  }
  return out;
}

describe('the catalog is the content boundary', () => {
  const files = engineFiles();

  it('checks a real body of runtime code', () => {
    expect(files.length).toBeGreaterThan(15);
  });

  it('recognises the flagship book but not unrelated titles or the product name', () => {
    expect(namesABook("const APP_NAME = 'Magi Reader';")).toBe(false);
    expect(namesABook("const id = 'magi';")).toBe(true);
    expect(namesABook("const title = 'The Gift of the Magi';")).toBe(true);
    expect(namesABook('O. Henry wrote it')).toBe(true);
    expect(namesABook("const title = 'If';")).toBe(false);
    expect(namesABook('if (ready) return book;')).toBe(false);
  });

  it('does not mistake prose in block comments for title-specific code', () => {
    const text = [
      '/**',
      ' * O. Henry is a useful example here.',
      ' */',
      "const value = 'generic';",
    ].join('\n');
    expect(codeLinesOf(text).filter(namesABook)).toEqual([]);
  });

  it('keeps book names out of the generic runtime', () => {
    const guilty = [];
    for (const file of files) {
      codeLinesOf(readFileSync(file, 'utf8')).forEach((line, i) => {
        if (namesABook(line)) guilty.push(`${file}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(guilty).toEqual([]);
  });

  it('keeps title-specific media paths out of the generic runtime', () => {
    const guilty = [];
    for (const file of files) {
      codeLinesOf(readFileSync(file, 'utf8')).forEach((line, i) => {
        if (/['"][\w-]*(audio|cues)\/[\w-]*\.?\w*['"]/.test(codeOf(line))) {
          guilty.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }
    expect(guilty).toEqual([]);
  });
});

describe('the bookshelf catalog', () => {
  it('contains only the flagship title with a unique id', () => {
    expect(CATALOG).toHaveLength(1);
    expect(CATALOG[0].id).toBe('magi');
    expect(new Set(CATALOG.map((entry) => entry.id)).size).toBe(CATALOG.length);
  });

  it('gives every entry enough identity to render a useful shelf card', () => {
    for (const entry of CATALOG) {
      expect(entry.id).toBeTruthy();
      expect(entry.title).toBeTruthy();
      expect(entry.author).toBeTruthy();
      expect(entry.kind).toBeTruthy();
      expect(entry.note).toBeTruthy();
    }
  });

  it('has exactly one loading source for every ready title', () => {
    for (const entry of CATALOG.filter((item) => !item.comingSoon)) {
      expect(Boolean(entry.local) !== Boolean(entry.remote), entry.id).toBe(true);
    }
  });

  it('lazy-loads bundled books instead of placing their packs in the shelf bundle', () => {
    for (const entry of CATALOG.filter((item) => item.local)) {
      expect(entry.local, entry.id).toBeTypeOf('function');
    }
  });

  it('keeps deployment-relative media paths relative', () => {
    for (const entry of CATALOG.filter((item) => item.remote)) {
      const spec = entry.remote;
      const relative = [
        spec.plate,
        spec.beatPlate,
        spec.audio,
        spec.cues,
        ...Object.values(spec.cast || {}),
      ].filter(Boolean);
      for (const path of relative) {
        expect(path.startsWith('/'), `${entry.id}: ${path}`).toBe(false);
        expect(path.startsWith('http'), `${entry.id}: ${path}`).toBe(false);
      }
      expect(spec.book.startsWith('https://')).toBe(true);
      expect(spec.base.startsWith('https://')).toBe(true);
    }
  });

  it('finds a known book and refuses an unknown one', () => {
    expect(catalogBook(CATALOG[0].id)).toBe(CATALOG[0]);
    expect(catalogBook('not-on-this-shelf')).toBeNull();
  });

  it('does not expose removed sample titles', () => {
    expect(catalogBook('raven')).toBeNull();
    expect(catalogBook('if')).toBeNull();
    expect(catalogBook('three-little-pigs')).toBeNull();
    expect(catalogBook('tortoise-and-hare')).toBeNull();
    expect(catalogBook('lion-and-mouse')).toBeNull();
    expect(catalogBook('rikki-tikki-tavi')).toBeNull();
  });
});
