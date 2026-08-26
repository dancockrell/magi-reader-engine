import { describe, it, expect } from 'vitest';
import book from '../../books/fixture/index.js';
import { lineFor, blankWord, markWord, wordRe } from './text.js';
import { wordsOf } from './words.js';
import {
  kindsFor,
  pickKind,
  buildQuestion,
  oddSet,
  swapFor,
  distractorsFor,
  selfBetraying,
  shuffle,
} from './kinds.js';

/**
 * The interesting tests here are not the unit ones — they are the sweep
 * at the bottom, which builds every kind of question for every word in
 * the book and asserts the invariants that make a question answerable.
 *
 * It runs against the engine's own fixture book, which was written to
 * carry the shapes that break those invariants: a pair of words that
 * substitute for each other, a glossed phrase of two words, a word
 * explained two different ways in two different parts. A sketch of two
 * units would find none of them.
 *
 * What a fixture cannot prove is that a REAL word list obeys the rules —
 * "craved and coveted are each other's substitutes" was found by
 * sweeping the shipping pack, not by inventing a case. So the same sweep
 * runs against that pack in `books/magi/pack.test.js`, and this one
 * proves the rules exist at all.
 */

/* The app's own word list, not a copy of it. The sweep below is only
   worth anything if it asks questions about exactly the words the
   reader would ask about. */
const items = wordsOf(book).map((i) => ({ ...i, asked: 1 }));
const ctx = { book, swaps: book.swaps, all: items };

/* deterministic rng so a failure can be reproduced */
const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('finding a word in its line', () => {
  it('matches on a word boundary, not inside another word', () => {
    expect(wordRe('mark').test('The flat was unremarkable.')).toBe(false);
    expect(wordRe('mark').test('A mark on the wall.')).toBe(true);
  });

  it('reaches a word wearing a possessive', () => {
    /* Poe writes "my bosom's core" and never writes a bare "bosom", so a
       rule that reads the apostrophe as part of the word decides the
       gloss is for a word the poem does not contain. */
    expect(wordRe('bosom').test("burned into my bosom's core;")).toBe(true);
    expect(wordRe('demon').test('the seeming of a demon’s that is dreaming')).toBe(true);
    expect(wordRe('Jim').test('Jim’s hair was lovely.')).toBe(true);
    /* The plural possessive, where the apostrophe trails the word. Note
       it is "birds" that is glossed, not "bird": the rule matches words,
       it does not stem them. */
    expect(wordRe('birds').test("the birds' eyes")).toBe(true);
    expect(wordRe('bird').test("the birds' eyes")).toBe(false);
  });

  it('still refuses an elision, which looks the same and is not', () => {
    /* "o'er" is one word. The possessive exception is exactly `'s` and a
       trailing `'`; `'e` is neither, so this stays out. */
    expect(wordRe('o').test("the lamp-light gloated o'er,")).toBe(false);
    expect(wordRe('ne').test("and ne'er a word said he")).toBe(false);
    expect(wordRe("o'er").test("the lamp-light gloated o'er,")).toBe(true);
  });

  it('blanks every occurrence, not just the first', () => {
    const out = blankWord('a wick and another wick', 'wick');
    expect(out).toBe('a ______ and another ______');
  });

  it('leaves the possessive standing when it blanks the word', () => {
    /* "my ______'s core" asks for a noun. "my ______ core" has deleted
       the grammar the student would have used to find it. */
    expect(blankWord("burned into my bosom's core;", 'bosom')).toBe(
      "burned into my ______'s core;"
    );
    expect(markWord("burned into my bosom's core;", 'bosom')).toBe(
      "burned into my [bosom]'s core;"
    );
  });

  it('returns null rather than the plain line when the word is absent', () => {
    expect(blankWord('nothing here', 'wick')).toBeNull();
    expect(markWord('nothing here', 'wick')).toBeNull();
  });

  it('finds a real line for every glossed word in the book', () => {
    const missing = items.filter((i) => !lineFor(book, i)).map((i) => i.w);
    expect(missing).toEqual([]);
  });
});

describe('choosing a kind', () => {
  it('offers only recognition on a first meeting', () => {
    const fresh = { ...items[0], asked: 0, hits: 0 };
    expect(kindsFor(ctx, fresh, items)).toEqual(['recognise']);
  });

  it('never repeats the previous kind while another is available', () => {
    const item = items.find((i) => kindsFor(ctx, i, items).length > 1);
    for (let s = 1; s < 60; s++) {
      expect(pickKind(ctx, item, items, 'produce', seeded(s))).not.toBe('produce');
    }
  });

  it('only offers spelling for a single ordinary word', () => {
    const multi = items.find((i) => /\s/.test(i.w));
    if (multi) expect(kindsFor(ctx, multi, items)).not.toContain('spell');
  });

  it('only offers substitution where a substitute is recorded', () => {
    for (const i of items) {
      const has = kindsFor(ctx, i, items).includes('swap');
      expect(has).toBe(Boolean(swapFor(ctx, i) && lineFor(book, i)));
    }
  });
});

describe('substitution cannot have two right answers', () => {
  it('never offers a distractor that is itself a valid substitute', () => {
    const offenders = [];
    for (const item of items) {
      if (!swapFor(ctx, item)) continue;
      for (let s = 1; s < 25; s++) {
        for (const g of distractorsFor(ctx, item, 'swap', 3, seeded(s))) {
          const gw = g.w.toLowerCase();
          if (ctx.swaps[gw] === item.w.toLowerCase()) offenders.push(`${item.w} ← ${g.w}`);
          if (ctx.swaps[item.w.toLowerCase()] === gw) offenders.push(`${item.w} → ${g.w}`);
        }
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });

  it('keeps a pair that substitutes both ways apart', () => {
    /* The fixture glosses `glimmered` and `flickered` and records each
       as the other's substitute, because that is the shape that made a
       real question have two right answers. */
    const item = items.find((i) => i.w.toLowerCase() === 'glimmered');
    expect(item, 'the fixture no longer carries the both-ways pair').toBeTruthy();
    expect(ctx.swaps.glimmered).toBe('flickered');
    expect(ctx.swaps.flickered).toBe('glimmered');
    for (let s = 1; s < 40; s++) {
      const words = distractorsFor(ctx, item, 'swap', 3, seeded(s)).map((g) =>
        g.w.toLowerCase()
      );
      expect(words).not.toContain('flickered');
    }
  });
});

describe('the sweep — every word, every kind it supports', () => {
  it('produces an answerable question every time', () => {
    const problems = [];

    for (const item of items) {
      const kinds = kindsFor(ctx, item, items).filter((k) => k !== 'match');
      for (const kind of kinds) {
        for (let s = 1; s < 6; s++) {
          const q = buildQuestion(ctx, kind, item, items, seeded(s));
          const label = `${kind}/${item.w}/seed${s}`;

          if (!q.prompt && kind !== 'match') problems.push(`${label}: empty prompt`);

          if (kind === 'spell') {
            if (!q.answer) problems.push(`${label}: no answer`);
          } else {
            const correct = q.options.filter((o) => o.ok);
            if (correct.length !== 1)
              problems.push(`${label}: ${correct.length} correct options`);

            const texts = q.options.map((o) => String(o.t).toLowerCase());
            if (new Set(texts).size !== texts.length)
              problems.push(`${label}: duplicate options [${texts}]`);

            if (q.options.some((o) => o.t == null || o.t === ''))
              problems.push(`${label}: blank option`);
          }

          if (selfBetraying(q)) problems.push(`${label}: prompt contains the answer`);
        }
      }
    }

    expect(problems.slice(0, 25)).toEqual([]);
  });

  it('builds a matching round that pairs up exactly', () => {
    for (let s = 1; s < 20; s++) {
      const q = buildQuestion(ctx, 'match', items[0], items, seeded(s));
      expect(q.words).toHaveLength(3);
      expect(q.meanings).toHaveLength(3);
      expect(new Set(q.words).size).toBe(3);
      /* every meaning must belong to exactly one of the words on show */
      for (const m of q.meanings) expect(q.words).toContain(m.w);
    }
  });

  it('offers odd-one-out with a genuine intruder', () => {
    for (let s = 1; s < 30; s++) {
      const set = oddSet(ctx, items[0], items, seeded(s));
      if (!set) continue;
      const group = new Set(set.same.map((x) => x.unit));
      expect(set.same).toHaveLength(3);
      expect(group.has(set.odd.unit)).toBe(
        set.label === 'act' ? group.has(set.odd.unit) : false
      );
    }
  });
});

describe('shuffle', () => {
  it('keeps every element', () => {
    const a = [1, 2, 3, 4, 5];
    expect(shuffle(a, seeded(7)).sort()).toEqual(a);
  });
  it('does not mutate its input', () => {
    const a = [1, 2, 3];
    shuffle(a, seeded(3));
    expect(a).toEqual([1, 2, 3]);
  });
});
