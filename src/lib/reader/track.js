import { beatsOf } from './beats.js';

/**
 * One stop in the literary work.
 *
 * The solo reader has only two states: a narrated line and the ending.
 * Questions, prompts, teacher instructions and mid-story guide dialogue
 * are not valid track data anymore; framing lives before and after the
 * work and commentary lives in Explore.
 *
 * @typedef {object} Stop
 * @property {'line'|'end'} kind
 * @property {number} at
 * @property {string} unit
 * @property {number} [i]
 * @property {string} [line]
 * @property {string|null} [clip]
 * @property {{id:string,src:string|null,alt:string}} [plate]
 * @property {Record<string,string>} [gloss]
 * @property {import('../types.js').Visual} [visual]
 */

/**
 * Build the uninterrupted literary work.
 *
 * Nothing from legacy teaching, assessment or dialogue fields is read
 * here. Old packs may still carry those fields while they are migrated;
 * they cannot alter what a person sees while reading.
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

  if (out.length) out.push({ kind: 'end', unit: out[out.length - 1].unit });
  return out.map((stop, at) => ({ ...stop, at }));
}

export function unitLike(book, id) {
  return (book?.units || []).find((unit) => unit.id === id) || null;
}

export function stepTrack(track, index, delta) {
  if (!track.length) return 0;
  const want = Number.isFinite(index) ? Math.floor(index) + delta : 0;
  return Math.max(0, Math.min(track.length - 1, want));
}

/**
 * Turn line stops into visual story segments.
 *
 * The ending is outside this map by design: finishing the book is a new
 * experience, not an extra line inside the final scene.
 */
export function segmentsOf(track, book) {
  const out = [];
  const index = new Map();

  for (const stop of track) {
    if (stop.kind === 'end') continue;

    if (!index.has(stop.unit)) {
      const unit = unitLike(book, stop.unit);
      const segment = {
        id: stop.unit,
        act: unit?.act || '',
        title: unit?.title || stop.unit,
        plate: stop.plate || null,
        from: stop.at,
        to: stop.at,
        lines: 0,
      };
      index.set(stop.unit, segment);
      out.push(segment);
    }

    const segment = index.get(stop.unit);
    segment.to = stop.at;
    segment.lines += 1;
    if (!segment.plate && stop.plate) segment.plate = stop.plate;
  }

  return out;
}

export function whereIn(segments, at) {
  const index = segments.findIndex((segment) => at >= segment.from && at <= segment.to);
  const segment = segments[index] ?? null;
  return {
    index,
    segment,
    of: segments.length,
    through: segment ? at - segment.from + 1 : 0,
    span: segment ? segment.to - segment.from + 1 : 0,
  };
}

export function jumpSegment(segments, at, delta) {
  const { index } = whereIn(segments, at);
  if (index < 0) return at;
  if (delta < 0 && at > segments[index].from) return segments[index].from;
  const next = Math.max(0, Math.min(segments.length - 1, index + delta));
  return segments[next].from;
}
