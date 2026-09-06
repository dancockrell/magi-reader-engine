import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateBook } from './validate.js';
import { glossOf, linesOf } from '../reader/beats.js';
import { lineTranslation, wordTranslation } from './translate.js';

/**
 * Pack-level checks for the extracted Gift of the Magi data.
 *
 * The extractor still carries some historical fields while the book pack
 * is migrated, but this suite protects only data the solo reader uses:
 * literary units, glosses, translations, scene references, cast and
 * optional contextual material. Quiz/writing parity with the classroom
 * prototype is deliberately no longer a requirement.
 */

let book;
let legacy;

beforeAll(() => {
  book = JSON.parse(readFileSync('src/books/magi/book.json', 'utf8'));
  legacy = readFileSync('legacy/index.html', 'utf8');
});

const occurrences = (needle) => legacy.split(needle).length - 1;

describe('the package carries the literary work', () => {
  it('has all twelve story units in reading order', () => {
    expect(book.units).toHaveLength(12);
    expect(book.units.map((unit) => unit.id)).toEqual(
      Array.from({ length: 12 }, (_, index) => `s${index + 1}`)
    );
    expect(book.units.every((unit) => linesOf(unit).length > 0)).toBe(true);
  });

  it('keeps the story substantial rather than extracting a stub', () => {
    const lines = book.units.reduce((count, unit) => count + linesOf(unit).length, 0);
    expect(lines).toBeGreaterThan(100);
  });

  it('keeps scene identity, captions and plate references for visual reading', () => {
    const missing = [];
    for (const unit of book.units) {
      const scene = unit.scene || unit.id;
      if (!unit.title) missing.push(`${unit.id}:title`);
      if (!unit.caption) missing.push(`${unit.id}:caption`);
      if (!book.plates?.[scene]) missing.push(`${unit.id}:plate`);
    }
    expect(missing).toEqual([]);
  });

  it('keeps the cast and before-reading material the runtime can decorate', () => {
    expect(Object.keys(book.cast?.members || {})).toContain('wren');
    expect(Object.keys(book.cast?.members || {}).length).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(book.preshow)).toBe(true);
    expect(book.preshow.length).toBeGreaterThan(0);
  });

  it('keeps contextual material available for Explore without putting it in the track', () => {
    expect(Object.keys(book.info || {}).length).toBeGreaterThan(0);
    expect(Object.values(book.info).every((item) => item.title || item.caption)).toBe(true);
  });

  it('keeps every translation table extracted from the source', () => {
    expect(occurrences('var TR_WORDS')).toBe(1);
    expect(Object.keys(book.wordTranslations).length).toBe(64);
    expect(Object.keys(book.lineTranslations).length).toBeGreaterThan(0);
    expect(book.languages.map((language) => language.code)).toEqual(['th', 'es', 'ko', 'ja']);
  });

  it('passes the generic book contract', () => {
    const { ok, errors } = validateBook(book);
    expect(errors.slice(0, 10)).toEqual([]);
    expect(ok).toBe(true);
  });
});

describe('the translations cover what the solo reader promises', () => {
  it('has every literary line in every language offered by the picker', () => {
    const missing = [];
    for (const unit of book.units) {
      const count = linesOf(unit).length;
      for (const { code } of book.languages) {
        for (let index = 0; index < count; index++) {
          if (!lineTranslation(book, code, unit.id, index, count)) {
            missing.push(`${unit.id}/${code}/${index}`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('offers meaningful translated vocabulary coverage', () => {
    const words = new Set();
    for (const unit of book.units) {
      for (const word of Object.keys(glossOf(unit))) words.add(word);
    }
    expect(words.size).toBeGreaterThan(60);

    for (const { code, en } of book.languages) {
      const covered = [...words].filter((word) => wordTranslation(book, code, word)).length;
      expect(covered, `${en} has too little vocabulary support`).toBeGreaterThan(50);
    }
  });

  it('does not silently become patchy across supported languages', () => {
    const words = new Set();
    for (const unit of book.units) {
      for (const word of Object.keys(glossOf(unit))) words.add(word);
    }

    const patchy = [];
    for (const word of words) {
      const translated = book.languages.filter(({ code }) => wordTranslation(book, code, word));
      if (translated.length && translated.length !== book.languages.length) patchy.push(word);
    }
    expect(patchy).toEqual([]);
  });

  it('falls back to an English definition when a word was never translated', () => {
    const knownGap = 'beggar';
    const unit = book.units.find((candidate) => glossOf(candidate)[knownGap]);
    expect(glossOf(unit)[knownGap]).toBeTruthy();
  });
});
