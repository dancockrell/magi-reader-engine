import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import book from '../books/magi/book.json';
import Preshow from './Preshow.jsx';
import { preshowRun } from '../lib/speech/script.js';
import { throughOf } from '../lib/reader/resume.js';
import { T } from './useUi.jsx';

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
 * @param {{pass:number,at:number,of:number,when:number}|null} [props.resume]
 * @param {() => void} [props.onForget]
 */
export default function Gate({ resume = null, onForget }) {
  const cover = book.plates?.cover;
  /* Built once. A new array on every render would be a new claim on the
     speech queue on every render, which is the shape of the bug that
     made her repeat herself. */
  const turns = useMemo(() => preshowRun(book), []);

  return (
    <main className="gate">
      {cover ? <img className="cover" src={cover} alt="" /> : null}

      <Preshow book={book} talkKey="preshow" turns={turns} title="Before we start" />

      {resume ? (
        <aside className="resume" aria-label="Carry on">
          <span>
            You were {throughOf(resume)}% through <b>Reading {resume.pass}</b>.
          </span>
          <Link className="btn primary" to={`/read/${resume.pass}/${resume.at}`}>
            Carry on
          </Link>
          <button type="button" className="btn ghost" onClick={onForget}>
            <T>Start again</T>
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
              <b>
                <T>{r.name}</T>
              </b>
              <span className="what">{r.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
