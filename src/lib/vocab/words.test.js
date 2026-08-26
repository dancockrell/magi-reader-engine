import { describe, it, expect } from 'vitest';
import fixture from '../../books/fixture/index.js';
import { wordsOf } from './words.js';
import { validateBook } from '../book/validate.js';

const unit = (id, stanzas, gloss) => ({ id, stanzas, gloss });

describe('the words the trainer may ask about', () => {
  it('takes them from the gloss list and from the inline markup alike', () => {
    const book = {
      units: [
        unit('u1', ['a {shabby|worn out} coat'], [['coax', 'to persuade gently']]),
        unit('u2', ['she {coveted|badly wanted} it'], []),
      ],
    };
    expect(
      wordsOf(book)
        .map((i) => i.w)
        .sort()
    ).toEqual(['coax', 'coveted', 'shabby']);
  });

  it('records which unit a word was met in, so its line can be found', () => {
    const book = { units: [unit('u1', ['a {shabby|worn out} coat'], [])] };
    expect(wordsOf(book)[0]).toMatchObject({ w: 'shabby', d: 'worn out', unit: 'u1' });
  });

  it('keeps one entry for a word repeated with the same meaning', () => {
    const book = {
      units: [
        unit('u1', ['a {shabby|worn out} coat'], []),
        unit('u2', ['a {shabby|worn out} hat'], []),
      ],
    };
    expect(wordsOf(book)).toHaveLength(1);
  });

  it('drops a word that means two different things', () => {
    /* Poe's case: "to still the beating of my heart" and "let my heart
       be still a moment". Both glosses are right; neither can be the
       answer to "what does still mean?" on its own. */
    const book = {
      units: [
        unit('s3', ['to still the beating of my heart'], [['still', 'to make calm or stop']]),
        unit('s5', ['Let my heart be still a moment'], [['still', 'calm, quiet']]),
        unit('s9', ['the {gaunt|very thin} bird'], []),
      ],
    };
    expect(wordsOf(book).map((i) => i.w)).toEqual(['gaunt']);
  });

  it('drops it however far apart the two meanings are', () => {
    /* The first-wins bug was invisible precisely because the second
       gloss could be many units later. */
    const book = {
      units: [
        unit('u1', ['x'], [['still', 'to make calm or stop']]),
        ...Array.from({ length: 8 }, (_, i) => unit(`f${i}`, ['filler'], [])),
        unit('u9', ['y'], [['still', 'calm, quiet']]),
      ],
    };
    expect(wordsOf(book)).toEqual([]);
  });

  it('survives a book with no units at all', () => {
    expect(wordsOf(undefined)).toEqual([]);
    expect(wordsOf({})).toEqual([]);
  });

  it('agrees with the contract about how many words the trainer gets', () => {
    /* Two counts of the same thing, computed by different code in
       different modules. They drifting apart is exactly the failure that
       three copies of this function used to hide.

       Against a whole book rather than a two-unit sketch, because the
       thing that makes them disagree is a shape only a complete pack
       has: a word glossed twice, inline markup and a gloss list in the
       same unit, a unit that explains nothing. The fixture has all
       three, and `books/magi/pack.test.js` runs the same check against
       the shipping pack. */
    expect(wordsOf(fixture).length).toBe(validateBook(fixture).wordCount);
    expect(wordsOf(fixture).length).toBeGreaterThan(20);
  });
});
