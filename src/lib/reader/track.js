import { beatsOf } from './beats.js';
import { questionsOf, promptsOf } from './assessment.js';
import { reactionsFor, talkFor } from '../speech/script.js';

/**
 * One stop on a reading track.
 *
 * The legacy classroom track can still contain dialogue, questions and
 * prompts because old tests and old packs know that shape. The solo reader
 * uses `storyTrack`, which deliberately contains only story lines and an
 * ending. Keeping those two contracts separate makes it impossible for an
 * old teaching field to accidentally interrupt a recreational reading.
 *
 * @typedef {object} Stop
 * @property {'line'|'say'|'question'|'prompt'|'end'} kind
 * @property {number} at
 * @property {string} unit
 * @property {number} [i]
 * @property {string} [line]
 * @property {string|null} [clip]
 * @property {{id:string, src:string|null, alt:string}} [plate]
 * @property {Record<string,string>} [gloss]
 * @property {object} [visual]
 * @property {import('../speech/script.js').Turn} [turn]
 * @property {any} [question]
 * @property {any} [prompt]
 */

/**
 * The product track: the literary work, uninterrupted.
 *
 * Wren and Ambrose belong before and after the work, and the deeper
 * explanation belongs in Explore. Nothing from `teaching`, `dialogue`,
 * `questions`, `writing`, or reaction data is consulted here.
 *
 * @param {import('../types.js').Book|null|undefined} book
 * @param {Parameters<typeof beatsOf>[1]} [opts]
 * @returns {Stop[]}
 */
export function storyTrack(book, opts = {}) {
  const merged = {
    plates: book?.plates || {},
    storyboard: book?.storyboard || {},
    ...opts,
  };
  /** @type {Omit<Stop,'at'>[]} */
  const out = [];

  for (const unit of book?.units || []) {
    for (const beat of beatsOf(unit, merged)) {
      out.push({ kind: 'line', unit: unit.id, ...beat });
    }
  }

  const lastUnit = out.length ? out[out.length - 1].unit : book?.units?.[0]?.id || '';
  if (out.length) out.push({ kind: 'end', unit: lastUnit });
  return out.map((stop, at) => ({ ...stop, at }));
}

/**
 * Legacy three-pass track retained while the classroom code is being
 * removed from the repository. New product code should use `storyTrack`.
 */
export function trackFor(book, pass = 1, opts = {}) {
  const merged = { plates: book?.plates || {}, storyboard: book?.storyboard || {}, ...opts };
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
    const reacts = pass === 1 ? reactionsFor(book, u.id) : new Map();

    for (const beat of beatsOf(u, merged)) {
      out.push({ kind: 'line', unit: u.id, ...beat });
      const r = reacts.get(beat.i);
      if (r) out.push({ kind: 'say', unit: u.id, turn: r, plate: beat.plate });
    }

    if (pass === 1) {
      for (const turn of talkFor(book, u.id)) out.push({ kind: 'say', unit: u.id, turn });
    }
    for (const x of q.get(u.id) || []) out.push({ kind: 'question', unit: u.id, question: x });
    for (const x of p.get(u.id) || []) out.push({ kind: 'prompt', unit: u.id, prompt: x });
  }

  const placed = new Set(units.map((u) => u.id));
  const extras = Object.keys(book?.info || {}).filter((id) => !placed.has(id));
  const infoPlate = (id) => {
    const info = book?.info?.[id];
    const file = merged.plates[info?.scene || id];
    if (!file) return undefined;
    return {
      id: info?.scene || id,
      src: `${merged.base ?? ''}${file}`,
      alt: info?.caption || info?.title || '',
    };
  };

  if (pass === 1) {
    for (const id of extras) {
      const plate = infoPlate(id);
      for (const turn of talkFor(book, id)) out.push({ kind: 'say', unit: id, turn, plate });
    }
  }
  for (const x of questions)
    if (!placed.has(x.unit)) out.push({ kind: 'question', unit: x.unit, question: x, plate: infoPlate(x.unit) });
  for (const x of prompts)
    if (!placed.has(x.unit)) out.push({ kind: 'prompt', unit: x.unit, prompt: x, plate: infoPlate(x.unit) });

  const lastUnit = out.length ? out[out.length - 1].unit : units[0]?.id || '';
  if (out.length) out.push({ kind: 'end', unit: lastUnit });
  return out.map((stop, i) => ({ ...stop, at: i }));
}

export function aimAt(book, pass, track, at) {
  if (pass !== 1 && pass !== 2) return null;
  const stop = track?.[at];
  if (!stop?.unit) return null;
  if (at > 0 && track[at - 1]?.unit === stop.unit) return null;
  const teaching = book?.teaching?.[stop.unit];
  const text = pass === 1 ? teaching?.watch : teaching?.focus;
  return typeof text === 'string' && text.trim() ? text : null;
}

export function unitLike(book, id) {
  return (book?.units || []).find((u) => u.id === id) || book?.info?.[id] || null;
}

export function stepTrack(track, index, delta) {
  if (!track.length) return 0;
  const want = Number.isFinite(index) ? Math.floor(index) + delta : 0;
  return Math.max(0, Math.min(track.length - 1, want));
}

export function segmentsOf(track, book) {
  const out = [];
  const index = new Map();
  for (const stop of track) {
    /* The ending is its own experience. It belongs after the final scene,
       but it is not another line inside that scene and must not make the
       progress display say, for example, “12 of 13” on the last line. */
    if (stop.kind === 'end') continue;

    if (!index.has(stop.unit)) {
      const unit = unitLike(book, stop.unit);
      const seg = {
        id: stop.unit,
        act: unit?.act || '',
        title: unit?.title || stop.unit,
        plate: stop.plate || null,
        from: stop.at,
        to: stop.at,
        lines: 0,
        said: 0,
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
    } else if (stop.kind === 'say') {
      seg.said += 1;
      if (!seg.plate && stop.plate) seg.plate = stop.plate;
    } else {
      seg.asks += 1;
      if (!seg.plate && stop.plate) seg.plate = stop.plate;
    }
  }
  return out;
}

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

export function jumpSegment(segments, at, delta) {
  const { index } = whereIn(segments, at);
  if (index < 0) return at;
  if (delta < 0 && at > segments[index].from) return segments[index].from;
  const next = Math.max(0, Math.min(segments.length - 1, index + delta));
  return segments[next].from;
}
