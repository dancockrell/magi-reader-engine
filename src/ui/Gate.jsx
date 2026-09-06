import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadTapped } from '../lib/vocab/tapped.js';
import { readingOverview } from '../lib/reader/overview.js';
import { useBook } from './useBook.jsx';

/**
 * A book's front door.
 *
 * This is not a lesson selector anymore. It offers one obvious thing —
 * read the work — with optional vocabulary practice kept out of the film.
 */
export default function Gate({ resume = null, onForget }) {
  const { book, id, title } = useBook();
  const cover = book.plates?.cover;
  const author = book.meta?.author || book.meta?.by || '';
  const kind = book.meta?.kind || 'Illustrated reading';
  const [coverUnavailable, setCoverUnavailable] = useState(false);
  const overview = useMemo(
    () => readingOverview(book, resume, loadTapped(id)),
    [book, id, resume]
  );

  useEffect(() => {
    setCoverUnavailable(false);
  }, [cover]);

  return (
    <main className="gate solo-gate">
      <section className="book-hero">
        {cover && !coverUnavailable ? (
          <img
            className="cover"
            src={cover}
            alt={`${title} cover`}
            onError={() => setCoverUnavailable(true)}
          />
        ) : (
          <div className="cover cover-fallback" role="img" aria-label={`${title} cover`}>
            <span>{kind}</span>
            <b>{title}</b>
            {author ? <i>{author}</i> : null}
          </div>
        )}
        <div className="book-hero-copy">
          <p className="eyebrow">{kind}</p>
          <h1>{title}</h1>
          {author ? <p className="book-by">by {author}</p> : null}
          <p className="blurb">
            Read it as a story first. The narration, pictures and subtitles move with the text,
            and difficult words are there when you want them — tap one without leaving the page.
          </p>

          <dl className="book-overview" aria-label="Book at a glance">
            <div>
              <dt>Reading</dt>
              <dd>
                About {overview.minutes} minutes · {overview.scenes} scenes
              </dd>
            </div>
            <div>
              <dt>Narration</dt>
              <dd>
                {overview.narration ? 'Available with subtitles' : 'Read at your own pace'}
              </dd>
            </div>
            <div>
              <dt>Your words</dt>
              <dd>
                {overview.tapped
                  ? `${overview.tapped} saved for practice`
                  : 'Tap difficult words while reading'}
              </dd>
            </div>
          </dl>

          <div className="book-actions primary-actions">
            {resume ? (
              <>
                <Link className="btn primary" to={`/book/${id}/read/${resume.at}`}>
                  Continue reading ›
                </Link>
                <span className="resume-note">{overview.progress}% through</span>
              </>
            ) : (
              <Link className="btn primary" to={`/book/${id}/read/0`}>
                Start reading ›
              </Link>
            )}
          </div>

          {resume ? (
            <button type="button" className="text-button" onClick={onForget}>
              Forget my place and start over
            </button>
          ) : null}
        </div>
      </section>

      <section className="book-options" aria-labelledby="more-with-book">
        <div className="book-options-head">
          <p className="eyebrow">Optional</p>
          <h2 id="more-with-book">More ways into the book</h2>
          <p>Neither interrupts the reading, and neither is required before you begin.</p>
        </div>
        <Link className="book-option" to={`/book/${id}/words`}>
          <span className="book-option-kicker">Vocabulary</span>
          <b>
            {overview.tapped
              ? `Practise ${overview.tapped} saved words`
              : 'Practise vocabulary'}
          </b>
          <span>
            {overview.tapped
              ? 'Start with the words you chose while reading.'
              : 'Open the full word set now, or build your own by tapping words in the story.'}
          </span>
        </Link>
      </section>
    </main>
  );
}
