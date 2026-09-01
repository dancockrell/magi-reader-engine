import { describe, it, expect, beforeAll } from 'vitest';
import book from '../../books/fixture/index.js';
import { storyTrack, stepTrack, segmentsOf, whereIn, jumpSegment } from './track.js';
import { beatsOfBook } from './beats.js';

describe('the solo story track', () => {
  it('contains every story line once and then one ending', () => {
    const track = storyTrack(book);
    const lines = track.filter((stop) => stop.kind === 'line');
    expect(lines).toHaveLength(beatsOfBook(book).length);
    expect(track[track.length - 1].kind).toBe('end');
    expect(track.filter((stop) => stop.kind === 'end')).toHaveLength(1);
    expect(track.map((stop) => stop.at)).toEqual(track.map((_, index) => index));
  });

  it('contains no classroom or mid-story interruption stops', () => {
    const kinds = new Set(storyTrack(book).map((stop) => stop.kind));
    expect([...kinds].sort()).toEqual(['end', 'line']);
  });

  it('ignores legacy teaching data even when the pack still carries it', () => {
    const noisy = {
      ...book,
      teaching: { injected: { watch: 'interrupt me' } },
      dialogue: { injected: [{ who: 'wren', text: 'interrupt me' }] },
      wrenReactions: { injected: [{ at: 0, line: 'interrupt me' }] },
    };
    expect(storyTrack(noisy)).toEqual(storyTrack(book));
  });

  it('has nothing to show for an empty book', () => {
    expect(storyTrack({ meta: { title: '' }, units: [] })).toEqual([]);
  });
});

describe('the position', () => {
  it('clamps bad positions onto the actual track', () => {
    const track = storyTrack(book);
    expect(stepTrack(track, -50, 0)).toBe(0);
    expect(stepTrack(track, 99999, 0)).toBe(track.length - 1);
    expect(stepTrack(track, NaN, 1)).toBe(0);
    expect(stepTrack([], 4, 1)).toBe(0);
  });
});

describe('the storyboard', () => {
  it('has one entry per story unit and stops before the ending', () => {
    const track = storyTrack(book);
    const segments = segmentsOf(track, book);
    const storyStops = track.filter((stop) => stop.kind !== 'end');

    expect(segments.length).toBe(new Set(storyStops.map((stop) => stop.unit)).size);
    expect(segments[0].from).toBe(0);
    expect(segments[segments.length - 1].to).toBe(storyStops[storyStops.length - 1].at);
    for (let index = 1; index < segments.length; index++) {
      expect(segments[index].from, 'segments run end to end').toBe(segments[index - 1].to + 1);
    }
  });

  it('carries a picture and title because that is what a reader navigates by', () => {
    const segments = segmentsOf(storyTrack(book), book);
    expect(segments.every((segment) => segment.title)).toBe(true);
    expect(segments.filter((segment) => segment.plate?.src).length).toBeGreaterThan(
      segments.length * 0.8
    );
  });

  it('counts only literary lines inside a story segment', () => {
    const track = storyTrack(book);
    const segments = segmentsOf(track, book);
    expect(segments.reduce((count, segment) => count + segment.lines, 0)).toBe(
      beatsOfBook(book).length
    );
    expect(segments.every((segment) => segment.said === 0 && segment.asks === 0)).toBe(true);
  });

  it('locates story positions and deliberately leaves the ending outside the storyboard', () => {
    const track = storyTrack(book);
    const segments = segmentsOf(track, book);
    expect(whereIn(segments, 0)).toMatchObject({ index: 0, through: 1 });

    const second = segments[1];
    expect(whereIn(segments, second.from).segment.id).toBe(second.id);
    expect(whereIn(segments, second.to)).toMatchObject({ through: second.to - second.from + 1 });

    const lastStory = track.length - 2;
    expect(whereIn(segments, lastStory).index).toBe(segments.length - 1);
    expect(whereIn(segments, track.length - 1)).toMatchObject({ index: -1, segment: null });
  });
});

describe('jumping by story segment', () => {
  let segments;

  beforeAll(() => {
    segments = segmentsOf(storyTrack(book), book);
  });

  it('goes to the top of the next segment', () => {
    expect(jumpSegment(segments, segments[0].from, 1)).toBe(segments[1].from);
  });

  it('back from partway through restarts the current segment', () => {
    const mid = segments[2].from + 1;
    expect(jumpSegment(segments, mid, -1)).toBe(segments[2].from);
  });

  it('back from the top goes to the previous segment', () => {
    expect(jumpSegment(segments, segments[2].from, -1)).toBe(segments[1].from);
  });

  it('does not run off either end', () => {
    expect(jumpSegment(segments, 0, -1)).toBe(0);
    const last = segments[segments.length - 1];
    expect(jumpSegment(segments, last.from, 1)).toBe(last.from);
  });
});
