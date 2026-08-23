import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateBook, allUnitIds } from './validate.js';

/**
 * The whole book came out of the HTML, and nothing was left behind.
 *
 * This is the check the extraction is worthless without. A dropped
 * question is invisible until a class reaches it, and "the extractor
 * ran without error" proves only that it ran. So every count here is
 * compared against the legacy source itself rather than trusted.
 */

let book;
let legacy;

beforeAll(() => {
  book = JSON.parse(readFileSync('src/books/magi/book.json', 'utf8'));
  legacy = readFileSync('legacy/index.html', 'utf8');
});

/** Count occurrences of a literal in the source. */
const occurrences = (needle) => legacy.split(needle).length - 1;

describe('the package carries the whole book', () => {
  it('has every part, not just the text', () => {
    for (const part of [
      'units',
      'teaching',
      'info',
      'guideVoice',
      'preshow',
      'wrenReactions',
      'recaps',
      'dialogue',
      'cast',
      'languages',
      'lineTranslations',
      'wordTranslations',
      'uiTranslations',
      'swaps',
      'plates',
    ]) {
      expect(book[part], `${part} is missing from the package`).toBeDefined();
    }
  });

  it('teaches every unit the story has, including the two info panels', () => {
    /* fourteen: twelve story units plus the author study and the afterword */
    const ids = allUnitIds(book);
    expect(ids.size).toBe(14);
    for (const id of Object.keys(book.teaching)) {
      expect(ids.has(id), `teaching.${id} has no unit`).toBe(true);
    }
    expect(Object.keys(book.teaching).length).toBe(14);
  });

  it('kept every multiple-choice question in the source', () => {
    const inPackage = Object.values(book.teaching).reduce((n, t) => n + (t.mc?.length || 0), 0);
    /* the source writes each one as `"q":` inside TEACHING */
    const start = legacy.indexOf('var TEACHING');
    const end = legacy.indexOf('var GUIDE_VOICE');
    const section = legacy.slice(start, end);
    const inSource = section.split('"q":').length - 1;

    expect(inPackage).toBeGreaterThan(20);
    /* every "q" in the source is an mc question, a written prompt or a
       recap; the package must account for all of them */
    const written = Object.values(book.teaching).filter((t) => t.sa).length;
    const recaps = Object.values(book.teaching).filter((t) => t.recap).length;
    expect(inPackage + written + recaps).toBe(inSource);
  });

  it('kept every character line', () => {
    expect(Object.keys(book.dialogue).length).toBe(14);
    expect(book.preshow.length).toBeGreaterThan(3);
    expect(book.cast.members).toBeDefined();
    expect(Object.keys(book.cast.members).length).toBeGreaterThanOrEqual(2);
    expect(book.cast.members.wren?.name).toBe('Wren');
  });

  it('kept every translation', () => {
    expect(occurrences('var TR_WORDS')).toBe(1);
    expect(Object.keys(book.wordTranslations).length).toBe(64);
    expect(Object.keys(book.uiTranslations).length).toBe(129);
    expect(Object.keys(book.lineTranslations).length).toBe(14);
    expect(book.languages.map((l) => l.code)).toEqual(['th', 'es', 'ko', 'ja']);
  });

  it('every language the picker offers has words behind it', () => {
    const words = Object.values(book.wordTranslations);
    for (const { code, en } of book.languages) {
      const covered = words.filter((w) => w[code]).length;
      expect(covered, `${en} is offered but ${covered} words are translated`).toBeGreaterThan(
        10
      );
    }
  });

  it('passes its own contract', () => {
    const { ok, errors } = validateBook(book);
    expect(errors.slice(0, 10)).toEqual([]);
    expect(ok).toBe(true);
  });
});

describe('the questions are answerable', () => {
  it('every multiple-choice answer is one of its options', () => {
    const bad = [];
    for (const [unit, t] of Object.entries(book.teaching)) {
      (t.mc || []).forEach((q, i) => {
        if (!Number.isInteger(q.correct) || !q.opts?.[q.correct])
          bad.push(`${unit}.mc[${i}] correct=${q.correct} of ${q.opts?.length}`);
      });
    }
    expect(bad).toEqual([]);
  });

  it('every written prompt gives the grader something to look for', () => {
    const bare = [];
    for (const [unit, t] of Object.entries(book.teaching)) {
      if (!t.sa) continue;
      const keys = (t.sa.core || []).concat(t.sa.support || []);
      if (!keys.length) bare.push(unit);
    }
    expect(bare).toEqual([]);
  });

  it('has enough of both to be a real assessment', () => {
    const mc = Object.values(book.teaching).reduce((n, t) => n + (t.mc?.length || 0), 0);
    const sa = Object.values(book.teaching).filter((t) => t.sa).length;
    expect(mc).toBeGreaterThanOrEqual(20);
    expect(sa).toBeGreaterThanOrEqual(10);
  });
});
