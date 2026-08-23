import { describe, it, expect } from 'vitest';
import { defaults, normalise, load, save, documentState, KEY } from './settings.js';

/**
 * A stored setting is input, not truth.
 *
 * These run on school devices: storage is locked by policy, profiles are
 * wiped between lessons, and thirty students share one browser. Every one
 * of those puts something unexpected in localStorage eventually, and none
 * of them should be able to stop a child reading the book.
 */

/** A localStorage that behaves however a test needs it to. */
function fakeStore(initial = null, { throwOnGet = false, throwOnSet = false } = {}) {
  let value = initial;
  return {
    getItem() {
      if (throwOnGet) throw new DOMException('blocked', 'SecurityError');
      return value;
    },
    setItem(_k, v) {
      if (throwOnSet) throw new DOMException('quota', 'QuotaExceededError');
      value = v;
    },
    removeItem() {
      value = null;
    },
    key: () => null,
    clear() {
      value = null;
    },
    length: 0,
  };
}

describe('reading what is stored', () => {
  it('gives the defaults when there is nothing', () => {
    expect(load(fakeStore(null))).toEqual(defaults());
  });

  it('keeps a valid stored value', () => {
    const store = fakeStore(JSON.stringify({ contrast: true, pace: 1.18 }));
    const s = load(store);
    expect(s.contrast).toBe(true);
    expect(s.pace).toBe(1.18);
  });

  it.each([
    ['not json at all', 'zzz{'],
    ['an array', '[1,2,3]'],
    ['a bare number', '42'],
    ['null', 'null'],
    ['an empty string', ''],
  ])('survives %s', (_label, stored) => {
    expect(() => load(fakeStore(stored))).not.toThrow();
    expect(load(fakeStore(stored))).toEqual(defaults());
  });

  it('discards a value of the wrong shape rather than trusting it', () => {
    const s = normalise({ contrast: 'yes', pace: 'fast', bigText: 1, language: 12 });
    expect(s).toEqual(defaults());
  });

  it('refuses a pace the reader does not offer', () => {
    /* 3x speed came from somewhere; it is not one of ours */
    expect(normalise({ pace: 3 }).pace).toBe(1);
    expect(normalise({ pace: 1.18 }).pace).toBe(1.18);
  });

  it('does not throw when the device blocks storage entirely', () => {
    expect(load(fakeStore(null, { throwOnGet: true }))).toEqual(defaults());
  });
});

describe('writing', () => {
  it('round-trips', () => {
    const store = fakeStore();
    expect(save({ ...defaults(), bigText: true }, store)).toBe(true);
    expect(load(store).bigText).toBe(true);
  });

  it('stores under a versioned key, so an old shape cannot be misread', () => {
    const store = fakeStore();
    save(defaults(), store);
    expect(KEY).toMatch(/\.v\d+$/);
  });

  it('reports failure rather than pretending, when the quota is refused', () => {
    expect(save(defaults(), fakeStore(null, { throwOnSet: true }))).toBe(false);
  });

  it('never writes a value it would refuse to read back', () => {
    const store = fakeStore();
    save({ pace: 99, contrast: 'yes' }, store);
    expect(load(store)).toEqual(defaults());
  });
});

describe('what the document should look like', () => {
  it('is plain by default', () => {
    expect(documentState(defaults()).classes).toEqual([]);
  });

  it('turns each preference into one class', () => {
    const s = documentState({ ...defaults(), contrast: true, bigText: true, ruler: true });
    expect(s.classes).toEqual(['hicontrast', 'bigtext', 'ruler']);
  });

  it('stills motion when the reader asks', () => {
    expect(documentState({ ...defaults(), motion: false }).classes).toContain('stillness');
  });

  it('stills motion when the operating system already asked', () => {
    /* someone who has set this at the OS level has answered the question
       once; they should not have to answer it again here */
    const s = documentState(defaults(), { reducedMotion: true });
    expect(s.classes).toContain('stillness');
  });

  it('carries the language and the pace', () => {
    const s = documentState({ ...defaults(), language: 'ko', pace: 0.85, sound: false });
    expect(s.lang).toBe('ko');
    expect(s.rate).toBe(0.85);
    expect(s.muted).toBe(true);
  });

  it('reports no language rather than an empty one', () => {
    expect(documentState(defaults()).lang).toBeNull();
  });
});
