import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { trackFor, stepTrack, segmentsOf, whereIn, jumpSegment } from './track.js';
import { questionsOf, promptsOf } from './assessment.js';
import { beatsOfBook } from './beats.js';

let book;
beforeAll(() => {
  book = JSON.parse(readFileSync('src/books/magi/book.json', 'utf8'));
});

describe('reading 1', () => {
  it('is the story and nothing else', () => {
    const t = trackFor(book, 1);
    expect(t.every((s) => s.kind === 'line')).toBe(true);
    expect(t).toHaveLength(beatsOfBook(book).length);
  });
});

describe('reading 2', () => {
  it('is the story with every question in it', () => {
    const t = trackFor(book, 2);
    const asked = t.filter((s) => s.kind === 'question');
    expect(asked).toHaveLength(questionsOf(book).length);
    expect(t.filter((s) => s.kind === 'prompt')).toHaveLength(0);
  });

  it('asks about a segment only after it has been read', () => {
    const t = trackFor(book, 2);
    for (const stop of t) {
      if (stop.kind !== 'question') continue;
      const lines = t.filter((s) => s.kind === 'line' && s.unit === stop.unit);
      if (!lines.length) continue; // background notes, which are not read
      expect(lines[lines.length - 1].at).toBeLessThan(stop.at);
    }
  });

  it('loses no question, even one about material that is not read aloud', () => {
    const ids = new Set(
      trackFor(book, 2)
        .filter((s) => s.kind === 'question')
        .map((s) => s.question.id)
    );
    for (const q of questionsOf(book)) expect(ids.has(q.id)).toBe(true);
  });
});

describe('reading 3', () => {
  it('is the story with every written prompt in it', () => {
    const t = trackFor(book, 3);
    expect(t.filter((s) => s.kind === 'prompt')).toHaveLength(promptsOf(book).length);
    expect(t.filter((s) => s.kind === 'question')).toHaveLength(0);
  });
});

describe('the position', () => {
  it('numbers every stop, once, in order', () => {
    const t = trackFor(book, 2);
    expect(t.map((s) => s.at)).toEqual(t.map((_, i) => i));
  });

  it('refuses to produce a position that is not on the track', () => {
    const t = trackFor(book, 1);
    expect(stepTrack(t, -50, 0)).toBe(0);
    expect(stepTrack(t, 99999, 0)).toBe(t.length - 1);
    expect(stepTrack(t, NaN, 1)).toBe(0);
    expect(stepTrack([], 4, 1)).toBe(0);
  });
});

describe('the storyboard', () => {
  it('has one entry per segment, covering the whole track with no gap', () => {
    const t = trackFor(book, 2);
    const segs = segmentsOf(t, book);

    expect(segs.length).toBe(new Set(t.map((s) => s.unit)).size);
    expect(segs[0].from).toBe(0);
    expect(segs[segs.length - 1].to).toBe(t.length - 1);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].from, 'segments run end to end').toBe(segs[i - 1].to + 1);
    }
  });

  it('carries a picture and a title, because that is what is navigable', () => {
    const segs = segmentsOf(trackFor(book, 1), book);
    expect(segs.every((s) => s.title)).toBe(true);
    expect(segs.filter((s) => s.plate?.src).length).toBeGreaterThan(segs.length * 0.8);
  });

  it('counts what is in each segment', () => {
    const segs = segmentsOf(trackFor(book, 2), book);
    const asks = segs.reduce((n, s) => n + s.asks, 0);
    expect(asks).toBe(questionsOf(book).length);
  });

  it('says where a position is', () => {
    const t = trackFor(book, 1);
    const segs = segmentsOf(t, book);
    expect(whereIn(segs, 0)).toMatchObject({ index: 0, through: 1 });

    const second = segs[1];
    expect(whereIn(segs, second.from).segment.id).toBe(second.id);
    expect(whereIn(segs, second.to)).toMatchObject({ through: second.to - second.from + 1 });
    expect(whereIn(segs, t.length - 1).index).toBe(segs.length - 1);
  });
});

describe('jumping by segment', () => {
  let t, segs;
  beforeAll(() => {
    t = trackFor(book, 1);
    segs = segmentsOf(t, book);
  });

  it('goes to the top of the next one', () => {
    expect(jumpSegment(segs, segs[0].from, 1)).toBe(segs[1].from);
  });

  it('back from partway through restarts this segment, not the last one', () => {
    /* what the back button on a music player does */
    const mid = segs[2].from + 1;
    expect(jumpSegment(segs, mid, -1)).toBe(segs[2].from);
  });

  it('back from the very top of a segment goes to the previous one', () => {
    expect(jumpSegment(segs, segs[2].from, -1)).toBe(segs[1].from);
  });

  it('does not run off either end', () => {
    expect(jumpSegment(segs, 0, -1)).toBe(0);
    const last = segs[segs.length - 1];
    expect(jumpSegment(segs, last.from, 1)).toBe(last.from);
  });
});
