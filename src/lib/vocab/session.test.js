import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { inlineGlosses } from '../book/validate.js';
import { createSession, advance, answer, liveWords, progressOf, RETIRE_AT } from './session.js';

let ctx;

beforeAll(() => {
  const book = JSON.parse(readFileSync('src/books/magi/book.json', 'utf8'));
  const seen = new Map();
  for (const u of book.units) {
    const entries = (u.gloss || []).map(([w, d]) => ({ w, d }));
    for (const sz of u.stanzas || []) entries.push(...inlineGlosses(sz));
    for (const e of entries) {
      const k = e.w.toLowerCase();
      if (!seen.has(k)) seen.set(k, { w: e.w, d: e.d, unit: u.id, hits: 0, asked: 0 });
    }
  }
  ctx = { book, swaps: book.swaps, all: [...seen.values()] };
});

const seeded = (s) => () => ((s = (s * 1664525 + 1013904223) % 4294967296), s / 4294967296);

describe('purity', () => {
  it('never mutates the words it was given', () => {
    const before = JSON.stringify(ctx.all);
    let s = createSession(ctx, { rng: seeded(1) });
    for (let i = 0; i < 30 && !s.done; i++) {
      s = answer(s, i % 3 !== 0);
      s = advance(ctx, s, seeded(i + 2));
    }
    expect(JSON.stringify(ctx.all)).toBe(before);
  });

  it('returns a new session rather than editing the old one', () => {
    const a = createSession(ctx, { rng: seeded(4) });
    const b = answer(a, true);
    expect(b).not.toBe(a);
    expect(a.right).toBe(0);
    expect(b.right).toBe(1);
  });

  it('counts a word as asked exactly once per question', () => {
    /* This is the bug that useMemo hid: advancing twice for one question
       double-counted, because the increment ran during render. */
    const s = createSession(ctx, { rng: seeded(9) });
    const w = s.question.item.w;
    const asked = s.queue.find((i) => i.w === w).asked;
    expect(asked).toBe(1);
  });
});

describe('answering', () => {
  it('ignores a second answer to the same question', () => {
    const a = createSession(ctx, { rng: seeded(2) });
    const b = answer(a, true);
    const c = answer(b, true);
    expect(c).toBe(b);
    expect(c.right).toBe(1);
  });

  it('retires a word after two right answers', () => {
    let s = createSession(ctx, { rng: seeded(3) });
    const w = s.question.item.w;
    s = answer(s, true);
    s = advance(ctx, s, seeded(31));
    const again = s.queue.find((i) => i.w === w);
    expect(again.hits).toBe(1);
    expect(liveWords(s).some((i) => i.w === w)).toBe(true);
  });

  it('sends a missed word to the back and resets its streak', () => {
    let s = createSession(ctx, { rng: seeded(5) });
    const w = s.question.item.w;
    s = { ...s, queue: s.queue.map((i) => (i.w === w ? { ...i, hits: 1 } : i)) };
    s = answer(s, false);
    const moved = s.queue[s.queue.length - 1];
    expect(moved.w).toBe(w);
    expect(moved.hits).toBe(0);
    expect(s.wrong).toBe(1);
  });
});

describe('the session ends', () => {
  it('finishes when every word is retired, and does not loop forever', () => {
    let s = createSession(ctx, { size: 6, rng: seeded(7) });
    let guard = 0;
    while (!s.done && guard++ < 500) {
      s = answer(s, true);
      s = advance(ctx, s, seeded(guard + 40));
    }
    expect(s.done).toBe(true);
    expect(guard).toBeLessThan(500);
    expect(s.queue.every((i) => i.hits >= RETIRE_AT)).toBe(true);
  });

  it('terminates even when the student gets everything wrong for a while', () => {
    let s = createSession(ctx, { size: 4, rng: seeded(11) });
    let guard = 0;
    while (!s.done && guard++ < 400) {
      /* wrong for the first 20 answers, right thereafter */
      s = answer(s, guard > 20);
      s = advance(ctx, s, seeded(guard + 60));
    }
    expect(s.done).toBe(true);
  });

  it('always has a question while it is not done', () => {
    let s = createSession(ctx, { size: 5, rng: seeded(13) });
    for (let i = 0; i < 40 && !s.done; i++) {
      expect(s.question).not.toBeNull();
      s = answer(s, i % 2 === 0);
      s = advance(ctx, s, seeded(i + 90));
    }
  });
});

describe('progress line', () => {
  it('reads plainly and mentions revisits only when there are some', () => {
    let s = createSession(ctx, { size: 5, rng: seeded(17) });
    expect(progressOf(s).score).toBe('0 right');
    s = answer(s, false);
    expect(progressOf(s).score).toMatch(/to revisit/);
  });
});
