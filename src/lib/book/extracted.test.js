import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateBook, allUnitIds } from './validate.js';
import { glossOf, linesOf } from '../reader/beats.js';
import { lineTranslation, speechTranslation, wordTranslation } from './translate.js';
import { preshowRun, helloRun, passIntroRun, talkFor, reactionsFor } from '../speech/script.js';

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
    /* Every "q" between `var TEACHING` and `var GUIDE_VOICE` is an mc
       question or a written prompt. Recaps are NOT in that slice — the
       source keeps them in their own `var RECAPS` — so they are counted
       separately below. This sum used to carry a `+ recaps` term that
       balanced only because it was always zero, which is what hid the
       fact that no recap had ever reached the package. */
    const written = Object.values(book.teaching).filter((t) => t.sa).length;
    expect(inPackage + written).toBe(inSource);
  });

  it('kept the act reviews, and put them where the reader looks', () => {
    /* Four act reviews were authored, extracted, shipped, and never once
       put to a student: the tool wrote them to `book.recaps` and the
       reader reads `teaching[id].recap`. Nothing failed. The pack
       validated and the reading ran, and the only evidence was four
       questions that existed and were never asked.

       So this counts them at the source and follows them all the way to
       the thing that builds a reading, rather than trusting that a key
       exists. */
    const start = legacy.indexOf('var RECAPS');
    const end = legacy.indexOf('var DIALOGUE', start);
    const inSource = legacy.slice(start, end).split('"q":').length - 1;
    expect(inSource, 'the source has no recaps to check against').toBeGreaterThan(0);

    const inPackage = Object.values(book.teaching).filter((t) => t.recap).length;
    expect(inPackage).toBe(inSource);
    expect(book.recaps, 'recaps must not also be left at the top level').toBeUndefined();

    /* and they are answerable, which nothing validated before */
    for (const [id, t] of Object.entries(book.teaching)) {
      if (!t.recap) continue;
      const opts = t.recap.opts || [];
      expect(opts.length, `${id} recap has too few options`).toBeGreaterThan(1);
      expect(
        Number.isInteger(t.recap.correct) &&
          t.recap.correct >= 0 &&
          t.recap.correct < opts.length,
        `${id} recap answers option ${t.recap.correct} of ${opts.length}`
      ).toBe(true);
    }
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

/**
 * The translation coverage of THIS pack.
 *
 * These three used to live in `translate.test.js` and `gloss.test.js`,
 * which now run against the engine's fixture book. The engine behaviour
 * they were checking belongs there; what is left here is the part that
 * was only ever a fact about this pack — that its four translations
 * really do reach every line, every glossed word and every spoken turn.
 * Moved rather than dropped, because a gap in any of them is a promise
 * broken to a student mid-story.
 */
describe('the translations reach everything they are promised for', () => {
  it('has every line of every unit, in every language the picker offers', () => {
    const missing = [];
    for (const u of book.units) {
      const n = linesOf(u).length;
      for (const { code } of book.languages) {
        for (let i = 0; i < n; i++) {
          if (!lineTranslation(book, code, u.id, i, n)) missing.push(`${u.id}/${code}/${i}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('has every line either guide speaks', () => {
    const spoken = [...preshowRun(book), ...helloRun(book)];
    for (const p of [1, 2, 3]) spoken.push(...passIntroRun(book, p));
    for (const id of [...book.units.map((u) => u.id), ...Object.keys(book.info)]) {
      spoken.push(...talkFor(book, id));
      spoken.push(...reactionsFor(book, id).values());
    }

    const missing = [];
    for (const t of spoken) {
      for (const { code } of book.languages) {
        if (!speechTranslation(book, code, t.text)) missing.push(`${t.clip}/${code}`);
      }
    }
    expect(missing).toEqual([]);
    /* eighty-odd turns, so an empty list would not pass this quietly */
    expect(spoken.length).toBeGreaterThan(50);
  });

  it('has every glossed word but the five this book never translated', () => {
    /* Five of the sixty-nine were never translated. That is a gap in the
       book, not in the code — and the code already does the right thing
       with it: the pop-up shows the English meaning and simply leaves
       the second line off. Named here so that five does not quietly
       become thirty, and so anyone filling them in can find them. */
    const NOT_TRANSLATED = ['beggar', 'pier glass', 'longitudinal', 'pluck', 'hashed'];

    const words = new Set();
    for (const u of book.units) for (const w of Object.keys(glossOf(u))) words.add(w);
    expect(words.size).toBe(69);

    const missing = [...words].filter((w) => !wordTranslation(book, 'ko', w));
    expect(missing.sort()).toEqual([...NOT_TRANSLATED].sort());

    /* and the ones with no translation still have their English meaning,
       rather than a blank where a definition should be */
    for (const w of NOT_TRANSLATED) {
      const unit = book.units.find((u) => glossOf(u)[w]);
      expect(glossOf(unit)[w], `${w} has no meaning at all`).toBeTruthy();
    }
  });

  it('has all four languages wherever it has any', () => {
    const words = new Set();
    for (const u of book.units) for (const w of Object.keys(glossOf(u))) words.add(w);

    const patchy = [];
    for (const w of words) {
      const got = book.languages.filter(({ code }) => wordTranslation(book, code, w));
      if (got.length && got.length !== book.languages.length) patchy.push(w);
    }
    expect(patchy).toEqual([]);
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
