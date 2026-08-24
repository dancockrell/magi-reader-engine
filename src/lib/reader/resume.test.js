import { describe, it, expect } from 'vitest';
import { rememberWhere, whereLeftOff, forgetWhere, throughOf } from './resume.js';

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

describe('carrying on', () => {
  it('remembers where the reader was', () => {
    const s = fakeStore();
    rememberWhere('magi', { pass: 2, at: 40, of: 272 }, s);
    expect(whereLeftOff('magi', s)).toMatchObject({ pass: 2, at: 40, of: 272 });
  });

  it('does not offer to carry on from the very beginning', () => {
    /* a gate that says "carry on" at stop one looks like it remembers
       something it does not */
    const s = fakeStore();
    rememberWhere('magi', { pass: 1, at: 0, of: 317 }, s);
    expect(whereLeftOff('magi', s)).toBeNull();
  });

  it('does not offer to carry on from the end', () => {
    const s = fakeStore();
    rememberWhere('magi', { pass: 1, at: 316, of: 317 }, s);
    expect(whereLeftOff('magi', s), 'nowhere to carry on to').toBeNull();
  });

  it('keeps one place, not three', () => {
    /* a student is reading the book; three half-finished places to
       resume is a decision they should not be handed at the door */
    const s = fakeStore();
    rememberWhere('magi', { pass: 1, at: 40, of: 317 }, s);
    rememberWhere('magi', { pass: 3, at: 12, of: 258 }, s);
    expect(whereLeftOff('magi', s).pass).toBe(3);
  });

  it('is forgotten when the reader says start again', () => {
    const s = fakeStore();
    rememberWhere('magi', { pass: 2, at: 40, of: 272 }, s);
    forgetWhere('magi', s);
    expect(whereLeftOff('magi', s)).toBeNull();
  });

  it('keeps books apart', () => {
    const s = fakeStore();
    rememberWhere('magi', { pass: 2, at: 40, of: 272 }, s);
    expect(whereLeftOff('other', s)).toBeNull();
  });
});

describe('what is in the store is input, not truth', () => {
  it('refuses anything it did not write', () => {
    const s = fakeStore();
    const junk = [
      'not json',
      'null',
      '[]',
      '"a string"',
      JSON.stringify({ pass: 9, at: 4, of: 10 }),
      JSON.stringify({ pass: 1, at: -3, of: 10 }),
      JSON.stringify({ pass: 1, at: 4, of: 0 }),
      JSON.stringify({ pass: 1, at: 4.5, of: 10 }),
      JSON.stringify({ pass: 1, at: 99, of: 10 }),
    ];
    for (const bad of junk) {
      s._map.set('raven.where.v1.magi', bad);
      expect(whereLeftOff('magi', s), bad).toBeNull();
    }
  });

  it('does not take the gate down with it', () => {
    expect(whereLeftOff('magi', fakeStore('full'))).toBeNull();
    expect(rememberWhere('magi', { pass: 1, at: 2, of: 9 }, fakeStore('full'))).toBe(false);
  });
});

describe('how far through, for the panel to say', () => {
  it('reads as a percentage a person would recognise', () => {
    expect(throughOf({ at: 157, of: 317 })).toBe(50);
    expect(throughOf({ at: 0, of: 317 }), 'never zero — they have read something').toBe(1);
    expect(throughOf(null)).toBe(0);
  });
});
