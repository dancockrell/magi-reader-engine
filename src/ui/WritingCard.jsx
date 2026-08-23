import { useId, useMemo } from 'react';
import { gradeWritten, segments } from '../lib/reader/grader.js';

/**
 * One written prompt in Reading 3.
 *
 * The feedback here is encouragement, not a mark. A student is told how
 * much they have written and which of the ideas they have touched on;
 * they are never shown a score, because the score is not the machine's to
 * give — a person reads this writing. Nothing turns red, and nothing
 * blocks moving on.
 */

/**
 * @param {object} props
 * @param {object} props.prompt
 * @param {string} props.value
 * @param {(text:string)=>void} props.onChange
 * @param {{at:number,of:number}} props.progress
 */
export default function WritingCard({ prompt, value, onChange, progress }) {
  const id = useId();
  const grade = useMemo(() => gradeWritten(value, prompt), [value, prompt]);
  const parts = useMemo(
    () => (grade.matchedTerms.length ? segments(value, grade.matchedTerms) : null),
    [value, grade.matchedTerms]
  );

  if (!prompt) return null;

  const min = prompt.minWords || 0;
  /* Aiming at the target rather than past it: a bar that is already full
     at half the suggested length tells a student they are finished when
     they are not. */
  const toward = min ? Math.min(1, grade.wordCount / min) : 0;

  return (
    <section className="wcard">
      <header className="q-head">
        <span>
          Question {progress.at} of {progress.of}
        </span>
        <span>Write in your own words</span>
      </header>

      <h2 className="q-text">{prompt.q}</h2>
      {prompt.hint && <p className="prompt-hint">{prompt.hint}</p>}

      <label className="sr-only" htmlFor={`${id}-w`}>
        Your answer
      </label>
      <textarea
        id={`${id}-w`}
        className="write"
        value={value}
        rows={5}
        spellCheck="true"
        placeholder="Write your answer here."
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={`${id}-count`}
      />

      <p className="wcount" id={`${id}-count`}>
        <span>
          {grade.wordCount} {grade.wordCount === 1 ? 'word' : 'words'}
          {min ? ` — about ${min} is a good length` : ''}
        </span>
        {min > 0 && (
          <progress className="toward" value={toward} max={1}>
            {Math.round(toward * 100)}%
          </progress>
        )}
      </p>

      {/* Held back until there is something to say. Reacting to the first
          three words is noise a student learns to ignore. */}
      {grade.wordCount >= 5 && (
        <div className="wback" role="status" aria-live="polite">
          {parts ? (
            <>
              <p className="wback-lead">You have written about:</p>
              <p className="wback-text">
                {parts.map((p, i) =>
                  p.hit ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>
                )}
              </p>
            </>
          ) : (
            <p className="wback-lead">
              Good — keep going. Try to use something from the part you just read.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
