import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import Preshow from './Preshow.jsx';
import { afterwordRun } from '../lib/speech/script.js';
import { useBook } from './useBook.jsx';

/** The reader has finished the literary work. Nothing is scored here. */
export default function Finish() {
  const { book, id, title } = useBook();
  const turns = useMemo(() => afterwordRun(book), [book]);

  return (
    <section className="finish solo-finish">
      <p className="eyebrow">The final line</p>
      <h2>That is {title}.</h2>
      <p className="finish-next">
        A story is allowed to end before somebody explains it. Sit with it for a moment if you
        want. Wren and Grandpa Ambrose have a few final thoughts, and the deeper notes are there
        only if you choose to open them.
      </p>

      {turns.length ? (
        <Preshow talkKey="final-thoughts" turns={turns} title="After the last line" />
      ) : null}

      <div className="finish-doors">
        <Link className="btn primary" to={`/book/${id}/explore`}>
          Explore the book ›
        </Link>
        <Link className="btn" to={`/book/${id}/words`}>
          Practise the words
        </Link>
        <Link className="btn ghost" to={`/book/${id}/read/0`}>
          Read again
        </Link>
        <Link className="btn ghost" to={`/book/${id}`}>
          Back to the book
        </Link>
      </div>
    </section>
  );
}
