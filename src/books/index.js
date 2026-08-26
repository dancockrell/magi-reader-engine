import magi from './magi/index.js';

/**
 * Every book this build ships with.
 *
 * There is one today, and the shape is the point: the reader is an
 * engine, and a book is a pack it is given. A second title should be a
 * new folder here and no change anywhere else — new content, no new
 * code. Anything that stops that being true is a defect in the engine,
 * not a missing feature of the book, and `engine.test.js` fails on the
 * commonest form of it.
 *
 * The list is ordered; the first is what the reader opens with.
 *
 * `books/fixture/` is deliberately NOT here. It is a whole, complete
 * book that exists so the engine's tests have something to run against
 * that is not a title — and this list is what the reader offers a
 * student. A book nobody wrote appearing in that list is a defect, not
 * a feature, so the fixture is imported by tests and by nothing else,
 * which is also what keeps it out of the bundle.
 */
export const BOOKS = [magi];

export const defaultBook = BOOKS[0];

/** @param {string} id */
export function bookById(id) {
  return BOOKS.find((b) => b.meta?.id === id) || defaultBook;
}

/**
 * Where this book's recordings and cue file live, once built.
 *
 * It is the engine's, not the pack list's — it reads whatever pack it is
 * handed — so it lives in `lib/book/media.js` and is re-exported here.
 * That way a screen that needs the audio path asks for a book's media
 * without importing the list of titles this build ships, which is the
 * point of the split.
 */
export { mediaOf } from '../lib/book/media.js';
