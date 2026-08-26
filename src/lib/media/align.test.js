import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { alignCues, wordsByClip } from './vtt.js';
import { beatsOfBook } from '../reader/beats.js';
import { preshowRun, talkFor, reactionsFor, helloRun } from '../speech/script.js';

/**
 * The words on screen are the book's. The cues only say which one is lit.
 *
 * The reader shipped a version that rendered the cue text, and the cue
 * text is a transcript with no punctuation in it — so the moment a
 * recording loaded, every comma O. Henry wrote disappeared from a
 * reading app. These are the tests that stop that coming back.
 */

const cue = (list) => list.map((w) => ({ w, t: 0 }));
const tok = (s) => s.split(/\s+/).filter(Boolean);

describe('lining a transcript up with the text', () => {
  it('is the identity when they agree', () => {
    const tokens = tok('One dollar and eighty-seven cents.');
    const cues = cue(['One', 'dollar', 'and', 'eighty-seven', 'cents']);
    expect(alignCues(tokens, cues)).toEqual([0, 1, 2, 3, 4]);
  });

  it('ignores punctuation, which is the whole difference', () => {
    const tokens = tok('Okay. This is The Gift of the Magi.');
    const cues = cue(['Okay', 'This', 'is', 'The', 'Gift', 'of', 'the', 'Magi']);
    expect(alignCues(tokens, cues)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('keeps two spoken words on the one written word they came from', () => {
    /* an em-dash is a pause the transcriber heard and the typesetter
       did not write a space for */
    const tokens = tok('But what could I do—oh!');
    const cues = cue(['But', 'what', 'could', 'I', 'do', 'oh']);
    const map = alignCues(tokens, cues);
    expect(map).toHaveLength(6);
    expect(map[4]).toBe(4);
    expect(map[5], 'stays on the word rather than running off the end').toBe(4);
    expect(Math.max(...map)).toBeLessThan(tokens.length);
  });

  it('steps over a written word the transcript never said', () => {
    const tokens = tok('a pier glass in an $8 flat.');
    const cues = cue(['a', 'pier', 'glass', 'in', 'an', 'flat']);
    const map = alignCues(tokens, cues);
    expect(map[map.length - 1]).toBe(tokens.length - 1);
  });

  it('never moves backwards', () => {
    const tokens = tok('the the the quick the fox');
    const map = alignCues(tokens, cue(['the', 'quick', 'the', 'fox']));
    for (let i = 1; i < map.length; i++) expect(map[i]).toBeGreaterThanOrEqual(map[i - 1]);
  });

  it('never points outside the line', () => {
    const tokens = tok('two words');
    const map = alignCues(tokens, cue(['two', 'words', 'and', 'more', 'besides']));
    for (const i of map) {
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(tokens.length);
    }
  });

  it('gives nothing back for nothing', () => {
    expect(alignCues([], cue(['a']))).toEqual([0].map(() => 0));
    expect(alignCues(tok('a line'), [])).toEqual([]);
  });
});

describe('against the whole book', () => {
  let byClip;
  let lines;

  beforeAll(() => {
    const book = JSON.parse(readFileSync('src/books/magi/book.json', 'utf8'));
    byClip = wordsByClip(readFileSync('public/cues/magi.vtt', 'utf8'));

    lines = [];
    for (const beat of beatsOfBook(book)) lines.push({ clip: beat.clip, text: beat.line });
    for (const t of [...preshowRun(book), ...helloRun(book)]) lines.push(t);
    for (const id of [...book.units.map((u) => u.id), 'ohenry', 'impact']) {
      for (const t of talkFor(book, id)) lines.push(t);
      for (const t of reactionsFor(book, id).values()) lines.push(t);
    }
  });

  it('has something to check', () => {
    expect(lines.length).toBeGreaterThan(300);
  });

  it('lights a real word for every cue of every recording', () => {
    const bad = [];
    /* `continue` on a clip with no cues is right, and it is also how
       this test could examine nothing: if the cue file failed to load,
       every clip skips and the empty `bad` reads as a clean alignment
       across the whole book. Counted, and asserted below. */
    let aligned = 0;
    for (const { clip, text } of lines) {
      const cues = byClip[clip] || [];
      if (!cues.length) continue;
      aligned++;
      const tokens = tok(text);
      const map = alignCues(tokens, cues);
      if (map.length !== cues.length) bad.push(`${clip}: ${map.length} of ${cues.length}`);
      if (map.some((i) => i < 0 || i >= tokens.length)) bad.push(`${clip}: out of range`);
      for (let i = 1; i < map.length; i++) {
        if (map[i] < map[i - 1]) bad.push(`${clip}: went backwards at ${i}`);
      }
    }
    expect(aligned, 'every clip skipped, so nothing was aligned').toBeGreaterThan(50);
    expect(bad).toEqual([]);
  });

  it('reaches the end of the line, on nearly all of them', () => {
    /* The last cue should light the last word. A handful drift where the
       transcript merged a number and its unit; the number here is a
       floor, so a change that made the drift common would fail. */
    let landed = 0;
    let counted = 0;
    for (const { clip, text } of lines) {
      const cues = byClip[clip] || [];
      if (!cues.length) continue;
      const tokens = tok(text);
      const map = alignCues(tokens, cues);
      counted++;
      if (map[map.length - 1] === tokens.length - 1) landed++;
    }
    expect(landed / counted).toBeGreaterThan(0.9);
  });

  it('rendering the cues instead would lose what the book wrote', () => {
    /* The reason all of the above exists. Not "the cues have no
       punctuation at all" — they keep the full stop in "Mr." — but that
       line after line, the transcript has less of it than the text. */
    const marks = (s) => (String(s).match(/[,.;:!?—…]/g) || []).length;
    let lost = 0;
    let counted = 0;

    for (const { clip, text } of lines) {
      const cues = byClip[clip] || [];
      if (!cues.length) continue;
      counted++;
      if (marks(cues.map((c) => c.w).join(' ')) < marks(text)) lost++;
    }

    expect(counted).toBeGreaterThan(300);
    expect(lost / counted).toBeGreaterThan(0.8);
  });
});
