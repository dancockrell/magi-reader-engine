import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import book from './index.js';
import { beatsOfBook } from '../../lib/reader/beats.js';
import { wordsByClip } from '../../lib/media/vtt.js';
import { wordsOf } from '../../lib/vocab/words.js';
import { validateBook } from '../../lib/book/validate.js';
import {
  kindsFor,
  buildQuestion,
  selfBetraying,
  distractorsFor,
} from '../../lib/vocab/kinds.js';

/**
 * Facts about the bundled Gift of the Magi pack.
 *
 * Narration MP3s are deployment assets copied into `public/magi-audio`
 * by the packaging pipeline; they are intentionally not committed to the
 * source repository. CI therefore checks the committed contract it can
 * actually prove: every story line has a cue, the pack points at relative
 * media locations, every named picture exists, and its real vocabulary
 * can produce valid practice questions.
 */

const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('the narration contract', () => {
  const cues = wordsByClip(readFileSync('public/cues/magi.vtt', 'utf8'));
  const beats = beatsOfBook(book);

  it('has a cue for every narrated story line', () => {
    const missing = beats.filter((beat) => !cues[beat.clip]?.length).map((beat) => beat.clip);
    expect(missing).toEqual([]);
  });

  it('checks a real amount of narration rather than passing vacuously', () => {
    expect(beats.length).toBeGreaterThan(100);
    expect(Object.keys(cues).length).toBeGreaterThan(beats.length);
  });

  it('keeps its deployment media paths relative', () => {
    expect(book.media.audio).toBeTruthy();
    expect(book.media.cues).toBeTruthy();
    for (const path of [book.media.audio, book.media.cues]) {
      expect(path.startsWith('/'), path).toBe(false);
      expect(path.startsWith('http'), path).toBe(false);
    }
  });
});

describe('every picture this pack names is on disk', () => {
  it('finds the plate for every scene', () => {
    const named = [...new Set(beatsOfBook(book).map((beat) => beat.plate.src))];
    expect(
      named.length,
      'no plates were checked, so the check below proves nothing'
    ).toBeGreaterThan(5);
    const missing = named.filter((src) => !src || !existsSync(`public/${src}`));
    expect(missing).toEqual([]);
  });
});

describe('this pack’s own word list can be practised', () => {
  const items = wordsOf(book).map((item) => ({ ...item, asked: 1 }));
  const ctx = { book, swaps: book.swaps, all: items };

  it('agrees with the contract about how many words the trainer gets', () => {
    expect(wordsOf(book).length).toBe(validateBook(book).wordCount);
  });

  it('produces an answerable question for every word and every kind', () => {
    const problems = [];
    for (const item of items) {
      for (const kind of kindsFor(ctx, item, items).filter((value) => value !== 'match')) {
        for (let seed = 1; seed < 6; seed++) {
          const question = buildQuestion(ctx, kind, item, items, seeded(seed));
          const label = `${kind}/${item.w}/seed${seed}`;

          if (!question.prompt) problems.push(`${label}: empty prompt`);
          if (kind === 'spell') {
            if (!question.answer) problems.push(`${label}: no answer`);
          } else {
            const correct = question.options.filter((option) => option.ok);
            if (correct.length !== 1) problems.push(`${label}: ${correct.length} correct options`);
            const texts = question.options.map((option) => String(option.t).toLowerCase());
            if (new Set(texts).size !== texts.length) {
              problems.push(`${label}: duplicate options [${texts}]`);
            }
          }
          if (selfBetraying(question)) problems.push(`${label}: prompt contains the answer`);
        }
      }
    }
    expect(problems.slice(0, 25)).toEqual([]);
  });

  it('specifically keeps craved and coveted apart', () => {
    const craved = items.find((item) => item.w.toLowerCase() === 'craved');
    expect(craved, 'the pack no longer glosses craved').toBeTruthy();
    for (let seed = 1; seed < 40; seed++) {
      const words = distractorsFor(ctx, craved, 'swap', 3, seeded(seed)).map((item) =>
        item.w.toLowerCase()
      );
      expect(words).not.toContain('coveted');
    }
  });
});
