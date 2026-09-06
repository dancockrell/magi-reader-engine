import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBook } from './useBook.jsx';
import CreditsReel from './CreditsReel.jsx';

/** The reader has finished the literary work. Nothing is scored here. */
export default function Finish({ muted = false, motion = true }) {
  const { book, id, title } = useBook();
  const [creditsDone, setCreditsDone] = useState(!book.credits?.cards?.length);

  if (!creditsDone) {
    return (
      <CreditsReel
        credits={book.credits}
        title={title}
        muted={muted}
        motion={motion}
        onDone={() => setCreditsDone(true)}
      />
    );
  }

  return (
    <section className="finish solo-finish">
      <p className="eyebrow">The final line</p>
      <h2>That is {title}.</h2>
      <p className="finish-next">
        Take a moment with the ending. You can read it again, or practise the words you saved.
      </p>

      {book.credits?.cards?.length ? (
        <button className="btn ghost" type="button" onClick={() => setCreditsDone(false)}>
          Replay credits
        </button>
      ) : null}

      <div className="finish-doors">
        <Link className="btn primary" to={`/book/${id}/read/0`}>
          Read again
        </Link>
        <Link className="btn" to={`/book/${id}/words`}>
          Practise the words
        </Link>
        <Link className="btn ghost" to="/">
          Back to the bookshelf
        </Link>
      </div>
    </section>
  );
}
