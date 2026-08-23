import { beatsOf } from './beats.js';
import { questionsOf, promptsOf } from './assessment.js';

/**
 * One reading, as a single ordered list of stops.
 *
 * The three readings are the same story with different work attached, so
 * they are one sequence rather than three screens: read a segment, then
 * answer what it asked, then read the next. That is the order a lesson
 * actually runs in, and it means the position in the URL still means one
 * thing — stop number — no matter which reading is open. Back, reload
 * and a shared link keep working because there is nothing else to keep.
 *
 * A stop is `{kind}` plus what that kind needs:
 *   line      a picture, a line, a clip
 *   question  a multiple-choice question about the segment just read
 *   prompt    a written prompt about the segment just read
 */

/**
 * One stop on the track.
 *
 * Written out rather than inferred so that `kind` is the three strings it
 * really is: inferred, it widens to `string`, the three shapes stop being
 * a union anyone can narrow, and every `stop.line` in the reader becomes
 * a type error for a property that is plainly there.
 *
 * @typedef {object} Stop
 * @property {'line'|'question'|'prompt'} kind
 * @property {number} at        position on the track — what the URL holds
 * @property {string} unit
 * @property {number} [i]       line stops: which line of the unit
 * @property {string} [line]
 * @property {string|null} [clip]
 * @property {{id:string, src:string|null, alt:string}} [plate]
 * @property {any} [question]
 * @property {any} [prompt]
 */

/**
 * @param {import('../types.js').Book} book
 * @param {number} pass 1 read, 2 quiz, 3 written
 * @param {Parameters<typeof beatsOf>[1]} [opts]
 * @returns {Stop[]}
 */
export function trackFor(book, pass = 1, opts = {}) {
  const merged = { plates: book?.plates || {}, ...opts };
  const units = book?.units || [];

  const questions = pass === 2 ? questionsOf(book) : [];
  const prompts = pass === 3 ? promptsOf(book) : [];
  const byUnit = (list) => {
    const m = new Map();
    for (const x of list) {
      if (!m.has(x.unit)) m.set(x.unit, []);
      m.get(x.unit).push(x);
    }
    return m;
  };
  const q = byUnit(questions);
  const p = byUnit(prompts);

  /** @type {Omit<Stop,'at'>[]} */
  const out = [];
  for (const u of units) {
    for (const beat of beatsOf(u, merged)) out.push({ kind: 'line', unit: u.id, ...beat });
    for (const x of q.get(u.id) || []) out.push({ kind: 'question', unit: u.id, question: x });
    for (const x of p.get(u.id) || []) out.push({ kind: 'prompt', unit: u.id, prompt: x });
  }

  /* Anything asked about material that is not a read segment — the
     background notes — comes after the story rather than being dropped.
     Losing a question silently would show up as a class where the marks
     do not add up, which is the worst way to find a bug. */
  const placed = new Set(units.map((u) => u.id));
  for (const x of questions)
    if (!placed.has(x.unit)) out.push({ kind: 'question', unit: x.unit, question: x });
  for (const x of prompts)
    if (!placed.has(x.unit)) out.push({ kind: 'prompt', unit: x.unit, prompt: x });

  return out.map((stop, i) => ({ ...stop, at: i }));
}

/**
 * Clamp a position onto the track. Never produces one that is not there.
 * @param {Stop[]} track
 * @param {number} index
 * @param {number} delta
 */
export function stepTrack(track, index, delta) {
  if (!track.length) return 0;
  const want = Number.isFinite(index) ? Math.floor(index) + delta : 0;
  return Math.max(0, Math.min(track.length - 1, want));
}

/**
 * The segments, for the storyboard.
 *
 * Twelve dots were readable; a hundred are not, and the book is meant to
 * take more than one story. So navigation is by segment — the picture and
 * its title — and the position within a segment is a bar, not a dot per
 * line.
 *
 * @param {Stop[]} track
 * @param {import('../types.js').Book|null|undefined} book
 */
export function segmentsOf(track, book) {
  const out = [];
  const index = new Map();
  for (const stop of track) {
    if (!index.has(stop.unit)) {
      const unit = (book?.units || []).find((u) => u.id === stop.unit);
      const seg = {
        id: stop.unit,
        act: unit?.act || '',
        title: unit?.title || stop.unit,
        plate: stop.plate || null,
        from: stop.at,
        to: stop.at,
        lines: 0,
        asks: 0,
      };
      index.set(stop.unit, seg);
      out.push(seg);
    }
    const seg = index.get(stop.unit);
    seg.to = stop.at;
    if (stop.kind === 'line') {
      seg.lines += 1;
      if (!seg.plate && stop.plate) seg.plate = stop.plate;
    } else seg.asks += 1;
  }
  return out;
}

/** Which segment a position is in, and how far through it. */
export function whereIn(segments, at) {
  const i = segments.findIndex((s) => at >= s.from && at <= s.to);
  const seg = segments[i] ?? null;
  return {
    index: i,
    segment: seg,
    of: segments.length,
    through: seg ? at - seg.from + 1 : 0,
    span: seg ? seg.to - seg.from + 1 : 0,
  };
}

/** The first stop of the segment before / after this one. */
export function jumpSegment(segments, at, delta) {
  const { index } = whereIn(segments, at);
  if (index < 0) return at;
  /* Back, from partway through a segment, means the top of this one —
     the same thing the back button on a music player does, and for the
     same reason: it is the move people reach for far more often. */
  if (delta < 0 && at > segments[index].from) return segments[index].from;
  const next = Math.max(0, Math.min(segments.length - 1, index + delta));
  return segments[next].from;
}
