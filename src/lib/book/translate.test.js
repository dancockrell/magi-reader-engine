import { describe, it, expect } from 'vitest';
import book from '../../books/fixture/index.js';
import {
  languagesOf,
  hasLanguage,
  lineTranslation,
  wordTranslation,
  uiTranslation,
  translatorFor,
} from './translate.js';
import { linesOf } from '../reader/beats.js';

/* The fixture book, because none of this is about a story: it is about
   how a pack's translations are found, and what happens when they are
   not there. Whether the shipping pack's own translations are complete
   is a fact about that pack, and `extracted.test.js` checks it. */

describe('the languages the book offers', () => {
  it('are the ones it was translated into', () => {
    expect(
      languagesOf(book)
        .map((l) => l.code)
        .sort()
    ).toEqual(['es', 'ko']);
  });

  it('ignores an entry with no code, rather than offering a blank', () => {
    expect(languagesOf({ languages: [{ name: 'Nameless' }, null] })).toEqual([]);
  });

  it('does not claim one it does not have', () => {
    expect(hasLanguage(book, 'ko')).toBe(true);
    expect(hasLanguage(book, 'de')).toBe(false);
    expect(hasLanguage(book, '')).toBe(false);
  });
});

describe('a line in the reader’s language', () => {
  it('is there for every line of every unit, in every language', () => {
    /* This is the check that matters: the panel promises a translation
       under the English, so a gap is a promise broken mid-story. */
    const missing = [];
    for (const u of book.units) {
      const n = linesOf(u).length;
      for (const { code } of languagesOf(book)) {
        for (let i = 0; i < n; i++) {
          if (!lineTranslation(book, code, u.id, i, n)) missing.push(`${u.id}/${code}/${i}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('is the reader’s language, not the English again', () => {
    const ko = lineTranslation(book, 'ko', 'p1', 0, linesOf(book.units[0]).length);
    expect(ko).toBeTruthy();
    expect(ko).not.toMatch(/^[\x20-\x7E]+$/);
  });

  it('refuses a list that does not line up rather than showing the wrong sentence', () => {
    const short = { lineTranslations: { p1: { ko: ['하나', '둘'] } } };
    expect(lineTranslation(short, 'ko', 'p1', 0, 20)).toBeNull();
    /* without a line count there is nothing to check against, so it
       answers — the caller that knows the count is the one that passes it */
    expect(lineTranslation(short, 'ko', 'p1', 0)).toBe('하나');
  });

  it('says nothing rather than something wrong', () => {
    expect(lineTranslation(book, '', 'p1', 0)).toBeNull();
    expect(lineTranslation(book, 'ko', 'nope', 0)).toBeNull();
    expect(lineTranslation(book, 'ko', 'p1', 9999)).toBeNull();
    expect(lineTranslation({}, 'ko', 'p1', 0)).toBeNull();
  });
});

describe('a word and a phrase', () => {
  it('gives a glossed word its meaning', () => {
    expect(wordTranslation(book, 'ko', 'gloom')).toBe('어둠');
    expect(wordTranslation(book, 'ko', 'GLOOM'), 'case should not matter').toBe('어둠');
  });

  it('gives an interface phrase its wording', () => {
    expect(uiTranslation(book, 'ko', 'Language')).toBe('언어');
  });

  it('leaves what it does not know untranslated rather than blank', () => {
    expect(wordTranslation(book, 'ko', 'sandwich')).toBeNull();
    expect(uiTranslation(book, 'ko', 'Not a phrase in the book')).toBeNull();
    expect(uiTranslation(book, '', 'Language')).toBeNull();
  });
});

describe('a translator bound to a book and a language', () => {
  it('is nothing at all when no language is chosen', () => {
    expect(translatorFor(book, '')).toBeNull();
    expect(translatorFor(book, 'de')).toBeNull();
  });

  it('translates the line a stop is on', () => {
    const counts = Object.fromEntries(book.units.map((u) => [u.id, linesOf(u).length]));
    const t = translatorFor(book, 'ko', counts);
    expect(t.lang).toBe('ko');
    expect(t.line({ unit: 'p1', i: 0 })).toBeTruthy();
    expect(t.word('gloom')).toBeTruthy();
  });

  it('has nothing to say about a stop that is not a line', () => {
    const t = translatorFor(book, 'ko');
    expect(t.line({ unit: 'p1' })).toBeNull();
    expect(t.line(null)).toBeNull();
  });
});
