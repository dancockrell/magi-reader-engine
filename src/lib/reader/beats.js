import { plainStanza, inlineGlosses } from '../book/validate.js';

/**
 * @typedef {object} BeatOptions
 * @property {(id:string)=>boolean} [hasClip]
 * @property {Record<string,string>} [plates]
 * @property {Record<string,any>} [storyboard]
 * @property {string} [base]
 */

/** @param {Partial<import('../types.js').Unit>|null|undefined} unit */
export function linesOf(unit) {
  return (unit?.stanzas || [])
    .flatMap((sz) => plainStanza(String(sz)).split('\n'))
    .map((l) => l.trim())
    .filter(Boolean);
}

/** @param {Partial<import('../types.js').Unit>|null|undefined} unit */
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

function visualFor(storyboard, unit, sceneId, i) {
  if (!storyboard) return null;
  const keyed = storyboard[`${sceneId}-${i}`] || storyboard[`${unit.id}-${i}`];
  if (keyed) return keyed;
  const grouped = storyboard[unit.id] || storyboard[sceneId];
  if (Array.isArray(grouped)) return grouped[i] || null;
  if (grouped && typeof grouped === 'object') return grouped[String(i)] || null;
  return null;
}

/**
 * Build one narrated line.
 *
 * A book may supply only a plate, a line-specific plate, or a full visual
 * storyboard entry. Storyboard entries are intentionally descriptive as
 * well as playable so the same JSON can be handed to an art/video model.
 *
 * @param {Partial<import('../types.js').Unit>|null|undefined} unit
 * @param {BeatOptions} [opts]
 * @returns {import('../types.js').Beat[]}
 */
export function beatsOf(
  unit,
  { hasClip, plates = {}, storyboard = {}, base = MEDIA_BASE } = {}
) {
  if (!unit?.id) return [];
  const lines = linesOf(unit);
  const sceneId = unit.scene || unit.id;
  const fallbackFile = plates[sceneId];
  const gloss = glossOf(unit);

  return lines.map((line, i) => {
    const clip = `n_${unit.id}_${i}`;
    const lineFile = plates[`${sceneId}-${i}`] || plates[`${unit.id}-${i}`];
    const file = lineFile || fallbackFile;
    const authoredVisual = visualFor(storyboard, unit, sceneId, i);
    const visual = authoredVisual
      ? {
          ...authoredVisual,
          start: authoredVisual.start || (file ? `${base}${file}` : null),
        }
      : null;
    const plateSrc = visual?.start || (file ? `${base}${file}` : null);
    const plate = {
      id: lineFile ? `${sceneId}-${i}` : sceneId,
      src: plateSrc,
      alt: visual?.alt || unit.caption || unit.title || 'Scene illustration',
    };

    return {
      i,
      unit: unit.id,
      line,
      clip: hasClip && !hasClip(clip) ? null : clip,
      plate,
      gloss,
      visual,
    };
  });
}

/**
 * @param {import('../types.js').Book|null|undefined} book
 * @param {BeatOptions} [opts]
 */
export function beatsOfBook(book, opts = {}) {
  const merged = {
    plates: book?.plates || {},
    storyboard: book?.storyboard || {},
    ...opts,
  };
  return (book?.units || []).flatMap((u) => beatsOf(u, merged));
}

export function step(beats, index, delta) {
  if (!beats.length) return 0;
  const want = Number.isFinite(index) ? Math.floor(index) + delta : 0;
  return Math.max(0, Math.min(beats.length - 1, want));
}
