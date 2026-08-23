/**
 * One queue, one owner.
 *
 * The shipping reader has no queue at all: `TALKUI.show(who, text)`
 * overwrites the band with whoever called last. So a Wren reaction fired
 * on top of the Professor mid-sentence, two greetings raced at the gate,
 * and closing the box did not stop whatever was about to write into it
 * again. Every one of those is the same bug — several callers holding one
 * piece of screen.
 *
 * Here a caller has to *claim* the queue, by key. A claim replaces what
 * was there rather than interleaving with it, and `speaking()` returns at
 * most one turn, so two characters talking at once is not a thing this
 * can represent. Which is the point: the guarantee is structural, not a
 * rule someone has to remember at each call site.
 *
 * Dismissing is remembered by key, and so is hearing something through to
 * the end. Wren says hello once.
 */

/**
 * @typedef {import('./script.js').Turn} Turn
 * @typedef {{turns:Turn[], at:number, key:string|null, open:boolean, heard:string[]}} Speech
 */

/**
 * @param {string[]} [heard] keys already said, from the last visit
 * @returns {Speech}
 */
export function createSpeech(heard = []) {
  return { turns: [], at: 0, key: null, open: false, heard: [...new Set(heard)] };
}

/** Has this been said already — dismissed, or heard right through? */
export const wasHeard = (s, key) => s.heard.includes(key);

/**
 * Claim the queue.
 *
 * Silently does nothing when this key has been heard before, which is
 * what "stays dismissed" means, and nothing again when this key is
 * already the one open — so re-rendering, or arriving back on the same
 * screen, does not restart a speech halfway through it.
 *
 * @param {Speech} s
 * @param {string} key
 * @param {Turn[]} turns
 * @param {{again?: boolean}} [opts] `again` replays something already heard
 * @returns {Speech}
 */
export function speak(s, key, turns, { again = false } = {}) {
  if (!key || !turns?.length) return s;
  if (!again && wasHeard(s, key)) return s;
  if (s.open && s.key === key) return s;
  return { ...s, turns, at: 0, key, open: true };
}

/** Who is speaking — at most one, always. @returns {Turn|null} */
export const speaking = (s) => (s.open ? (s.turns[s.at] ?? null) : null);

/** How far through, for the reader rather than for the code. */
export const progressOf = (s) => ({ at: s.open ? s.at + 1 : 0, of: s.turns.length });

export const isLast = (s) => s.open && s.at >= s.turns.length - 1;

/**
 * On to the next turn, or to the end.
 *
 * Reaching the end counts as having heard it, the same as closing it. A
 * greeting that has been sat through is not one a student wants again.
 */
export function next(s) {
  if (!s.open) return s;
  if (isLast(s)) return close(s);
  return { ...s, at: s.at + 1 };
}

export function back(s) {
  if (!s.open || s.at === 0) return s;
  return { ...s, at: s.at - 1 };
}

/** Close it, and remember that it has been said. */
export function close(s) {
  if (!s.open) return s;
  const heard = s.key && !s.heard.includes(s.key) ? [...s.heard, s.key] : s.heard;
  return { ...s, open: false, turns: [], at: 0, key: null, heard };
}

/** Forget everything said, so it can all be heard again. */
export function forget(s) {
  return { ...s, heard: [] };
}
