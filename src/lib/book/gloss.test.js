import { describe, it, expect } from 'vitest';
import book from '../../books/fixture/index.js';
import { glossOf, beatsOf, linesOf } from '../reader/beats.js';
import { wordTranslation, speechTranslation, translatorFor } from './translate.js';
import { preshowRun, helloRun, passIntroRun, talkFor, reactionsFor } from '../speech/script.js';

/**
 * Read against the engine's own fixture book, not against a title.
 *
 * Nothing here is a fact about any particular story: it is how the
 * engine collects the words a book explains and looks them up in the
 * reader's language. The same checks made against the shipping pack —
 * which of its words were never translated, whether every line its
 * guides speak has a translation — are facts about that pack, and they
 * live in `books/magi/` and in `extracted.test.js`.
 */

describe('the words the book explains', () => {
  it('takes them from both places the book writes them', () => {
    /* a `gloss` list on the unit, and `{word|meaning}` inline in the
       stanzas — a reader does not care which */
    const g = glossOf(book.units[0]);
    expect(g.gloom, 'the inline markup').toBe('near darkness');
    expect(g.landing, 'the gloss list').toBe('the flat floor at the top of a stair');
    expect(Object.keys(g).length).toBeGreaterThan(2);
  });

  it('finds them across the whole book, once each', () => {
    /* Twenty-four, counted by hand against the fixture. A word the book
       explains in two different parts — `still`, deliberately — is one
       word here, which is the claim being made. */
    const all = new Set();
    for (const u of book.units) for (const w of Object.keys(glossOf(u))) all.add(w);
    expect(all.size).toBe(24);
    expect(glossOf(book.units[0]).still).toBeTruthy();
    expect(glossOf(book.units[3]).still).toBeTruthy();
  });

  it('keys them lowercase, because that is how a word is looked up', () => {
    for (const u of book.units) {
      for (const w of Object.keys(glossOf(u))) expect(w).toBe(w.toLowerCase());
    }
  });

  it('gives nothing back for a unit that explains nothing', () => {
    expect(glossOf({ id: 'x' })).toEqual({});
    expect(glossOf(null)).toEqual({});
  });

  it('rides along on every beat, so the line knows its own hard words', () => {
    const beats = beatsOf(book.units[0], { plates: book.plates });
    expect(beats.length).toBe(linesOf(book.units[0]).length);
    for (const b of beats) expect(b.gloss.gloom).toBeTruthy();
  });
});

describe('an explained word can be looked up in the reader’s language', () => {
  const glossedWords = () => {
    const all = new Set();
    for (const u of book.units) for (const w of Object.keys(glossOf(u))) all.add(w);
    return [...all];
  };

  it('has every word, in every language the book offers', () => {
    const words = glossedWords();
    /* Two ways this passes without checking anything: no glossed words,
       or no languages. Either makes the sweep below read as a clean
       result when it examined nothing at all. */
    expect(words.length, 'no glossed words to check').toBeGreaterThan(0);
    expect(book.languages.length, 'no languages to check against').toBeGreaterThan(0);

    const missing = [];
    for (const w of words) {
      for (const { code } of book.languages) {
        if (!wordTranslation(book, code, w)) missing.push(`${w}/${code}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('carries languages the picker does not offer, and does not mind', () => {
    /* The word list may be ready for a language the reader has not been
       given yet. That is data waiting to be used, not a fault — the
       fault would be the other direction, and the contract checks it. */
    const offered = book.languages.map((l) => l.code);
    expect(offered).not.toContain('fr');
    expect(wordTranslation(book, 'fr', 'gloom')).toBeTruthy();
  });

  it('says nothing rather than something wrong', () => {
    expect(wordTranslation(book, 'ko', 'a-word-this-book-never-explains')).toBeNull();
    expect(wordTranslation(book, '', 'gloom')).toBeNull();
  });
});

describe('what the two guides say, translated', () => {
  const spoken = () => {
    const out = [...preshowRun(book), ...helloRun(book)];
    for (const p of [1, 2, 3]) out.push(...passIntroRun(book, p));
    for (const id of [...book.units.map((u) => u.id), ...Object.keys(book.info)]) {
      out.push(...talkFor(book, id));
      out.push(...reactionsFor(book, id).values());
    }
    return out;
  };

  it('covers every line either of them says', () => {
    const missing = [];
    for (const t of spoken()) {
      for (const { code } of book.languages) {
        if (!speechTranslation(book, code, t.text)) missing.push(`${t.clip}/${code}`);
      }
    }
    expect(missing).toEqual([]);
    expect(spoken().length, 'nothing to check would pass too').toBeGreaterThan(15);
  });

  it('does not care about stray whitespace, because the book does not', () => {
    const line = spoken()[0].text;
    expect(speechTranslation(book, 'ko', `  ${line.replace(/ /g, '  ')}  `)).toBe(
      speechTranslation(book, 'ko', line)
    );
  });

  it('says nothing rather than something wrong', () => {
    expect(speechTranslation(book, 'ko', 'a sentence nobody in this book says')).toBeNull();
    expect(speechTranslation(book, '', 'anything')).toBeNull();
  });
});

describe('the translator the reader is handed', () => {
  it('carries all four jobs', () => {
    const t = translatorFor(book, 'ko');
    expect(t.word('gloom')).toBeTruthy();
    expect(t.ui('Vocabulary')).toBeTruthy();
    expect(t.said(preshowRun(book)[0].text)).toBeTruthy();
    expect(typeof t.line).toBe('function');
  });

  it('is nothing at all when the reader has chosen English', () => {
    expect(translatorFor(book, '')).toBeNull();
  });
});
