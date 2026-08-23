import { describe, it, expect } from 'vitest';
import { validateBook, inlineGlosses, plainStanza } from './validate.js';

/**
 * These tests are written from the generator's point of view: each case
 * is a mistake a model asked to write a book package plausibly makes.
 * The point of the validator is that none of them can reach a student.
 */

/** @returns {import('../types.js').Book} */
const good = () => ({
  meta: { title: 'The Gift of the Magi', id: 'magi' },
  units: [
    {
      id: 's1',
      title: 'One Dollar Eighty-Seven',
      act: 'Act I',
      stanzas: [
        'One dollar and eighty-seven cents.\nAnd sixty cents of it in pennies saved by {bulldozing|pushing and bullying} the grocer.',
      ],
      gloss: [['bulldozing', 'pushing and bullying']],
      mc: [{ q: 'How much has Della saved?', opts: ['$1.87', '$18.70'], correct: 0 }],
    },
    {
      id: 's2',
      title: 'The Eight-Dollar Flat',
      act: 'Act I',
      stanzas: ['A furnished flat at $8 per week, near {mendicancy|begging}.'],
      gloss: [['mendicancy', 'begging']],
    },
  ],
  swaps: { bulldozing: 'bullying' },
});

describe('the happy path', () => {
  it('accepts a well-formed book', () => {
    const r = validateBook(good());
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.wordCount).toBe(2);
  });
});

describe('inline gloss markup', () => {
  it('parses word and meaning', () => {
    expect(inlineGlosses('a {coax|gently persuade} ring')).toEqual([
      { w: 'coax', d: 'gently persuade' },
    ]);
  });
  it('strips to plain text for reading aloud', () => {
    expect(plainStanza('a {coax|gently persuade} ring')).toBe('a coax ring');
  });
  it('catches an unclosed brace', () => {
    const b = good();
    b.units[0].stanzas[0] = 'saved by {bulldozing|pushing and bullying the grocer.';
    const { errors } = validateBook(b);
    expect(errors.some((e) => /unbalanced/.test(e.message))).toBe(true);
  });
  it('catches a gloss with no meaning', () => {
    const b = good();
    b.units[0].stanzas[0] = 'saved by {bulldozing|} the grocer.';
    const { errors } = validateBook(b);
    expect(errors.some((e) => /has no meaning/.test(e.message))).toBe(true);
  });
});

describe('the glossary must match the text', () => {
  it('rejects a word that is glossed but never appears', () => {
    const b = good();
    b.units[0].gloss.push(['parsimony', 'being mean with money']);
    const { errors } = validateBook(b);
    expect(errors).toContainEqual(
      expect.objectContaining({
        message: expect.stringContaining('does not appear in the text'),
      })
    );
  });

  it('accepts a word that appears with different capitalisation', () => {
    const b = good();
    b.units[1].stanzas[0] = 'Mendicancy was close at hand.';
    b.units[1].gloss = [['mendicancy', 'begging']];
    expect(validateBook(b).ok).toBe(true);
  });

  it('does not match a word buried inside another word', () => {
    const b = good();
    b.units[1].stanzas[0] = 'The flat was unremarkable.';
    b.units[1].gloss = [['mark', 'a sign']];
    const { errors } = validateBook(b);
    expect(errors.some((e) => /does not appear/.test(e.message))).toBe(true);
  });
});

describe('one word, one meaning', () => {
  it('rejects the same word defined two different ways', () => {
    const b = good();
    b.units[1].stanzas[0] = 'saved by {bulldozing|driving a bulldozer} the grocer.';
    b.units[1].gloss = [['bulldozing', 'driving a bulldozer']];
    const { errors } = validateBook(b);
    expect(errors.some((e) => /defined twice/.test(e.message))).toBe(true);
  });

  it('allows the same word repeated with the same meaning', () => {
    const b = good();
    b.units[1].stanzas[0] = 'more {bulldozing|pushing and bullying} still.';
    b.units[1].gloss = [['bulldozing', 'pushing and bullying']];
    expect(validateBook(b).ok).toBe(true);
  });
});

describe('multiple choice', () => {
  it('rejects a correct index outside the options', () => {
    const b = good();
    b.units[0].mc[0].correct = 5;
    const { errors } = validateBook(b);
    expect(errors.some((e) => /is not one of/.test(e.message))).toBe(true);
  });
  it('rejects duplicate options', () => {
    const b = good();
    b.units[0].mc[0].opts = ['$1.87', '$1.87'];
    const { errors } = validateBook(b);
    expect(errors.some((e) => /duplicate options/.test(e.message))).toBe(true);
  });
  it('rejects a single-option question', () => {
    const b = good();
    b.units[0].mc[0].opts = ['$1.87'];
    b.units[0].mc[0].correct = 0;
    const { errors } = validateBook(b);
    expect(errors.some((e) => /at least two options/.test(e.message))).toBe(true);
  });
});

describe('substitutions', () => {
  it('rejects a substitution equal to its own word', () => {
    const b = good();
    b.swaps = { bulldozing: 'Bulldozing' };
    const { errors } = validateBook(b);
    expect(errors.some((e) => /the word itself/.test(e.message))).toBe(true);
  });

  it('rejects a substitution for a word not in any glossary', () => {
    const b = good();
    b.swaps = { chiaroscuro: 'contrast' };
    const { errors } = validateBook(b);
    expect(errors.some((e) => /not in any unit/.test(e.message))).toBe(true);
  });
});

describe('structure', () => {
  it.each([
    [{}, 'a book needs a title'],
    [{ meta: { title: 'x' } }, 'a book needs at least one unit'],
  ])('rejects %j', (book, message) => {
    const { errors } = validateBook(book);
    expect(errors.some((e) => e.message === message)).toBe(true);
  });

  it('rejects duplicate unit ids', () => {
    const b = good();
    b.units[1].id = 's1';
    const { errors } = validateBook(b);
    expect(errors.some((e) => /duplicate id/.test(e.message))).toBe(true);
  });

  it('rejects a unit with no text', () => {
    const b = good();
    b.units[1].stanzas = [];
    const { errors } = validateBook(b);
    expect(errors.some((e) => /no text cannot be read/.test(e.message))).toBe(true);
  });

  it('never throws on rubbish', () => {
    for (const bad of [null, undefined, 0, '', [], { units: [null] }]) {
      expect(() => validateBook(bad)).not.toThrow();
    }
  });
});
