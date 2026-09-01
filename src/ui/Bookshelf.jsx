import { Link } from 'react-router-dom';
import { CATALOG } from '../lib/library/catalog.js';

export default function Bookshelf() {
  return (
    <main className="bookshelf-page">
      <header className="bookshelf-hero">
        <p className="eyebrow">Magi Reader</p>
        <h1>Good books, read closely.</h1>
        <p>
          Illustrated readings with narration, subtitles, words you can tap, and a vocabulary
          trainer that remembers what you looked up. Wren and her grandfather Ambrose introduce
          each book, then get out of the story's way.
        </p>
      </header>

      <section className="shelf" aria-labelledby="your-books">
        <div className="shelf-head">
          <div>
            <p className="eyebrow">The bookshelf</p>
            <h2 id="your-books">Choose a book</h2>
          </div>
          <p className="shelf-note">Books from Git are fetched only when you open them.</p>
        </div>

        <ul className="book-grid">
          {CATALOG.map((entry) => {
            const ready = !!entry.local || !!entry.remote;
            return (
              <li className={`book-card${entry.featured ? ' featured' : ''}`} key={entry.id}>
                <div className="book-spine" aria-hidden="true" />
                <div className="book-card-copy">
                  <span className="book-kind">{entry.kind}</span>
                  <h3>{entry.title}</h3>
                  <p className="book-author">{entry.author}</p>
                  <p className="book-note">{entry.note}</p>
                  {ready ? (
                    <Link className="btn primary" to={`/book/${entry.id}`}>
                      {entry.local ? 'Open book' : 'Get and open'}
                    </Link>
                  ) : (
                    <span className="book-coming">Coming to the shelf</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
