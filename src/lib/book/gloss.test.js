import { describe, it, expect } from 'vitest';
import book from '../../books/fixture/index.js';
import { glossOf, beatsOf, linesOf } from '../reader/beats.js';
import { wordTranslation, translatorFor } from './translate.js';

/**
 * Generic vocabulary and translation behavior against the engine fixture.
 * Framing dialogue is not translated by the solo reader today, so this
 * suite protects the promises the product actually makes: translated
 * literary lines, word definitions and interface copy.
 */

describe('the words the book explains', () => {
  it('takes them from both places the book writes them', () => {
    const gloss = glossOf(book.units[0]);
    expect(gloss.gloom, 'the inline markup').toBe('near darkness');
    expect(gloss.landing, 'the gloss list').toBe('the flat floor at the top of a stair');
    expect(Object.keys(gloss).length).toBeGreaterThan(2);
  });

  it('finds them across the whole book once each', () => {
    const all = new Set();
    for (const unit of book.units) {
      for (const word of Object.keys(glossOf(unit))) all.add(word);
    }
    expect(all.size).toBe(24);
    expect(glossOf(book.units[0]).still).toBeTruthy();
    expect(glossOf(book.units[3]).still).toBeTruthy();
  });

  it('keys them lowercase because that is how a word is looked up', () => {
    for (const unit of book.units) {
      for (const word of Object.keys(glossOf(unit))) expect(word).toBe(word.toLowerCase());
    }
  });

  it('gives nothing back for a unit that explains nothing', () => {
    expect(glossOf({ id: 'x' })).toEqual({});
    expect(glossOf(null)).toEqual({});
  });

  it('rides along on every beat so a line knows its own hard words', () => {
    const beats = beatsOf(book.units[0], { plates: book.plates });
    expect(beats.length).toBe(linesOf(book.units[0]).length);
    for (const beat of beats) expect(beat.gloss.gloom).toBeTruthy();
  });
});

describe('an explained word can be looked up in the reader’s language', () => {
  const glossedWords = () => {
    const all = new Set();
    for (const unit of book.units) {
      for (const word of Object.keys(glossOf(unit))) all.add(word);
    }
    return [...all];
  };

  it('has every fixture word in every language the picker offers', () => {
    const words = glossedWords();
    expect(words.length, 'no glossed words to check').toBeGreaterThan(0);
    expect(book.languages.length, 'no languages to check against').toBeGreaterThan(0);

    const missing = [];
    for (const word of words) {
      for (const { code } of book.languages) {
        if (!wordTranslation(book, code, word)) missing.push(`${word}/${code}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('can carry a language the picker does not offer yet', () => {
    const offered = book.languages.map((language) => language.code);
    expect(offered).not.toContain('fr');
    expect(wordTranslation(book, 'fr', 'gloom')).toBeTruthy();
  });

  it('says nothing rather than something wrong', () => {
    expect(wordTranslation(book, 'ko', 'a-word-this-book-never-explains')).toBeNull();
    expect(wordTranslation(book, '', 'gloom')).toBeNull();
  });
});

describe('the translator the solo reader is handed', () => {
  it('provides translated words, interface copy and literary lines', () => {
    const translator = translatorFor(book, 'ko');
    expect(translator.word('gloom')).toBeTruthy();
    expect(translator.ui('Vocabulary')).toBeTruthy();
    expect(typeof translator.line).toBe('function');
  });

  it('is nothing at all when the reader has chosen English', () => {
    expect(translatorFor(book, '')).toBeNull();
  });
});
