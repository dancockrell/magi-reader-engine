/**
 * Where the reader had got to.
 *
 * The gate has a "Carry on" panel, written and styled, that had never
 * once appeared: nothing recorded a position and nothing passed one in.
 * A three-hundred-stop reading with no way back to where you were is a
 * reading most students will not finish, and in a classroom the lesson
 * ends before the story does — so this is not a convenience.
 *
 * One position per book, not per reading: a student is reading the book,
 * and offering them three half-finished places to resume is a decision
 * they should not have to make at the door.
 *
 * Never throws, for the same reason every store here does not.
 */

export const KEY = 'raven.where.v1';

const keyFor = (bookId) => `${KEY}.${bookId || 'book'}`;

/** @param {Storage} [store] */
export function rememberWhere(bookId, { pass, at, of }, store) {
  try {
    const s = store ?? globalThis.localStorage;
    s.setItem(keyFor(bookId), JSON.stringify({ pass, at, of, when: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Where to carry on from, or null.
 *
 * The very beginning is not somewhere to carry on from — offering it
 * makes the gate look like it remembers something when it does not.
 * Neither is the end: that reading is over, and "Carry on" would put
 * them back on the last stop with nowhere to go.
 *
 * @param {Storage} [store]
 * @returns {{pass:number, at:number, of:number, when:number}|null}
 */
export function whereLeftOff(bookId, store) {
  try {
    const s = store ?? globalThis.localStorage;
    const v = JSON.parse(s.getItem(keyFor(bookId)) || 'null');
    if (!v || typeof v !== 'object') return null;

    const pass = Number(v.pass);
    const at = Number(v.at);
    const of = Number(v.of);
    if (![1, 2, 3].includes(pass)) return null;
    if (!Number.isInteger(at) || at <= 0) return null;
    if (!Number.isInteger(of) || of <= 0 || at >= of - 1) return null;

    return { pass, at, of, when: Number(v.when) || 0 };
  } catch {
    return null;
  }
}

export function forgetWhere(bookId, store) {
  try {
    (store ?? globalThis.localStorage).removeItem(keyFor(bookId));
    return true;
  } catch {
    return false;
  }
}

/** How far through, as a percentage, for the panel to say. */
export const throughOf = (where) =>
  where && where.of ? Math.max(1, Math.round(((where.at + 1) / where.of) * 100)) : 0;
