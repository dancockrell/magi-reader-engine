import { plainStanza } from '../book/validate.js';

/**
 * A unit, cut into the beats the reader actually plays.
 *
 * One beat is one line of the story: a picture, the words, and the clip
 * that speaks them. The clip ids follow the book's own convention —
 * `n_<unit>_<n>`, numbered across the whole unit rather than restarting
 * per stanza, which is how the 519 recordings were named.
 *
 * Pure, so the whole progression can be checked without a browser: that
 * beats line up with clips, that no line is skipped, that the last beat
 * of a unit really is the last line.
 */

/** @param {Partial<import('../types.js').Unit>|null|undefined} unit */
export function linesOf(unit) {
  return (unit?.stanzas || [])
    .flatMap((sz) => plainStanza(String(sz)).split('\n'))
    .map((l) => l.trim())
    .filter(Boolean);
}

/* Relative, with no leading slash.
 *
 * itch serves a game from a nested path, so "/art/x.webp" resolves
 * against the domain root and 404s for every picture. Vite's own bundle
 * is already relative via base:'./'; these paths have to agree with it
 * or the build works locally and is broken the moment it is uploaded. */
export const MEDIA_BASE = '';

/**
 * @param {Partial<import('../types.js').Unit>|null|undefined} unit
 * @param {object} [opts]
 * @param {(id:string)=>boolean} [opts.hasClip]        which recordings exist
 * @param {Record<string,string>} [opts.plates]        scene id to picture file
 * @param {string} [opts.base]                         where those files are served from
 * @returns {import('../types.js').Beat[]}
 */
export function beatsOf(unit, { hasClip, plates = {}, base = MEDIA_BASE } = {}) {
  if (!unit?.id) return [];
  const lines = linesOf(unit);
  const sceneId = unit.scene || unit.id;
  /* The art is content-addressed, so the filename is a hash and the map
     is the only way from a scene to its picture. Falling back to the
     scene id would silently 404 rather than fail loudly. */
  const file = plates[sceneId];
  const plate = {
    id: sceneId,
    src: file ? `${base}${file}` : null,
    /* The alt text is the caption the book already wrote for this scene,
       which describes the picture — far better than "illustration". */
    alt: unit.caption || unit.title || 'Scene illustration',
  };
  return lines.map((line, i) => {
    const clip = `n_${unit.id}_${i}`;
    return {
      i,
      unit: unit.id,
      line,
      clip: hasClip && !hasClip(clip) ? null : clip,
      plate,
    };
  });
}

/**
 * Every beat in the book, in reading order.
 * @param {import('../types.js').Book|null|undefined} book
 * @param {Parameters<typeof beatsOf>[1]} [opts]
 * @returns {import('../types.js').Beat[]}
 */
export function beatsOfBook(book, opts = {}) {
  const merged = { plates: book?.plates || {}, ...opts };
  return (book?.units || []).flatMap((u) => beatsOf(u, merged));
}

/** Move within a unit, clamped — a beat index out of range used to throw
 *  and blank the page, so this refuses to produce one. */
export function step(beats, index, delta) {
  if (!beats.length) return 0;
  const want = Number.isFinite(index) ? Math.floor(index) + delta : 0;
  return Math.max(0, Math.min(beats.length - 1, want));
}
