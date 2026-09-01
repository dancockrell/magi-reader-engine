import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { catalogBook } from '../lib/library/catalog.js';
import { loadCatalogBook } from '../lib/library/plugin.js';
import { BookProvider } from './useBook.jsx';
import Shell from './Shell.jsx';

export default function BookRoute() {
  const { bookId = '' } = useParams();
  const entry = catalogBook(bookId);
  const [state, setState] = useState(() => ({
    book: entry?.local || null,
    error: null,
  }));

  useEffect(() => {
    let alive = true;
    if (!entry) {
      setState({ book: null, error: new Error('That book is not on this shelf.') });
      return () => {
        alive = false;
      };
    }
    if (entry.local) {
      setState({ book: entry.local, error: null });
      return () => {
        alive = false;
      };
    }

    setState({ book: null, error: null });
    loadCatalogBook(entry)
      .then((book) => {
        if (alive) setState({ book, error: null });
      })
      .catch((error) => {
        if (alive) setState({ book: null, error });
      });

    return () => {
      alive = false;
    };
  }, [entry]);

  if (state.error) {
    return (
      <main className="book-load-state">
        <p className="eyebrow">Bookshelf</p>
        <h1>Could not open this book.</h1>
        <p>{state.error.message}</p>
        <Link className="btn" to="/">
          Back to the bookshelf
        </Link>
      </main>
    );
  }

  if (!state.book) {
    return (
      <main className="book-load-state" aria-live="polite">
        <p className="eyebrow">Getting the book</p>
        <h1>{entry?.title || 'Book'}</h1>
        <p>Fetching the book pack and its reading map from Git…</p>
      </main>
    );
  }

  return (
    <BookProvider book={state.book}>
      <Shell />
    </BookProvider>
  );
}
