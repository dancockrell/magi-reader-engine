import { describe, it, expect, beforeAll } from 'vitest';
import book from '../../books/fixture/index.js';
import { trackFor, stepTrack, segmentsOf, whereIn, jumpSegment, aimAt } from './track.js';
import { questionsOf, promptsOf } from './assessment.js';
import { beatsOfBook } from './beats.js';

/* The engine's own fixture book. A track is the same three readings
   whatever pack it is built from, and testing it against a title only
   proves it works for that title. */

describe('every reading', () => {
  for (const pass of [1, 2, 3]) {
    it(`reading ${pass} ends with an ending, rather than running out`, () => {
      const t = trackFor(book, pass);
      expect(t[t.length - 1].kind).toBe('end');
      /* exactly one, and only at the end */
      expect(t.filter((s) => s.kind === 'end')).toHaveLength(1);
    });
  }

  it('gives a question about unread material a picture to ask it about', () => {
    /* A question about a part that WAS read aloud follows that part's
       lines, and the picture from the last of them is still on screen.
       The background pages have no lines, so their questions have to
       carry a picture of their own — and until they did, the author page
       and the note on the afterlife showed a black rectangle. */
    const read = new Set(book.units.map((u) => u.id));
    const missing = [];
    let asked = 0;
    for (const pass of [1, 2, 3]) {
      for (const stop of trackFor(book, pass)) {
        if (stop.kind !== 'question' && stop.kind !== 'prompt') continue;
        if (read.has(stop.unit)) continue;
        asked++;
        if (!stop.plate?.src) missing.push(`${pass}:${stop.unit}`);
      }
    }
    expect(missing).toEqual([]);
    expect(asked, 'a book with no background pages would pass too').toBeGreaterThan(0);
  });

  it('has nothing at all to show for a book with nothing in it', () => {
    expect(trackFor({ meta: { title: '' }, units: [] }, 1)).toEqual([]);
  });
});

describe('reading 1', () => {
  it('is the story, and the two of them talking about it', () => {
    const t = trackFor(book, 1);
    expect(t.filter((s) => s.kind === 'line')).toHaveLength(beatsOfBook(book).length);
    expect(t.filter((s) => s.kind === 'say').length).toBeGreaterThan(0);
    expect(t.some((s) => s.kind === 'question' || s.kind === 'prompt')).toBe(false);
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

describe('the one thing to look for', () => {
  /* Every part carries a `watch` line for reading one and a `focus` line
     for reading two. Both were authored, translated into every language
     the picker offers, and described in the printed guide as "before
     each part you are told one thing to look for". Neither had ever been
     rendered anywhere except the guide. */
  it('gives the watch line at the start of a part in reading one', () => {
    const track = trackFor(book, 1);
    const text = aimAt(book, 1, track, 0);
    expect(text).toBeTruthy();
    expect(text).toBe(book.teaching[track[0].unit].watch);
  });

  it('gives the focus line in reading two, not the watch line', () => {
    const track = trackFor(book, 2);
    const first = track.findIndex((s) => s.unit);
    const text = aimAt(book, 2, track, first);
    expect(text).toBe(book.teaching[track[first].unit].focus);
    expect(text).not.toBe(book.teaching[track[first].unit].watch);
  });

  it('says it once per part, not under every line', () => {
    /* Repeating a prompt under every line turns it into wallpaper, and
       the point of aiming attention is that it is aimed once. */
    const track = trackFor(book, 1);
    const shown = track.map((_, i) => aimAt(book, 1, track, i)).filter(Boolean);
    const parts = new Set(track.map((s) => s.unit).filter(Boolean));
    expect(shown).toHaveLength(parts.size);
    expect(new Set(shown).size).toBe(shown.length);
  });

  it('lands on the first stop of each part, wherever that falls', () => {
    const track = trackFor(book, 1);
    for (let i = 0; i < track.length; i++) {
      if (!aimAt(book, 1, track, i)) continue;
      const before = i > 0 ? track[i - 1].unit : null;
      expect(before, `part ${track[i].unit} announced mid-part`).not.toBe(track[i].unit);
    }
  });

  it('says nothing in reading three, which is writing rather than looking', () => {
    const track = trackFor(book, 3);
    expect(track.map((_, i) => aimAt(book, 3, track, i)).filter(Boolean)).toEqual([]);
  });

  it('says nothing for a part that carries no prompt, rather than an empty one', () => {
    const bare = { ...book, teaching: { ...book.teaching } };
    const track = trackFor(book, 1);
    const unit = track[0].unit;
    bare.teaching[unit] = { ...bare.teaching[unit], watch: '   ' };
    expect(aimAt(bare, 1, track, 0)).toBeNull();
  });

  it('never throws on a book or a position that is not there', () => {
    for (const bad of [null, undefined, {}, { teaching: null }]) {
      expect(() => aimAt(bad, 1, [], 0)).not.toThrow();
      expect(aimAt(bad, 1, [], 0)).toBeNull();
    }
    const track = trackFor(book, 1);
    expect(aimAt(book, 1, track, 9999)).toBeNull();
    expect(aimAt(book, 1, null, 0)).toBeNull();
  });
});
