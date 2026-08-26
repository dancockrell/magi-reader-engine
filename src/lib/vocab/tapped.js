/**
 * The words a student actually looked up.
 *
 * The app has been promising this in three separate places and not doing
 * it. The guide tells students "the ones you tap become your own
 * practice set", the book's own interface strings say "tap a dotted word
 * while reading, and it will wait for you here", and the practice screen
 * built its session from every glossed word in the book, shuffled.
 *
 * That is not a small difference. A student who tapped four words in
 * part three was offered ten at random from sixty-nine, most of them
 * from parts they had not read yet, and told those were the ones they
 * had chosen. The promise was the pedagogy: you decide what was hard,
 * and that is what comes back.
 *
 * Kept per book, so a second title has its own list.
 *
 * ORDER IS MEANINGFUL and is kept. The most recently tapped word goes
 * last, and a word tapped again moves to the end rather than being
 * ignored: tapping the same word three times is a student telling you
 * something, and a Set that silently kept the first occurrence would
 * throw that away.
 *
 * Never throws. School devices lock storage, and a student whose taps
 * cannot be saved must still be able to read the book and practise. The
 * cost of failing here is a practice set that falls back to the whole
 * glossary, which is exactly what the app did before this existed.
 */

export const KEY = 'reader.tapped.v1';

/** Enough for a lesson, and small enough that storage never complains. */
export const LIMIT = 200;

const keyFor = (bookId) => `${KEY}.${bookId || 'book'}`;

const clean = (w) =>
  String(w || '')
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '');

/**
 * @param {string} bookId
 * @param {Storage} [store]
 * @returns {string[]} oldest first
 */
export function loadTapped(bookId, store) {
  try {
    const s = store ?? globalThis.localStorage;
    const raw = JSON.parse(s.getItem(keyFor(bookId)) || 'null');
    if (!Array.isArray(raw)) return [];
    return [...new Set(raw.map(clean).filter(Boolean))].slice(-LIMIT);
  } catch {
    return [];
  }
}

/** @returns {boolean} whether it stuck */
export function saveTapped(bookId, words, store) {
  try {
    const s = store ?? globalThis.localStorage;
    const list = [...new Set(words.map(clean).filter(Boolean))].slice(-LIMIT);
    s.setItem(keyFor(bookId), JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/**
 * Record one tap and give back the new list.
 *
 * Pure, and returns rather than mutates, so a caller can hold it in
 * state and a test can drive it without a store.
 *
 * @param {string[]} tapped
 * @param {string} word
 * @returns {string[]}
 */
export function tap(tapped, word) {
  const w = clean(word);
  if (!w) return tapped;
  return [...tapped.filter((x) => x !== w), w].slice(-LIMIT);
}

export function clearTapped(bookId, store) {
  try {
    (store ?? globalThis.localStorage).removeItem(keyFor(bookId));
    return true;
  } catch {
    return false;
  }
}

/**
 * The words to practise, and why these.
 *
 * A student who has tapped nothing gets the whole glossary, because an
 * empty practice screen is worse than an unfocused one and a student who
 * opens the trainer before reading has still asked to practise.
 *
 * Newest first: the word looked up two minutes ago is the one still
 * being worked out, and it should be the one that comes back first.
 * Anything tapped but no longer glossed is dropped rather than invented.
 *
 * @param {{w:string}[]} all every word the book glosses
 * @param {string[]} tapped
 */
export function practiceSet(all, tapped) {
  if (!tapped.length) return all;
  const byWord = new Map(all.map((i) => [clean(i.w), i]));
  const chosen = [...tapped]
    .reverse()
    .map((w) => byWord.get(w))
    .filter(Boolean);
  return chosen.length ? chosen : all;
}
