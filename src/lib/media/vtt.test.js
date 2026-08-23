import { describe, it, expect } from 'vitest';
import { stamp, unstamp, cueFor, toVtt, wordsFromVtt, wordAt, escapeCueText } from './vtt.js';

/* the real first line of the book, with its real timings */
const ONE_DOLLAR = [
  { t: 100, w: 'One' },
  { t: 477, w: 'dollar' },
  { t: 816, w: 'and' },
  { t: 985, w: 'eighty-seven' },
  { t: 1584, w: 'cents' },
];

describe('timestamps', () => {
  it.each([
    [0, '00:00:00.000'],
    [100, '00:00:00.100'],
    [1584, '00:00:01.584'],
    [61_000, '00:01:01.000'],
    [3_723_456, '01:02:03.456'],
  ])('%i ms → %s', (ms, text) => {
    expect(stamp(ms)).toBe(text);
  });

  it('round-trips', () => {
    for (const ms of [0, 1, 999, 1584, 60_000, 3_723_456]) {
      expect(unstamp(stamp(ms))).toBe(ms);
    }
  });

  it('accepts the mm:ss.fff short form the spec allows', () => {
    expect(unstamp('01:01.500')).toBe(61_500);
  });

  it('rejects nonsense rather than guessing', () => {
    for (const bad of ['', 'later', '1:2', '00:00:00', '00:00:00.']) {
      expect(unstamp(bad)).toBeNull();
    }
  });

  it('never emits a negative or fractional stamp', () => {
    expect(stamp(-500)).toBe('00:00:00.000');
    expect(stamp(1234.7)).toBe('00:00:01.235');
  });
});

describe('a cue with word timings', () => {
  it('is valid WebVTT with inline timestamps', () => {
    const vtt = toVtt(ONE_DOLLAR);
    expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
    expect(vtt).toContain('00:00:00.100 --> ');
    expect(vtt).toContain('<00:00:00.477>dollar');
    expect(vtt).toContain('<00:00:01.584>cents');
  });

  it('does not repeat the cue start on the first word', () => {
    const vtt = toVtt(ONE_DOLLAR);
    const body = vtt.split('\n').at(-2);
    expect(body.startsWith('One ')).toBe(true);
  });

  it('ends after the last word rather than on it', () => {
    const vtt = toVtt(ONE_DOLLAR);
    const end = unstamp(vtt.match(/--> (\S+)/)[1]);
    expect(end).toBeGreaterThan(1584);
  });

  it('honours an explicit end from the audio duration', () => {
    const vtt = toVtt(ONE_DOLLAR, { endMs: 9000 });
    expect(vtt).toContain('--> 00:00:09.000');
  });

  it('survives an empty or broken clip without producing a corrupt file', () => {
    expect(cueFor([])).toBe('');
    expect(cueFor(null)).toBe('');
    expect(cueFor([{ w: 'no time' }])).toBe('');
  });
});

describe('text that would corrupt the file', () => {
  it('neutralises an arrow inside cue text', () => {
    /* "-->" in the body would be read as a second cue header */
    expect(escapeCueText('she said --> then left')).not.toContain('-->');
  });

  it('never lets a blank line split one cue into two', () => {
    expect(escapeCueText('first\n\n\nsecond')).toBe('first\nsecond');
  });

  it('produces a file with exactly one cue even for hostile text', () => {
    const vtt = toVtt([
      { t: 0, w: 'a' },
      { t: 100, w: '-->' },
      { t: 200, w: 'b' },
    ]);
    expect(vtt.match(/-->/g)).toHaveLength(1);
  });
});

describe('round trip', () => {
  it('recovers every word and its time', () => {
    expect(wordsFromVtt(toVtt(ONE_DOLLAR))).toEqual(ONE_DOLLAR);
  });

  it('recovers a single-word clip', () => {
    const one = [{ t: 250, w: 'Sent' }];
    expect(wordsFromVtt(toVtt(one))).toEqual(one);
  });

  it('returns nothing for a file with no cue', () => {
    expect(wordsFromVtt('WEBVTT\n\n')).toEqual([]);
  });
});

describe('finding the spoken word', () => {
  it('is silent before the first word', () => {
    expect(wordAt(ONE_DOLLAR, 0)).toBe(-1);
  });

  it('lands on the word being spoken', () => {
    expect(wordAt(ONE_DOLLAR, 100)).toBe(0);
    expect(wordAt(ONE_DOLLAR, 476)).toBe(0);
    expect(wordAt(ONE_DOLLAR, 477)).toBe(1);
    expect(wordAt(ONE_DOLLAR, 1000)).toBe(3);
  });

  it('stays on the last word past the end', () => {
    expect(wordAt(ONE_DOLLAR, 99_999)).toBe(4);
  });

  it('agrees with a linear scan across the whole clip', () => {
    for (let ms = 0; ms < 2000; ms += 7) {
      let expected = -1;
      ONE_DOLLAR.forEach((w, i) => {
        if (w.t <= ms) expected = i;
      });
      expect(wordAt(ONE_DOLLAR, ms)).toBe(expected);
    }
  });
});
