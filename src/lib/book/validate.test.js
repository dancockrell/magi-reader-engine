import { describe, it, expect } from 'vitest';
import { validateBook, inlineGlosses, plainStanza } from './validate.js';
import fixture from '../../books/fixture/index.js';

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
    },
    {
      id: 's2',
      title: 'The Eight-Dollar Flat',
      act: 'Act I',
      stanzas: ['A furnished flat at $8 per week, near {mendicancy|begging}.'],
      gloss: [['mendicancy', 'begging']],
    },
  ],
  /* Questions live in the teaching layer, which is the only place the
     reader reads them from. A question on the unit itself is refused. */
  teaching: {
    s1: { mc: [{ q: 'How much has Della saved?', opts: ['$1.87', '$18.70'], correct: 0 }] },
  },
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

describe('a word that means two things', () => {
  const twoWays = () => {
    const b = good();
    b.units[1].stanzas[0] = 'saved by {bulldozing|driving a bulldozer} the grocer.';
    b.units[1].gloss = [['bulldozing', 'driving a bulldozer']];
    return b;
  };

  it('warns rather than rejecting — English does this and so does Poe', () => {
    const { ok, errors, warnings } = validateBook(twoWays());
    expect(ok).toBe(true);
    expect(errors).toEqual([]);
    expect(warnings.some((w) => /defined twice/.test(w.message))).toBe(true);
  });

  it('says what the consequence is, not just that it happened', () => {
    const { warnings } = validateBook(twoWays());
    expect(warnings[0].message).toMatch(/glossed in the reading but not asked in the trainer/);
  });

  it('does not count it as a word the trainer can ask about', () => {
    /* The count promises questions. An ambiguous word gets none, so
       counting it would overstate the book by one every time.

       Compared against the same book with the two definitions agreeing,
       so the only difference between the two counts is the ambiguity
       itself. */
    const agreeing = twoWays();
    agreeing.units[1].stanzas[0] = 'saved by {bulldozing|pushing and bullying} the grocer.';
    agreeing.units[1].gloss = [['bulldozing', 'pushing and bullying']];

    expect(validateBook(twoWays()).wordCount).toBe(validateBook(agreeing).wordCount - 1);
  });

  it('allows the same word repeated with the same meaning', () => {
    const b = good();
    b.units[1].stanzas[0] = 'more {bulldozing|pushing and bullying} still.';
    b.units[1].gloss = [['bulldozing', 'pushing and bullying']];
    const { ok, warnings } = validateBook(b);
    expect(ok).toBe(true);
    expect(warnings).toEqual([]);
  });
});

describe('the act review', () => {
  /* A recap is marked exactly like a multiple-choice question, and was
     validated far more loosely than one: a question and some options,
     and nothing else. These are the cases that used to pass. */
  const withRecap = (recap) => {
    const b = good();
    b.teaching = { s1: { recap } };
    return b;
  };
  const ok = {
    q: 'What has happened so far?',
    opts: ['she sold it', 'he sold it'],
    correct: 0,
  };

  it('accepts a well-formed one', () => {
    expect(validateBook(withRecap(ok)).ok).toBe(true);
  });

  it('rejects an answer that is not one of the options', () => {
    const { errors } = validateBook(withRecap({ ...ok, correct: 7 }));
    expect(errors.some((e) => /is not one of/.test(e.message))).toBe(true);
  });

  it('rejects one with no answer at all', () => {
    const { errors } = validateBook(withRecap({ q: ok.q, opts: ok.opts }));
    expect(errors.some((e) => /is not one of/.test(e.message))).toBe(true);
  });

  it('rejects a single-option recap', () => {
    const { errors } = validateBook(withRecap({ ...ok, opts: ['only this'], correct: 0 }));
    expect(errors.some((e) => /at least two options/.test(e.message))).toBe(true);
  });

  it('rejects duplicate options', () => {
    const { errors } = validateBook(withRecap({ ...ok, opts: ['same', 'same'] }));
    expect(errors.some((e) => /duplicate options/.test(e.message))).toBe(true);
  });
});

describe('multiple choice', () => {
  it('rejects a correct index outside the options', () => {
    const b = good();
    b.teaching.s1.mc[0].correct = 5;
    const { errors } = validateBook(b);
    expect(errors.some((e) => /is not one of/.test(e.message))).toBe(true);
  });
  it('rejects duplicate options', () => {
    const b = good();
    b.teaching.s1.mc[0].opts = ['$1.87', '$1.87'];
    const { errors } = validateBook(b);
    expect(errors.some((e) => /duplicate options/.test(e.message))).toBe(true);
  });
  it('rejects a single-option question', () => {
    const b = good();
    b.teaching.s1.mc[0].opts = ['$1.87'];
    b.teaching.s1.mc[0].correct = 0;
    const { errors } = validateBook(b);
    expect(errors.some((e) => /at least two options/.test(e.message))).toBe(true);
  });
});

describe('questions put somewhere nothing reads them', () => {
  /* `questionsOf` reads teaching[id].mc and nothing else. A unit-level
     `mc` was typed and validated with the same care as a real question,
     and read by nobody: a book could carry a full set of well-formed
     questions and build a reading with none in it. Same shape as the
     four act reviews that were shipped and never asked. */
  it('refuses a question on the unit itself', () => {
    const b = good();
    b.units[0].mc = [{ q: 'How much?', opts: ['a', 'b'], correct: 0 }];
    const { ok, errors } = validateBook(b);
    expect(ok).toBe(false);
    expect(errors.some((e) => /nothing reads them/.test(e.message))).toBe(true);
  });

  it('says where the question should go instead', () => {
    /* An error that names the fault and not the fix leaves the author
       guessing, and a generator with no way to correct itself. */
    const b = good();
    b.units[0].mc = [{ q: 'How much?', opts: ['a', 'b'], correct: 0 }];
    const { errors } = validateBook(b);
    const e = errors.find((x) => /nothing reads them/.test(x.message));
    expect(e.message).toContain('teaching["s1"].mc');
  });

  it('says nothing about a unit with no mc key at all', () => {
    expect(validateBook(good()).ok).toBe(true);
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

describe('the engine’s own fixture book', () => {
  /**
   * The fixture is what most of the engine's tests now read against, so
   * a defect in it reads as a defect in the engine. It has to satisfy
   * the same contract a shipping pack does, and it has to keep the one
   * fault it carries on purpose.
   */
  it('passes the contract with no errors', () => {
    const { ok, errors } = validateBook(fixture);
    expect(errors).toEqual([]);
    expect(ok).toBe(true);
  });

  it('warns about the one word it explains two ways, and only that one', () => {
    /* `still` is glossed "not moving" in part one and "even now" in
       part four. Both are right, and the pair is there so that the
       trainer's rule for dropping such a word and the glossary's rule
       for keeping both are exercised by something. If this warning ever
       disappears, that coverage has gone with it. */
    const { warnings } = validateBook(fixture);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toMatch(/"still" is defined twice/);
  });

  it('is a whole book, not a sketch', () => {
    /* A fixture that carries less than a real pack silently tests less
       than the real pack did, and nothing says so. */
    for (const part of [
      'units',
      'info',
      'teaching',
      'recaps',
      'guideVoice',
      'preshow',
      'wrenReactions',
      'dialogue',
      'cast',
      'swaps',
      'plates',
      'languages',
      'lineTranslations',
      'wordTranslations',
      'uiTranslations',
      'speechTranslations',
    ]) {
      expect(Object.keys(fixture[part] || {}).length, `${part} is missing`).toBeGreaterThan(0);
    }
    expect(validateBook(fixture).wordCount).toBeGreaterThan(20);
    expect(fixture.languages.length).toBeGreaterThan(1);
  });
});
