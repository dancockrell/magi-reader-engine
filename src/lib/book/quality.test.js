import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { qualityOf, positionBias, questionsOf, glossesOf } from './quality.js';

/**
 * The second gate: not "can this be read" but "can it be beaten without
 * reading".
 *
 * Every check is a test-taking heuristic, so every test here is written
 * as a student trying to score without opening the book.
 */

const q = (correct, opts, text = 'What happened?') => ({ q: text, opts, correct });

/**
 * A book, with its questions filed where both gates read them.
 *
 * Written as `mc` on a unit because that reads better in a test, and
 * moved into the teaching layer here because that is the only place a
 * question counts. `validate.js` refuses a unit-level `mc` outright, and
 * this helper existing is why every test below did not have to learn
 * that.
 */
const bookOf = (units) => ({
  meta: { title: 'T', id: 't' },
  units: units.map((u) => {
    const unit = { ...u };
    delete unit.mc;
    return unit;
  }),
  teaching: Object.fromEntries(units.filter((u) => u.mc).map((u) => [u.id, { mc: u.mc }])),
});

describe('where the answer sits', () => {
  it('notices when the answer is nearly always in the same slot', () => {
    const units = [
      {
        id: 'u1',
        stanzas: ['x'],
        mc: Array.from({ length: 10 }, () => q(0, ['a', 'b', 'c', 'd'])),
      },
    ];
    const bias = positionBias(questionsOf(bookOf(units)));
    expect(bias.slot).toBe(0);
    expect(bias.share).toBe(1);

    const { findings } = qualityOf(bookOf(units));
    expect(findings.some((f) => f.kind === 'answer-position')).toBe(true);
  });

  it('says nothing about a book with an even spread', () => {
    const opts = ['a', 'b', 'c', 'd'];
    const mc = [0, 1, 2, 3, 0, 1, 2, 3].map((c) => q(c, opts));
    const { findings } = qualityOf(bookOf([{ id: 'u1', stanzas: ['x'], mc }]));
    expect(findings.filter((f) => f.kind === 'answer-position')).toEqual([]);
  });

  it('judges a three-option book against a third, not a quarter', () => {
    /* 33% of answers in slot 0 is even for three options and a lean for
       four. Measuring against a fixed baseline would libel the first. */
    const mc = [0, 1, 2, 0, 1, 2, 0, 1, 2].map((c) => q(c, ['a', 'b', 'c']));
    const bias = positionBias(questionsOf(bookOf([{ id: 'u1', stanzas: ['x'], mc }])));
    expect(bias.even).toBeCloseTo(1 / 3, 5);
    expect(bias.excess).toBeLessThan(0.15);
  });
});

describe('the longest option', () => {
  it('notices when length gives the answer away', () => {
    const mc = Array.from({ length: 10 }, () =>
      q(1, ['no', 'a much longer and more carefully qualified answer', 'nope'])
    );
    const { findings } = qualityOf(bookOf([{ id: 'u1', stanzas: ['x'], mc }]));
    const f = findings.find((x) => x.kind === 'longest-option');
    expect(f, 'a book beatable by picking the longest option').toBeTruthy();
    expect(f.severity).toBe('high');
  });

  it('does not judge a book too small to have a pattern', () => {
    /* Four questions cannot establish a tendency, and calling one out
       would train the author to ignore this. */
    const mc = Array.from({ length: 4 }, () =>
      q(1, ['no', 'a much longer answer indeed', 'nope'])
    );
    const { findings } = qualityOf(bookOf([{ id: 'u1', stanzas: ['x'], mc }]));
    expect(findings.filter((f) => f.kind === 'longest-option')).toEqual([]);
  });
});

describe('distractors that do no work', () => {
  it('flags an absolute in a wrong option', () => {
    const mc = [q(0, ['she sold it', 'she always sold everything'])];
    const { findings } = qualityOf(bookOf([{ id: 'u1', stanzas: ['x'], mc }]));
    expect(findings.some((f) => f.kind === 'absolute-distractor')).toBe(true);
  });

  it('does not flag an absolute in the CORRECT option', () => {
    /* "never" can be the truth. The heuristic is that absolutes read as
       false, which only matters when the option is meant to tempt. */
    const mc = [q(1, ['she sold it', 'she never sold it'])];
    const { findings } = qualityOf(bookOf([{ id: 'u1', stanzas: ['x'], mc }]));
    expect(findings.filter((f) => f.kind === 'absolute-distractor')).toEqual([]);
  });
});

describe('glosses', () => {
  it('catches a definition that uses its own word', () => {
    const units = [
      { id: 'u1', stanzas: ['sainted'], gloss: [['sainted', 'holy, made a saint']] },
    ];
    const { findings } = qualityOf(bookOf(units));
    expect(findings.some((f) => f.kind === 'circular-gloss')).toBe(true);
  });

  it('leaves a proper noun alone, because the full name is the definition', () => {
    /* Found against The Raven, which glosses Pallas, Plutonian, Gilead
       and Aidenn. Flagging those would have made the check noise. */
    const units = [
      {
        id: 'u1',
        stanzas: ['Pallas'],
        gloss: [['Pallas', 'Pallas Athena, Greek goddess of wisdom']],
      },
    ];
    const { findings } = qualityOf(bookOf(units));
    expect(findings.filter((f) => f.kind === 'circular-gloss')).toEqual([]);
  });

  it('reads both gloss shapes', () => {
    const units = [
      { id: 'u1', stanzas: ['x'], gloss: [['a', 'one']] },
      { id: 'u2', stanzas: ['y'], gloss: [{ w: 'b', d: 'two' }] },
    ];
    expect(glossesOf(bookOf(units)).map((g) => g.w)).toEqual(['a', 'b']);
  });
});

describe('the act reviews are checked too', () => {
  /* A recap is marked by the same code as a multiple-choice question, so
     it can be gamed the same ways. This file missed them at first and
     reported on 28 of the 32 questions a reader builds. The four it
     skipped were exactly the four that had already spent a release being
     skipped by everything else. */
  const withRecaps = (correct) => ({
    meta: { title: 'T', id: 't' },
    units: [{ id: 'u1', stanzas: ['x'] }],
    teaching: {
      u1: {
        recap: {
          q: 'Looking back, what happened?',
          opts: ['she sold it', 'he always sold everything'],
          correct,
        },
      },
    },
  });

  it('counts a recap as a question', () => {
    expect(questionsOf(withRecaps(0))).toHaveLength(1);
  });

  it('sees a lazy distractor in a recap', () => {
    const { findings } = qualityOf(withRecaps(0));
    expect(findings.some((f) => f.kind === 'absolute-distractor')).toBe(true);
  });

  it('names it as an act review, not question NaN', () => {
    /* `q.i + 1` on a recap gives "recap1", which is the kind of detail
       that makes a report look automated and stop being read. */
    const { findings } = qualityOf(withRecaps(0));
    const f = findings.find((x) => x.kind === 'absolute-distractor');
    expect(f.where).toBe('u1 act review');
  });

  it('counts the shipping book at the size the reader actually asks', () => {
    const magi = JSON.parse(readFileSync('src/books/magi/book.json', 'utf8'));
    expect(questionsOf(magi).length).toBe(32);
  });
});

describe('the book as a whole', () => {
  it('notices a part nothing asks about', () => {
    const units = [
      { id: 'u1', stanzas: ['x'], mc: [q(0, ['a', 'b'])] },
      { id: 'u2', stanzas: ['y'] },
    ];
    const { findings } = qualityOf(bookOf(units));
    expect(findings.some((f) => f.kind === 'unasked-part' && f.where === 'u2')).toBe(true);
  });

  it('notices the same question asked twice', () => {
    const units = [
      { id: 'u1', stanzas: ['x'], mc: [q(0, ['a', 'b'], 'Why did she sell it?')] },
      { id: 'u2', stanzas: ['y'], mc: [q(1, ['c', 'd'], 'Why did she sell it?')] },
    ];
    const { findings } = qualityOf(bookOf(units));
    expect(findings.some((f) => f.kind === 'duplicate-question')).toBe(true);
  });

  it('scores a clean book higher than a beatable one', () => {
    const clean = bookOf([
      { id: 'u1', stanzas: ['x'], mc: [0, 1, 2, 3].map((c) => q(c, ['aa', 'bb', 'cc', 'dd'])) },
    ]);
    const beatable = bookOf([
      {
        id: 'u1',
        stanzas: ['x'],
        mc: Array.from({ length: 8 }, () => q(0, ['a long and careful answer', 'no', 'nope'])),
      },
    ]);
    expect(qualityOf(clean).score).toBeGreaterThan(qualityOf(beatable).score);
  });

  it('never throws on rubbish', () => {
    for (const bad of [null, undefined, {}, { units: [null] }, { teaching: { a: null } }]) {
      expect(() => qualityOf(bad)).not.toThrow();
    }
  });

  it('says why, not just what', () => {
    /* The report is read by a person deciding whether to accept a
       generated book. "answer-position" alone tells them nothing. */
    const mc = Array.from({ length: 10 }, () => q(0, ['a', 'b', 'c', 'd']));
    const { findings } = qualityOf(bookOf([{ id: 'u1', stanzas: ['x'], mc }]));
    for (const f of findings) {
      expect(f.why.length, `${f.kind} needs a real reason`).toBeGreaterThan(40);
      expect(f.where).toBeTruthy();
    }
  });
});

describe('against the books that actually exist', () => {
  it('finds the shipped book beatable by position', () => {
    /* This is not a hypothetical. 43% of Magi's answers are option 0,
       against 25% for an even spread, so always answering first scores
       43% without reading. Asserted so that fixing the book is what
       makes this test change, rather than someone quietly deleting it. */
    const magi = JSON.parse(readFileSync('src/books/magi/book.json', 'utf8'));
    const bias = positionBias(questionsOf(magi));
    expect(bias.share).toBeGreaterThan(0.35);
    expect(bias.slot).toBe(0);
  });
});
