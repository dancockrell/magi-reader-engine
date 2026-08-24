import { plainStanza, inlineGlosses } from '../book/validate.js';

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

/**
 * The words this unit glosses, and what they mean.
 *
 * The book writes them two ways — a `gloss` list on the unit, and
 * `{word|meaning}` inline in the stanzas — and a reader does not care
 * which. Both are the same promise: this word is hard, here is what it
 * means. Keyed lowercase because that is how a token will be looked up.
 *
 * @param {Partial<import('../types.js').Unit>|null|undefined} unit
 * @returns {Record<string,string>}
 */
export function glossOf(unit) {
  /** @type {Record<string,string>} */
  const out = {};
  for (const pair of unit?.gloss || []) {
    const [w, d] = Array.isArray(pair) ? pair : [];
    if (w && d) out[String(w).toLowerCase()] = String(d);
  }
  for (const sz of unit?.stanzas || []) {
    for (const { w, d } of inlineGlosses(sz)) {
      if (w && d) out[String(w).toLowerCase()] = String(d);
    }
  }
  return out;
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
  /* Carried on the beat rather than looked up later: the reader has the
     line and needs to know which of its words can be tapped, and that
     question should not require the unit as well. */
  const gloss = glossOf(unit);

  return lines.map((line, i) => {
    const clip = `n_${unit.id}_${i}`;
    return {
      i,
      unit: unit.id,
      line,
      clip: hasClip && !hasClip(clip) ? null : clip,
      plate,
      gloss,
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
