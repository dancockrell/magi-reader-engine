import { Link } from 'react-router-dom';
import book from '../books/magi/book.json';

/**
 * The way in.
 *
 * Three readings of the same story, each asking for something different.
 * They are links, not buttons: a reading has a URL, so it can be
 * bookmarked, sent to a class, and returned to with the Back button —
 * none of which the legacy gate can do, because there every choice is a
 * click that changes a variable.
 */

export const READINGS = [
  {
    pass: 1,
    name: 'Watch',
    blurb: 'Sit back. The story is read to you while the pictures move.',
  },
  {
    pass: 2,
    name: 'Notice',
    blurb: 'You are told what to look for, then asked about it.',
  },
  {
    pass: 3,
    name: 'Think',
    blurb: 'You write answers in your own words.',
  },
];

/**
 * @param {object} props
 * @param {{pass:number,unit:string,beat:number,when:number}|null} [props.resume]
 * @param {() => void} [props.onForget]
 */
export default function Gate({ resume = null, onForget }) {
  const cover = book.plates?.cover;

  return (
    <main className="gate">
      {cover ? <img className="cover" src={cover} alt="" /> : null}

      {resume ? (
        <aside className="resume" aria-label="Carry on">
          <span>
            You were part-way through <b>Reading {resume.pass}</b>.
          </span>
          <Link className="btn primary" to={`/read/${resume.pass}/${resume.beat}`}>
            Carry on
          </Link>
          <button type="button" className="btn ghost" onClick={onForget}>
            Start again
          </button>
        </aside>
      ) : null}

      <h1>{book.meta.title}</h1>
      <p className="blurb">
        Twelve storyboard segments, an author study, and the little story that taught the world
        what irony feels like. You will read it three times, and each time you will be asked for
        something different. <b>Choose how you want to read it.</b>
      </p>

      <ul className="readings">
        {READINGS.map((r) => (
          <li key={r.pass}>
            <Link className="reading" to={`/read/${r.pass}/0`}>
              <span className="num" aria-hidden="true">
                {r.pass}
              </span>
              <b>{r.name}</b>
              <span className="what">{r.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
