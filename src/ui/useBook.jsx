import { createContext, useContext, useMemo } from 'react';
import { linesOf } from '../lib/reader/beats.js';
import { mediaOf } from '../lib/book/media.js';

/**
 * Which book this is, at runtime.
 *
 * It used to be a module-level `import` in `main.jsx`, and everything
 * derived from it — the id the storage keys are filed under, the line
 * counts a translation is checked against, the title in the header — was
 * computed once when the file loaded. That is fine for exactly one book
 * and wrong for two: a bookshelf, a pack fetched from somewhere else, or
 * a second title in the same build all need the answer to "which book?"
 * to be something the tree is told, not something the bundler decided.
 *
 * So the book is state, provided to the tree, and every screen asks.
 * There is one today and the reader opens with it, so nothing a student
 * sees is different; what changed is that the question now has an
 * answer that can change.
 *
 * Everything derived is derived HERE, once per book. The alternative —
 * each screen deriving its own — is how a stale line count outlives the
 * book it was counted from, and a stale line count silently refuses a
 * perfectly good translation.
 *
 * Deliberately not here: choosing a book. A picker needs somewhere to
 * put the choice, and the only honest place is the URL, which is a
 * decision that belongs with the shelf that does not exist yet.
 */

/**
 * @typedef {object} Reading
 * @property {import('../lib/types.js').Book} book  the pack itself
 * @property {string} id     what its work is filed under
 * @property {string} title
 * @property {{audio:string, cues:string}} media
 * @property {Record<string, number>} lineCounts  lines per unit, so a
 *   translation that does not line up can be refused
 */

const BookContext = createContext(/** @type {Reading|null} */ (null));

/** @param {import('../lib/types.js').Book} book */
function reading(book) {
  return {
    book,
    /* The same fallback the storage keys use, so an id-less pack files
       its work in one place rather than two. */
    id: book?.meta?.id || 'book',
    title: book?.meta?.title || '',
    media: mediaOf(book),
    lineCounts: Object.fromEntries((book?.units || []).map((u) => [u.id, linesOf(u).length])),
  };
}

/**
 * @param {object} props
 * @param {import('../lib/types.js').Book} props.book
 * @param {import('react').ReactNode} props.children
 */
export function BookProvider({ book, children }) {
  const value = useMemo(() => reading(book), [book]);

  /* Keyed, and it earns the line. A different book is a different
     reading: a half-finished attempt, a resume position and a heard-it-
     already flag are all filed per book, and the screens that hold them
     read them once on the way in. Without this, changing the book would
     leave one book's answers sitting in the component that is now
     writing them to another book's key. Remounting is not a
     nicety here — it is the difference between switching books and
     corrupting both.
     With one book the key never changes and this does nothing. */
  return (
    <BookContext.Provider key={value.id} value={value}>
      {children}
    </BookContext.Provider>
  );
}

/**
 * The book being read, and what falls out of it.
 *
 * Throws rather than falling back to a default. A screen rendered
 * outside the provider would otherwise quietly read one book and write
 * to another's keys, which is precisely the bug this replaced — and a
 * router built at module scope makes it an easy mistake, because the
 * provider has to wrap the router rather than live inside it.
 *
 * @returns {Reading}
 */
export function useBook() {
  const value = useContext(BookContext);
  if (!value) {
    throw new Error('No book here. Wrap this in <BookProvider book={…}>.');
  }
  return value;
}
