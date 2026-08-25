/**
 * What has already been said, kept between visits.
 *
 * "Dismissable, and it stays dismissed" only means anything if it
 * survives the tab being closed — a greeting that comes back after a
 * reload is the same greeting repeating, from the student's side of the
 * screen. Kept per book, so a second title greets a reader properly.
 *
 * Never throws, for the reason every store in this app does not: school
 * devices lock storage, and a student who cannot save a preference should
 * still be able to read the book. The cost of failing here is hearing
 * hello twice.
 */

export const KEY = 'reader.heard.v1';

const keyFor = (bookId) => `${KEY}.${bookId || 'book'}`;

/** @param {Storage} [store] @returns {string[]} */
export function loadHeard(bookId, store) {
  try {
    const s = store ?? globalThis.localStorage;
    const raw = JSON.parse(s.getItem(keyFor(bookId)) || 'null');
    return Array.isArray(raw) ? raw.filter((k) => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

/** @returns {boolean} whether it stuck */
export function saveHeard(bookId, heard, store) {
  try {
    const s = store ?? globalThis.localStorage;
    s.setItem(keyFor(bookId), JSON.stringify([...new Set(heard)].filter(Boolean)));
    return true;
  } catch {
    return false;
  }
}

export function clearHeard(bookId, store) {
  try {
    (store ?? globalThis.localStorage).removeItem(keyFor(bookId));
    return true;
  } catch {
    return false;
  }
}
