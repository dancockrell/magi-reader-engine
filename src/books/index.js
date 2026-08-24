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
 */
export const BOOKS = [magi];

export const defaultBook = BOOKS[0];

/** @param {string} id */
export function bookById(id) {
  return BOOKS.find((b) => b.meta?.id === id) || defaultBook;
}

/** Where this book's recordings and cue file live, once built. */
export function mediaOf(book) {
  return {
    audio: book?.media?.audio || '',
    cues: book?.media?.cues || '',
  };
}
