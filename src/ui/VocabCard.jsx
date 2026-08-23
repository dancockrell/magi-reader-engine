import { useState, useRef, useEffect } from 'react';
import { wordRe } from '../lib/vocab/text.js';

/**
 * One vocabulary question.
 *
 * The component owns nothing but what is on screen: the question object
 * is built by the pure engine and handed in. That split is the whole
 * reason for the rebuild — the old card decided what to ask, rendered
 * it, scored it and spoke it in one 700-line object, so none of those
 * could be tested without a browser.
 *
 * Deliberately kept out of here: audio, the fitter, the scrim. Those are
 * imperative timing work and belong behind a ref, not in JSX.
 */

/**
 * The line from the story with the word lit.
 *
 * Splits on the match and returns React children rather than wrapping
 * the word in markup. Two of the defects found in the old reader were
 * student-supplied values interpolated into innerHTML; done this way the
 * text cannot be a vector at all.
 */
/**
 * @param {{line?:string|null, word?:string}} props
 */
function Sentence({ line, word }) {
  if (!line) return null;
  const m = wordRe(word).exec(line);
  if (!m) return <p className="v-line">{line}</p>;
  const start = m.index + m[1].length;
  const end = start + m[2].length;
  return (
    <p className="v-line">
      {line.slice(0, start)}
      <b>{line.slice(start, end)}</b>
      {line.slice(end)}
    </p>
  );
}

/**
 * @param {object} props
 * @param {import('../lib/types.js').Question|null} [props.question]
 * @param {string|null} [props.line]  the sentence this word lives in
 * @param {(result:{ok:boolean,question:any,chosen:string})=>void} [props.onAnswer]
 * @param {()=>void} [props.onNext]
 * @param {{label?:string,score?:string}} [props.progress]
 */
export default function VocabCard({ question, line, onAnswer, onNext, progress }) {
  const [chosen, setChosen] = useState(null);
  const [typed, setTyped] = useState('');
  const answered = chosen !== null;
  const inputRef = useRef(null);
  const nextRef = useRef(null);

  /* a new question clears the previous one's state */
  useEffect(() => {
    setChosen(null);
    setTyped('');
  }, [question]);

  /* Move focus to Next once an answer is in. Without this a keyboard
     user is stranded on a disabled button with nowhere obvious to go. */
  useEffect(() => {
    if (answered && nextRef.current) nextRef.current.focus();
  }, [answered]);

  useEffect(() => {
    if (question?.kind === 'spell' && inputRef.current) inputRef.current.focus();
  }, [question]);

  if (!question) return null;
  const word = question.item?.w;

  function choose(option, index) {
    if (answered) return;
    setChosen(index);
    onAnswer?.({ ok: option.ok, question, chosen: option.t });
  }

  function checkSpelling(event) {
    event.preventDefault();
    if (answered) return;
    const norm = (s) => String(s).trim().toLowerCase().replace(/[’']/g, "'");
    const ok = norm(typed) === norm(question.answer);
    setChosen(ok ? 'right' : 'wrong');
    onAnswer?.({ ok, question, chosen: typed });
  }

  return (
    <section className="vcard" aria-labelledby="v-prompt">
      <header className="q-head">
        <span>{progress?.label}</span>
        <span>{progress?.score}</span>
      </header>

      <h2 id="v-prompt" className={`v-prompt ${question.kind}`}>
        {question.kind === 'swap' && line ? (
          <Sentence line={line} word={word} />
        ) : (
          question.prompt
        )}
      </h2>
      <p className="v-sub">{question.sub}</p>

      {question.kind === 'spell' ? (
        <form className="v-spell" onSubmit={checkSpelling}>
          <label className="sr-only" htmlFor="v-spell-in">
            Type the missing word
          </label>
          <input
            id="v-spell-in"
            ref={inputRef}
            className={`sp-in ${chosen ?? ''}`}
            value={typed}
            disabled={answered}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
            placeholder={`${question.firstLetter}…`}
            onChange={(e) => setTyped(e.target.value)}
          />
          <button className="btn primary" type="submit" disabled={answered}>
            Check
          </button>
          <p className="sp-hint">It means: {question.hint}</p>
        </form>
      ) : (
        <ul className="v-opts">
          {question.options.map((o, i) => (
            <li key={`${o.t}-${i}`}>
              <button
                type="button"
                className={
                  'opt' +
                  (answered && o.ok ? ' correct' : '') +
                  (answered && chosen === i && !o.ok ? ' wrong' : '')
                }
                disabled={answered}
                aria-pressed={chosen === i}
                onClick={() => choose(o, i)}
              >
                {o.t}
              </button>
            </li>
          ))}
        </ul>
      )}

      {answered && (
        <div className="v-fb" role="status">
          <p>
            <b>{word}</b> — {question.item?.d}
          </p>
          {question.kind === 'swap' && (
            <p className="v-swap">
              <b>{question.options.find((o) => o.ok)?.t}</b> would also work here — close enough
              in this line, though not the word O.&nbsp;Henry chose.
            </p>
          )}
          {/* the sentence, on every kind, always */}
          <Sentence line={line} word={word} />
        </div>
      )}

      {answered && (
        <button ref={nextRef} type="button" className="btn primary v-next" onClick={onNext}>
          Next
        </button>
      )}
    </section>
  );
}
