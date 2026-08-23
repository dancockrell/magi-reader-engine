import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { beatsOf, beatsOfBook, linesOf, step } from './beats.js';
import { wordsByClip } from '../media/vtt.js';

let book;

beforeAll(() => {
  book = JSON.parse(readFileSync('src/books/magi/book.json', 'utf8'));
});

describe('cutting a unit into beats', () => {
  it('produces one beat per line of the story', () => {
    const u = book.units[0];
    expect(beatsOf(u)).toHaveLength(linesOf(u).length);
  });

  it('strips the gloss markup from what is shown', () => {
    const u = book.units[0];
    for (const b of beatsOf(u)) {
      expect(b.line).not.toMatch(/[{}|]/);
    }
  });

  it('numbers clips across the whole unit, not per stanza', () => {
    const u = book.units.find((x) => (x.stanzas || []).length > 1);
    const beats = beatsOf(u);
    expect(beats.map((b) => b.clip)).toEqual(beats.map((_, i) => `n_${u.id}_${i}`));
  });

  it('resolves the picture through the plate map, since art is content-addressed', () => {
    const u = book.units[0];
    const [first] = beatsOf(u, { plates: book.plates });
    expect(first.plate.src).toBe(book.plates[u.scene || u.id]);
    expect(first.plate.src).toMatch(/^art\/[0-9a-f]{16}\.webp$/);
  });

  it('never produces a path anchored at the domain root', () => {
    /* itch serves from a nested path; a leading slash 404s every
       picture there while working perfectly on a dev server */
    for (const b of beatsOfBook(book)) {
      expect(b.plate.src?.startsWith('/')).toBe(false);
    }
  });

  it('uses the book’s own caption as alt text, not a generic label', () => {
    const [first] = beatsOf(book.units[0], { plates: book.plates });
    expect(first.plate.alt).toBe(book.units[0].caption || book.units[0].title);
    expect(first.plate.alt).not.toMatch(/^(image|illustration|picture)$/i);
  });

  it('reports no picture rather than inventing a path that will 404', () => {
    const [first] = beatsOf(book.units[0], { plates: {} });
    expect(first.plate.src).toBeNull();
  });

  it('every scene in the book has a picture on disk', () => {
    const beats = beatsOfBook(book);
    const missing = [...new Set(beats.map((b) => b.plate.src))].filter(
      (src) => !src || !existsSync(`public/${src}`)
    );
    expect(missing).toEqual([]);
  });

  it('survives a malformed unit rather than throwing', () => {
    for (const bad of [null, undefined, {}, { id: 'x' }, { id: 'x', stanzas: [] }]) {
      expect(() => beatsOf(bad)).not.toThrow();
    }
    expect(beatsOf(null)).toEqual([]);
  });
});

describe('every beat has the recording it names', () => {
  /* The 519 clips were produced against the old reader's line numbering.
     If this drifts, a student gets a silent page and nothing says why. */
  it('finds an mp3 and a cue for every beat in the book', () => {
    const beats = beatsOfBook(book);
    /* All cues live in one WebVTT file — 519 separate ones put the build
       over itch's 1000-file limit and the upload was rejected. */
    const cues = wordsByClip(readFileSync('public/cues/magi.vtt', 'utf8'));
    const missingAudio = [];
    const missingCues = [];
    for (const b of beats) {
      if (!existsSync(`public/magi-audio/${b.clip}.mp3`)) missingAudio.push(b.clip);
      if (!cues[b.clip]?.length) missingCues.push(b.clip);
    }
    expect({ missingAudio, missingCues }).toEqual({ missingAudio: [], missingCues: [] });
  });

  it('covers a real number of beats, so the check above is not vacuous', () => {
    expect(beatsOfBook(book).length).toBeGreaterThan(100);
  });

  it('marks a beat silent when the recording is absent', () => {
    const [b] = beatsOf(book.units[0], { hasClip: () => false });
    expect(b.clip).toBeNull();
  });
});

describe('moving between beats', () => {
  const beats = [{ i: 0 }, { i: 1 }, { i: 2 }];

  it('advances and goes back', () => {
    expect(step(beats, 0, 1)).toBe(1);
    expect(step(beats, 2, -1)).toBe(1);
  });

  it('clamps rather than running off either end', () => {
    expect(step(beats, 0, -1)).toBe(0);
    expect(step(beats, 2, 1)).toBe(2);
  });

  it('recovers from a nonsense index instead of blanking the page', () => {
    /* a stale saved position used to be read straight into the render
       and threw before anything was drawn */
    for (const bad of [NaN, undefined, null, 999, -50, 1.7]) {
      const n = step(beats, bad, 0);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(beats.length);
    }
  });

  it('handles an empty book', () => {
    expect(step([], 0, 1)).toBe(0);
  });
});
