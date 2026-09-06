import { Link } from 'react-router-dom';
import { CATALOG } from '../lib/library/catalog.js';
import { availabilityOf } from '../lib/library/availability.js';
import { useOnline } from './useOnline.js';

export default function Bookshelf() {
  const online = useOnline();

  return (
    <main className="bookshelf-page">
      <header className="bookshelf-hero">
        <p className="eyebrow">Magi Reader</p>
        <h1>
          Your bookshelf
        </h1>
        <p>A film to watch. A story to read.</p>
      </header>

      <section className="shelf" aria-labelledby="your-books">
        <div className="shelf-head">
          <div>
            <p className="eyebrow">The bookshelf</p>
            <h2 id="your-books">Choose a book</h2>
          </div>
          <p className="shelf-note" role="status">
            {online
              ? 'A small collection. Room for more.'
              : 'You are offline. The film requires a connection or a downloaded copy.'}
          </p>
        </div>

        <ul className="book-grid">
          {CATALOG.map((entry) => {
            const status = availabilityOf(entry, online);
            return (
              <li
                className={`book-card ${status.kind}${entry.featured ? ' featured' : ''}`}
                key={entry.id}
              >
                <div className="book-spine" aria-hidden="true" />
                {entry.preview ? (
                  <div className="book-card-visual">
                    <img src={entry.preview} alt={entry.previewAlt || ''} />
                  </div>
                ) : null}
                <div className="book-card-copy">
                  <span className="book-kind">{entry.kind}</span>
                  <h3>{entry.title}</h3>
                  <p className="book-author">{entry.author}</p>
                  <p className={`book-status ${status.kind}`}>{status.label}</p>
                  <p className="book-note">{entry.note}</p>
                  {entry.mediaNote ? (
                    <p className="book-media-note">{entry.mediaNote}</p>
                  ) : null}
                  {status.available ? (
                    <div className="book-actions">
                      <Link className="btn primary" to={`/book/${entry.id}/read/0`}>
                        Watch
                      </Link>
                      <Link className="btn ghost" to={`/book/${entry.id}/read/0?view=text`}>Read</Link>
                      {entry.screening ? (
                        <a className="screening-link" href={entry.screening}>
                          Cinema view <span aria-hidden="true">↗</span>
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="shelf-footer">
          Read at your pace. Tap an unfamiliar word. Stay for the ending.
        </p>
      </section>
    </main>
  );
}
