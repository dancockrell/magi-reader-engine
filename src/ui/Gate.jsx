import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Preshow from './Preshow.jsx';
import { preshowRun } from '../lib/speech/script.js';
import { throughOf } from '../lib/reader/resume.js';
import { useBook } from './useBook.jsx';

/**
 * A book's front door.
 *
 * This is not a lesson selector anymore. It offers one obvious thing —
 * read the work — and keeps vocabulary practice and Ambrose's deeper
 * notes available without making either a prerequisite.
 */
export default function Gate({ resume = null, onForget }) {
  const { book, id, title } = useBook();
  const cover = book.plates?.cover;
  const turns = useMemo(() => preshowRun(book), [book]);
  const author = book.meta?.author || book.meta?.by || '';
  const kind = book.meta?.kind || 'Illustrated reading';

  return (
    <main className="gate solo-gate">
      <section className="book-hero">
        {cover ? <img className="cover" src={cover} alt="" /> : null}
        <div className="book-hero-copy">
          <p className="eyebrow">{kind}</p>
          <h1>{title}</h1>
          {author ? <p className="book-by">by {author}</p> : null}
          <p className="blurb">
            Read it as a story first. The narration, pictures and subtitles move with the text,
            and difficult words are there when you want them — tap one without leaving the page.
          </p>

          <div className="book-actions">
            {resume ? (
              <>
                <Link className="btn primary" to={`/book/${id}/read/${resume.at}`}>
                  Continue reading ›
                </Link>
                <span className="resume-note">{throughOf(resume)}% through</span>
              </>
            ) : (
              <Link className="btn primary" to={`/book/${id}/read/0`}>
                Start reading ›
              </Link>
            )}
            <Link className="btn" to={`/book/${id}/words`}>
              Practise vocabulary
            </Link>
            <Link className="btn ghost" to={`/book/${id}/explore`}>
              Explore the book
            </Link>
          </div>

          {resume ? (
            <button type="button" className="text-button" onClick={onForget}>
              Forget my place and start over
            </button>
          ) : null}
        </div>
      </section>

      {turns.length ? (
        <Preshow talkKey="preshow" turns={turns} title="Before you begin" />
      ) : null}

      <section className="house-note" aria-label="About Wren and Ambrose">
        <b>Wren & Grandpa Ambrose</b>
        <p>
          Wren loves a good story. Her grandfather Ambrose has spent a lifetime studying them.
          They will say hello before you begin and come back after the final line. If you want
          the deeper conversation, Ambrose keeps that in Explore so it never interrupts the book.
        </p>
      </section>
    </main>
  );
}
