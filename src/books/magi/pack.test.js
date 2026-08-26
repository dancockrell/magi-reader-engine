import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import book from './index.js';
import { beatsOfBook } from '../../lib/reader/beats.js';
import { wordsByClip } from '../../lib/media/vtt.js';
import {
  preshowRun,
  helloRun,
  passIntroRun,
  talkFor,
  reactionsFor,
} from '../../lib/speech/script.js';
import { wordsOf } from '../../lib/vocab/words.js';
import { validateBook } from '../../lib/book/validate.js';
import {
  kindsFor,
  buildQuestion,
  selfBetraying,
  distractorsFor,
} from '../../lib/vocab/kinds.js';

/**
 * What is true of THIS pack, and of no other.
 *
 * The engine's own tests moved to `books/fixture` so that the engine
 * could be tested without a title. What could not move is anything that
 * asks a question about this pack's own contents: whether its 519
 * recordings are on disk, whether its cue file names every clip, whether
 * its real word list can be quizzed without producing a question with
 * two right answers.
 *
 * Those are pack facts, so they live with the pack. When
 * `src/books/magi/` becomes its own repository this file goes with it,
 * and the engine repository loses nothing it was relying on.
 *
 * The sweeps below deliberately repeat rules the fixture also checks.
 * That is not duplication for its own sake: the fixture proves the rule
 * is implemented, and this proves this book obeys it. A generated pack
 * can break the second without touching the first.
 */

/* Deterministic, so a failure names a seed somebody can reproduce. */
const seeded = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('every recording this pack names is on disk', () => {
  /* A line whose clip is missing is silent, and silence is the one
     failure nobody reports — a student assumes the sound is off. */

  const clips = new Set(
    readdirSync('public/magi-audio')
      .filter((f) => f.endsWith('.mp3'))
      .map((f) => f.replace(/\.mp3$/, ''))
  );

  /* All cues live in one WebVTT file — 519 separate ones put the build
     over itch's 1000-file limit and the upload was rejected. */
  const cues = wordsByClip(readFileSync('public/cues/magi.vtt', 'utf8'));

  /** Every line the two of them speak, outside the narration. */
  const spoken = () => {
    const out = [...preshowRun(book), ...helloRun(book)];
    for (const p of [1, 2, 3]) out.push(...passIntroRun(book, p));
    for (const id of [...book.units.map((u) => u.id), ...Object.keys(book.info)]) {
      out.push(...talkFor(book, id));
      out.push(...reactionsFor(book, id).values());
    }
    return out;
  };

  it('has an mp3 and a cue for every beat of the story', () => {
    /* The clips were produced against the old reader's line numbering.
       If that drifts, a student gets a silent page and nothing says why. */
    const missingAudio = [];
    const missingCues = [];
    for (const b of beatsOfBook(book)) {
      if (!existsSync(`public/magi-audio/${b.clip}.mp3`)) missingAudio.push(b.clip);
      if (!cues[b.clip]?.length) missingCues.push(b.clip);
    }
    expect({ missingAudio, missingCues }).toEqual({ missingAudio: [], missingCues: [] });
  });

  it('has an mp3 and a cue for every line the guides speak', () => {
    const missingAudio = spoken()
      .filter((t) => !clips.has(t.clip))
      .map((t) => t.clip);
    const missingCues = spoken()
      .filter((t) => !cues[t.clip]?.length)
      .map((t) => t.clip);
    expect({ missingAudio, missingCues }).toEqual({ missingAudio: [], missingCues: [] });
  });

  it('covers a real number of clips, so the checks above are not vacuous', () => {
    expect(beatsOfBook(book).length).toBeGreaterThan(100);
    expect(spoken().length).toBeGreaterThan(50);
  });
});

describe('every picture this pack names is on disk', () => {
  it('finds the plate for every scene', () => {
    const missing = [...new Set(beatsOfBook(book).map((b) => b.plate.src))].filter(
      (src) => !src || !existsSync(`public/${src}`)
    );
    expect(missing).toEqual([]);
  });
});

describe('this pack’s own word list can be quizzed', () => {
  /* The fixture proves the rules hold. This proves the sixty-odd real
     words obey them — which is where "craved and coveted are each
     other's substitutes" was found, and no toy fixture would have. */
  const items = wordsOf(book).map((i) => ({ ...i, asked: 1 }));
  const ctx = { book, swaps: book.swaps, all: items };

  it('agrees with the contract about how many words the trainer gets', () => {
    expect(wordsOf(book).length).toBe(validateBook(book).wordCount);
  });

  it('produces an answerable question for every word and every kind', () => {
    const problems = [];
    for (const item of items) {
      for (const kind of kindsFor(ctx, item, items).filter((k) => k !== 'match')) {
        for (let s = 1; s < 6; s++) {
          const q = buildQuestion(ctx, kind, item, items, seeded(s));
          const label = `${kind}/${item.w}/seed${s}`;

          if (!q.prompt) problems.push(`${label}: empty prompt`);
          if (kind === 'spell') {
            if (!q.answer) problems.push(`${label}: no answer`);
          } else {
            const correct = q.options.filter((o) => o.ok);
            if (correct.length !== 1)
              problems.push(`${label}: ${correct.length} correct options`);
            const texts = q.options.map((o) => String(o.t).toLowerCase());
            if (new Set(texts).size !== texts.length)
              problems.push(`${label}: duplicate options [${texts}]`);
          }
          if (selfBetraying(q)) problems.push(`${label}: prompt contains the answer`);
        }
      }
    }
    expect(problems.slice(0, 25)).toEqual([]);
  });

  it('specifically keeps craved and coveted apart', () => {
    /* The two words substitute for each other, so neither may be a wrong
       answer for the other: the question would have two right answers
       and would punish the student who knew both. */
    const craved = items.find((i) => i.w.toLowerCase() === 'craved');
    expect(craved, 'the pack no longer glosses craved').toBeTruthy();
    for (let s = 1; s < 40; s++) {
      const words = distractorsFor(ctx, craved, 'swap', 3, seeded(s)).map((g) =>
        g.w.toLowerCase()
      );
      expect(words).not.toContain('coveted');
    }
  });
});
