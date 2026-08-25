/**
 * What the reader remembers about how a person needs to read.
 *
 * Kept as pure functions over a plain object so the whole thing can be
 * tested without a browser, and so a corrupt or half-written store can
 * never take the app down — which is the failure that matters here.
 * School devices lock storage, wipe profiles between lessons, and share
 * one browser between thirty students; every one of those produces
 * garbage in localStorage sooner or later.
 */

export const KEY = 'reader.settings.v1';

/**
 * The three speeds the reader offers, and what they are called.
 *
 * Here rather than in the panel so the list that is drawn and the list
 * that is accepted cannot drift apart — a stored pace that the schema
 * rejects silently becomes Normal, and the button stays lit.
 *
 * @type {[number, string][]}
 */
export const PACES = [
  [0.85, 'Slower'],
  [1, 'Normal'],
  [1.18, 'Faster'],
];

/**
 * Each setting declares what it accepts. Anything else is discarded and
 * replaced with the default rather than trusted — a stored value is
 * input, not truth.
 *
 * @type {Record<string, {def: any, ok: (v:any)=>boolean}>}
 */
export const SCHEMA = {
  /* readability */
  contrast: { def: false, ok: (v) => typeof v === 'boolean' },
  bigText: { def: false, ok: (v) => typeof v === 'boolean' },
  ruler: { def: false, ok: (v) => typeof v === 'boolean' },

  /* motion and sound */
  motion: { def: true, ok: (v) => typeof v === 'boolean' },
  sound: { def: true, ok: (v) => typeof v === 'boolean' },
  /* the three the reader actually offers; anything else is not ours */
  pace: { def: 1, ok: (v) => PACES.some(([rate]) => rate === v) },

  /* language shown under the English */
  language: { def: '', ok: (v) => typeof v === 'string' && v.length <= 8 },
};

export function defaults() {
  const out = {};
  for (const [k, { def }] of Object.entries(SCHEMA)) out[k] = def;
  return out;
}

/**
 * Merge stored values over the defaults, keeping only what validates.
 * @param {unknown} stored
 */
export function normalise(stored) {
  const out = defaults();
  if (!stored || typeof stored !== 'object') return out;
  for (const [k, { ok }] of Object.entries(SCHEMA)) {
    const v = /** @type {any} */ (stored)[k];
    if (v !== undefined && ok(v)) out[k] = v;
  }
  return out;
}

/**
 * Read the settings. Never throws: a locked store, a quota error or
 * malformed JSON all give the defaults, because a student who cannot
 * save a preference should still be able to read the book.
 * @param {Storage} [store]
 */
export function load(store) {
  try {
    const s = store ?? globalThis.localStorage;
    return normalise(JSON.parse(s.getItem(KEY) || 'null'));
  } catch {
    return defaults();
  }
}

/**
 * Write the settings. Returns whether it stuck, so a caller can say so
 * rather than pretend.
 * @param {object} settings
 * @param {Storage} [store]
 */
export function save(settings, store) {
  try {
    const s = store ?? globalThis.localStorage;
    s.setItem(KEY, JSON.stringify(normalise(settings)));
    return true;
  } catch {
    return false;
  }
}

/**
 * The settings as they apply to the document.
 *
 * Returned as data rather than applied here so it can be asserted
 * without a DOM. `prefers-reduced-motion` from the operating system
 * wins over our own default but not over an explicit choice: someone
 * who has asked the OS for less motion has already answered.
 *
 * @param {object} settings
 * @param {{reducedMotion?: boolean}} [system]
 */
export function documentState(settings, system = {}) {
  const s = normalise(settings);
  return {
    classes: [
      s.contrast && 'hicontrast',
      s.bigText && 'bigtext',
      s.ruler && 'ruler',
      (!s.motion || system.reducedMotion) && 'stillness',
    ].filter(Boolean),
    lang: s.language || null,
    rate: s.pace,
    muted: !s.sound,
  };
}
