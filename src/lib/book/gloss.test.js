import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { glossOf, beatsOf, linesOf } from '../reader/beats.js';
import { wordTranslation, speechTranslation, translatorFor } from './translate.js';
import { preshowRun, helloRun, passIntroRun, talkFor, reactionsFor } from '../speech/script.js';

let book;
beforeAll(() => {
  book = JSON.parse(readFileSync('src/books/magi/book.json', 'utf8'));
});

describe('the words the book explains', () => {
  it('takes them from both places the book writes them', () => {
    /* a `gloss` list on the unit, and `{word|meaning}` inline in the
       stanzas — a reader does not care which */
    const g = glossOf(book.units[0]);
    expect(g.bulldozing).toBe('pushing and bullying');
    expect(Object.keys(g).length).toBeGreaterThan(2);
  });

  it('finds them across the whole book, once each', () => {
    const all = new Set();
    for (const u of book.units) for (const w of Object.keys(glossOf(u))) all.add(w);
    expect(all.size).toBe(69);
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
    for (const b of beats) expect(b.gloss.bulldozing).toBeTruthy();
  });
});

describe('an explained word can be looked up in the reader’s language', () => {
  /* Five of the sixty-nine were never translated. That is a gap in the
     book, not in the code — and the code already does the right thing
     with it: the pop-up shows the English meaning and simply leaves the
     second line off. Named here so that five does not quietly become
     thirty, and so anyone filling them in can find them. */
  const NOT_TRANSLATED = ['beggar', 'pier glass', 'longitudinal', 'pluck', 'hashed'];

  const glossedWords = () => {
    const all = new Set();
    for (const u of book.units) for (const w of Object.keys(glossOf(u))) all.add(w);
    return [...all];
  };

  it('has a translation for all but the five the book never translated', () => {
    const missing = glossedWords().filter((w) => !wordTranslation(book, 'ko', w));
    expect(missing.sort()).toEqual([...NOT_TRANSLATED].sort());
  });

  it('has all four languages wherever it has any', () => {
    const patchy = [];
    for (const w of glossedWords()) {
      const got = book.languages.filter(({ code }) => wordTranslation(book, code, w));
      if (got.length && got.length !== book.languages.length) patchy.push(w);
    }
    expect(patchy).toEqual([]);
  });

  it('leaves the untranslated ones with their English meaning, not a blank', () => {
    for (const w of NOT_TRANSLATED) {
      const unit = book.units.find((u) => glossOf(u)[w]);
      expect(glossOf(unit)[w], `${w} has no meaning at all`).toBeTruthy();
      expect(wordTranslation(book, 'ko', w)).toBeNull();
    }
  });
});

describe('what Wren and the Professor say, translated', () => {
  const spoken = () => {
    const out = [...preshowRun(book), ...helloRun(book)];
    for (const p of [1, 2, 3]) out.push(...passIntroRun(book, p));
    for (const id of [...book.units.map((u) => u.id), 'ohenry', 'impact']) {
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
    expect(t.word('imputation')).toBeTruthy();
    expect(t.ui('Vocabulary')).toBeTruthy();
    expect(t.said(preshowRun(book)[0].text)).toBeTruthy();
    expect(typeof t.line).toBe('function');
  });

  it('is nothing at all when the reader has chosen English', () => {
    expect(translatorFor(book, '')).toBeNull();
  });
});
