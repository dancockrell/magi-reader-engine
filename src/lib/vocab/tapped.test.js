import { describe, it, expect } from 'vitest';
import { loadTapped, saveTapped, tap, clearTapped, practiceSet, LIMIT } from './tapped.js';

/**
 * The promise being kept here: the words you tap are the words that come
 * back. Three places in the app said so and nothing did it.
 */

/* The same shape the other store tests use: a real Storage has length,
   key and clear, and leaving them off makes this fail typechecking while
   passing at runtime. */
function fakeStore(behaviour = 'ok') {
  const map = new Map();
  return {
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    clear: () => map.clear(),
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => {
      if (behaviour !== 'ok') throw new Error('QuotaExceededError');
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
    _map: map,
  };
}

const words = (list) => list.map((w) => ({ w }));

describe('recording a tap', () => {
  it('keeps the order they were tapped in', () => {
    let t = [];
    for (const w of ['hair', 'coax', 'shabby']) t = tap(t, w);
    expect(t).toEqual(['hair', 'coax', 'shabby']);
  });

  it('moves a repeat to the end rather than ignoring it', () => {
    /* Tapping the same word three times is a student saying something.
       A Set that kept the first occurrence would throw that away. */
    let t = ['hair', 'coax', 'shabby'];
    t = tap(t, 'hair');
    expect(t).toEqual(['coax', 'shabby', 'hair']);
  });

  it('treats punctuation and case as the same word', () => {
    /* "cents." and "Cents" are what a tap actually delivers, because the
       token comes out of a sentence. */
    let t = [];
    t = tap(t, 'Cents.');
    t = tap(t, 'cents');
    expect(t).toEqual(['cents']);
  });

  it('keeps a curly apostrophe and a straight one together', () => {
    let t = tap([], 'It’ll');
    t = tap(t, "it'll");
    expect(t).toEqual(["it'll"]);
  });

  it('ignores a tap on nothing', () => {
    expect(tap(['hair'], '')).toEqual(['hair']);
    expect(tap(['hair'], '   ')).toEqual(['hair']);
    expect(tap(['hair'], null)).toEqual(['hair']);
  });

  it('forgets the oldest once it is full, rather than growing forever', () => {
    let t = [];
    for (let i = 0; i < LIMIT + 20; i++) t = tap(t, `w${i}`);
    expect(t).toHaveLength(LIMIT);
    expect(t[0]).toBe('w20');
    expect(t[t.length - 1]).toBe(`w${LIMIT + 19}`);
  });
});

describe('keeping them between visits', () => {
  it('round trips, per book', () => {
    const s = fakeStore();
    saveTapped('magi', ['hair', 'coax'], s);
    saveTapped('raven', ['pallid'], s);
    expect(loadTapped('magi', s)).toEqual(['hair', 'coax']);
    expect(loadTapped('raven', s)).toEqual(['pallid']);
  });

  it('gives back nothing rather than throwing on rubbish', () => {
    const s = fakeStore();
    s._map.set('reader.tapped.v1.magi', '{not json');
    expect(loadTapped('magi', s)).toEqual([]);
    s._map.set('reader.tapped.v1.magi', '{"not":"an array"}');
    expect(loadTapped('magi', s)).toEqual([]);
  });

  it('survives a locked store, because a school device may have one', () => {
    const s = fakeStore('locked');
    expect(saveTapped('magi', ['hair'], s)).toBe(false);
    expect(loadTapped('magi', s)).toEqual([]);
  });

  it('clears', () => {
    const s = fakeStore();
    saveTapped('magi', ['hair'], s);
    clearTapped('magi', s);
    expect(loadTapped('magi', s)).toEqual([]);
  });
});

describe('what actually gets practised', () => {
  const all = words(['hair', 'coax', 'shabby', 'coveted', 'craved']);

  it('is the tapped words, newest first', () => {
    /* The word looked up two minutes ago is the one still being worked
       out, so it comes back first. */
    expect(practiceSet(all, ['hair', 'coax', 'shabby']).map((i) => i.w)).toEqual([
      'shabby',
      'coax',
      'hair',
    ]);
  });

  it('is the whole glossary when nothing has been tapped', () => {
    /* An empty practice screen is worse than an unfocused one, and a
       student who opens the trainer before reading has still asked to
       practise. */
    expect(practiceSet(all, [])).toBe(all);
  });

  it('drops a tapped word the book no longer glosses, rather than inventing one', () => {
    const set = practiceSet(all, ['hair', 'notaword']);
    expect(set.map((i) => i.w)).toEqual(['hair']);
  });

  it('falls back to the whole glossary if none of the taps still exist', () => {
    expect(practiceSet(all, ['gone', 'alsogone'])).toBe(all);
  });

  it('never returns a word that is not in the glossary', () => {
    const set = practiceSet(all, ['hair', 'ghost', 'coax']);
    for (const item of set) expect(all).toContain(item);
  });
});
