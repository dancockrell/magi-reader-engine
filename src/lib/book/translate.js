/**
 * The reader's own language, under the English.
 *
 * The book carries four full translations of every line — 120 aligned
 * arrays, one per unit per language — and the Language panel promises
 * them: "Your language appears underneath it." Nothing rendered them, so
 * choosing Korean changed nothing at all on screen. A setting that
 * persists and does nothing is worse than a setting that is missing,
 * because the checkbox stays ticked and the reader assumes it is on.
 *
 * The story stays in English. This is a support, not a substitute: a
 * student reads the line, and looks down when they need to.
 */

/** The languages this book has been translated into. */
export function languagesOf(book) {
  return (book?.languages || []).filter((l) => l && l.code);
}

/** Is there anything to show in this language? */
export function hasLanguage(book, lang) {
  if (!lang) return false;
  return languagesOf(book).some((l) => l.code === lang);
}

/**
 * One line of the story, in the reader's language.
 *
 * Indexed by position, because that is how the translations were
 * written: an array per unit per language, one entry per line. A
 * mismatch is treated as no translation rather than as an off-by-one —
 * showing a student the wrong sentence in their own language is worse
 * than showing them none.
 *
 * @param {Partial<import('../types.js').Book>|null|undefined} book
 * @param {string} lang
 * @param {string} unitId
 * @param {number} i        which line of the unit
 * @param {number} [lines]  how many lines the unit has, when known
 * @returns {string|null}
 */
export function lineTranslation(book, lang, unitId, i, lines) {
  if (!lang) return null;
  const arr = book?.lineTranslations?.[unitId]?.[lang];
  if (!Array.isArray(arr)) return null;
  if (typeof lines === 'number' && arr.length !== lines) return null;
  const text = arr[i];
  return typeof text === 'string' && text.trim() ? text : null;
}

/**
 * What a glossed word means, in the reader's language.
 * @returns {string|null}
 */
export function wordTranslation(book, lang, word) {
  if (!lang || !word) return null;
  const entry = book?.wordTranslations?.[String(word).toLowerCase()];
  const text = entry && entry[lang];
  return typeof text === 'string' && text.trim() ? text : null;
}

/**
 * A phrase of the interface, in the reader's language.
 *
 * Falls back to the English it was given rather than to a blank or to a
 * key — a missing translation should read as untranslated, never as
 * broken.
 */
export function uiTranslation(book, lang, english) {
  if (!lang) return null;
  const entry = book?.uiTranslations?.[english];
  const text = entry && entry[lang];
  return typeof text === 'string' && text.trim() ? text : null;
}

/**
 * A translator bound to one book and one language.
 *
 * Returned as a small object so a component takes one prop instead of
 * four, and so "no language chosen" is one falsy check rather than a
 * condition repeated at every call site.
 *
 * @returns {{lang:string, line:(stop:{unit:string,i?:number})=>string|null,
 *            word:(w:string)=>string|null, ui:(s:string)=>string|null}|null}
 */
export function translatorFor(book, lang, linesPerUnit = {}) {
  if (!hasLanguage(book, lang)) return null;
  return {
    lang,
    line: (stop) =>
      stop && typeof stop.i === 'number'
        ? lineTranslation(book, lang, stop.unit, stop.i, linesPerUnit[stop.unit])
        : null,
    word: (w) => wordTranslation(book, lang, w),
    ui: (s) => uiTranslation(book, lang, s),
  };
}
