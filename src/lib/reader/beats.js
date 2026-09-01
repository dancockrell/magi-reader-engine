import { plainStanza, inlineGlosses } from '../book/validate.js';

/**
 * A unit, cut into the beats the reader actually plays.
 *
 * One beat is one line of the story: a picture, the words, and the clip
 * that speaks them. The clip ids follow the book's own convention —
 * `n_<unit>_<n>`, numbered across the whole unit rather than restarting
 * per stanza, which is how the recordings are named.
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
 * `{word|meaning}` inline in the stanzas. Both are the same promise:
 * this word is hard, here is what it means.
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

export const MEDIA_BASE = '';

/**
 * Build the playable line beats for one unit.
 *
 * The important art rule is line-first: `<scene>-<line>` wins when the
 * pack provides it, and the unit plate is only the fallback. That is the
 * seam the new storyboard pipeline uses — one or two strong key images
 * can be authored for every spoken line without changing reader code.
 */
export function beatsOf(unit, { hasClip, plates = {}, base = MEDIA_BASE } = {}) {
  if (!unit?.id) return [];
  const lines = linesOf(unit);
  const sceneId = unit.scene || unit.id;
  const fallbackFile = plates[sceneId];
  const gloss = glossOf(unit);

  return lines.map((line, i) => {
    const clip = `n_${unit.id}_${i}`;
    const file = plates[`${sceneId}-${i}`] || fallbackFile;
    const plate = {
      id: plates[`${sceneId}-${i}`] ? `${sceneId}-${i}` : sceneId,
      src: file ? `${base}${file}` : null,
      alt: unit.caption || unit.title || 'Scene illustration',
    };
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

export function beatsOfBook(book, opts = {}) {
  const merged = { plates: book?.plates || {}, ...opts };
  return (book?.units || []).flatMap((u) => beatsOf(u, merged));
}

export function step(beats, index, delta) {
  if (!beats.length) return 0;
  const want = Number.isFinite(index) ? Math.floor(index) + delta : 0;
  return Math.max(0, Math.min(beats.length - 1, want));
}
