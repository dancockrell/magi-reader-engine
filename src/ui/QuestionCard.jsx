import { useEffect, useRef, useState } from 'react';

/**
 * One question in Reading 2.
 *
 * The options are a list of buttons rather than radio inputs on purpose:
 * choosing is the answer here, not a step before submitting, so there is
 * nothing to submit and no second action to explain.
 *
 * @param {object} props
 * @param {object} props.question
 * @param {object|null} [props.answered]  what was recorded, if they have been here before
 * @param {boolean} props.retrying   a first answer was wrong and a hint is showing
 * @param {(choice:number)=>void} props.onAnswer
 * @param {()=>void} [props.onSkip]
 * @param {{at:number,of:number,right:number}} props.progress
 */
export default function QuestionCard({
  question,
  answered = null,
  retrying,
  onAnswer,
  onSkip,
  progress,
}) {
  const [chosen, setChosen] = useState(/** @type {number|null} */ (null));
  const headingRef = useRef(/** @type {HTMLHeadingElement|null} */ (null));

  /* A new question clears the last one's selection, and moves focus to
     the question itself so a screen reader announces it rather than
     leaving the user on a button that now means something else. */
  useEffect(() => {
    setChosen(null);
    headingRef.current?.focus();
  }, [question?.id, retrying]);

  if (!question) return null;

  /* An answer is final. Before it is given nothing on screen says which
     option is right — including the hint, because a student who can read
     the answer off the page has not been taught anything. After it is
     given the question is closed, and the explanation the book wrote for
     it is shown, which is the part that does the teaching.

     Final rather than changeable so that reading the explanation and
     then going back to fix the answer is not a way through the quiz. */
  const done = !!answered;
  const picked = chosen ?? answered?.choice ?? null;

  return (
    <section className="qcard" aria-labelledby="q-text">
      <header className="q-head">
        <span>
          Question {progress.at} of {progress.of}
        </span>
        <span>{progress.right} right</span>
      </header>

      <h2 id="q-text" className="q-text" tabIndex={-1} ref={headingRef}>
        {question.q}
      </h2>

      {retrying && !done && (
        <p className="hint" role="status">
          <b>Not quite.</b>{' '}
          {question.hint || 'Look back at the part you just read, then try again.'}
        </p>
      )}

      <ul className="q-opts">
        {(question.opts || []).map((text, i) => {
          const state = !done
            ? ''
            : i === question.correct
              ? ' correct'
              : picked === i
                ? ' wrong'
                : '';
          return (
            <li key={`${i}-${text}`}>
              <button
                type="button"
                className={'opt' + (picked === i ? ' picked' : '') + state}
                aria-pressed={picked === i}
                disabled={done}
                onClick={() => {
                  setChosen(i);
                  onAnswer(i);
                }}
              >
                {text}
              </button>
            </li>
          );
        })}
      </ul>

      {done && (
        <p className={'told ' + (answered.correct ? 'right' : 'missed')} role="status">
          <b>{answered.correct ? 'Right.' : 'Not this time.'}</b>{' '}
          {question.fb || question.explain || ''}
        </p>
      )}

      {onSkip && !done && (
        <button type="button" className="btn ghost skip" onClick={onSkip}>
          Skip this one
        </button>
      )}
    </section>
  );
}
