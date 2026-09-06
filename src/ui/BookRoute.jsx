import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { catalogBook } from '../lib/library/catalog.js';
import { loadCatalogBook } from '../lib/library/plugin.js';
import { BookProvider } from './useBook.jsx';
import Shell from './Shell.jsx';
import { useOnline } from './useOnline.js';

export default function BookRoute() {
  const { bookId = '' } = useParams();
  const entry = catalogBook(bookId);
  const [state, setState] = useState(() => ({ book: null, error: null }));
  const [attempt, setAttempt] = useState(0);
  const online = useOnline();

  useEffect(() => {
    let alive = true;
    if (!entry) {
      setState({ book: null, error: new Error('That book is not on this shelf.') });
      return () => {
        alive = false;
      };
    }

    if (entry.remote && !online) {
      setState({
        book: null,
        error: new Error('This book is fetched when you open it. Reconnect, then try again.'),
      });
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
  }, [entry, online, attempt]);

  if (state.error) {
    return (
      <main className="book-load-state" role="alert">
        <p className="eyebrow">Bookshelf</p>
        <h1>Could not open this book.</h1>
        <p>{state.error.message}</p>
        <div className="book-load-actions">
          {entry && (!entry.remote || online) ? (
            <button
              className="btn primary"
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Try again
            </button>
          ) : entry ? (
            <span className="book-offline-wait">Waiting for a connection…</span>
          ) : null}
          <Link className="btn" to="/">
            Back to the bookshelf
          </Link>
        </div>
      </main>
    );
  }

  if (!state.book) {
    return (
      <main className="book-load-state" aria-live="polite" aria-busy="true">
        <p className="eyebrow">Opening the book</p>
        <h1>{entry?.title || 'Book'}</h1>
        <p>{entry?.remote ? 'Fetching the book pack from Git…' : 'Preparing your reading…'}</p>
        <progress aria-label="Opening book" />
        <p className="book-load-note">
          {entry?.remote
            ? 'The pack is data and media only. Magi Reader never runs code from a book repository.'
            : 'This book is included with Magi Reader.'}
        </p>
      </main>
    );
  }

  return (
    <BookProvider book={state.book}>
      <Shell />
    </BookProvider>
  );
}
