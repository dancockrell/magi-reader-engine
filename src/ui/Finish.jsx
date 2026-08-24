import { Link } from 'react-router-dom';
import { quizScore } from '../lib/reader/assessment.js';
import { writingReport } from '../lib/reader/assessment.js';

/**
 * The end of a reading.
 *
 * There was not one. A student answered twenty-eight questions, reached
 * the last stop, and found a greyed-out Next button — no score, no
 * acknowledgement, nothing to do next. The reading did not end; it ran
 * out.
 *
 * What this does not do is hand the work in: that is the class side, and
 * it is not built yet. It says so, rather than implying the work went
 * somewhere. Telling a student their work is submitted when it is not is
 * the worst version of this screen.
 *
 * @param {object} props
 * @param {number} props.pass
 * @param {object|null} [props.quiz]
 * @param {object|null} [props.writing]
 */
export default function Finish({ pass, quiz = null, writing = null }) {
  const score = pass === 2 && quiz ? quizScore(quiz) : null;
  const written = pass === 3 && writing ? writingReport(writing) : null;
  const answered = written ? written.filter((r) => r.answer.trim()).length : 0;
  const words = written ? written.reduce((n, r) => n + r.grade.wordCount, 0) : 0;

  return (
    <section className="finish">
      <h2>
        {pass === 1
          ? 'That is the whole story.'
          : pass === 2
            ? 'That is every question.'
            : 'That is all the writing.'}
      </h2>

      {score && (
        <p className="finish-score">
          <b>
            {score.right} out of {score.asked}
          </b>
          <span>
            {score.percent}%{score.retried ? ` · ${score.retried} took two goes` : ''}
          </span>
        </p>
      )}

      {written && (
        <p className="finish-score">
          <b>
            {answered} of {written.length} answered
          </b>
          <span>
            {words} words · your teacher reads these
            {/* deliberately no mark: a person marks written work */}
          </span>
        </p>
      )}

      <p className="finish-next">
        {pass < 3
          ? 'Reading ' + (pass + 1) + ' asks you for something different.'
          : 'You have read it three times. That is the whole book.'}
      </p>

      <div className="finish-doors">
        {pass < 3 && (
          <Link className="btn primary" to={`/read/${pass + 1}/0`}>
            Start reading {pass + 1} ›
          </Link>
        )}
        <Link className="btn" to="/practise">
          Practise the words
        </Link>
        <Link className="btn ghost" to="/">
          Back to the start
        </Link>
      </div>

      {pass > 1 && (
        <p className="finish-note">
          Handing this to your teacher is not built yet — your answers are saved on this device.
        </p>
      )}
    </section>
  );
}
