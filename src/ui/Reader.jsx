import { useCallback, useEffect, useMemo, useState } from 'react';
import Scene from './Scene.jsx';
import Storyboard from './Storyboard.jsx';
import QuestionCard from './QuestionCard.jsx';
import WritingCard from './WritingCard.jsx';
import { trackFor, stepTrack, segmentsOf, whereIn, jumpSegment } from '../lib/reader/track.js';
import { current, quizScore } from '../lib/reader/assessment.js';

/**
 * The reading itself — all three of them.
 *
 * One picture, one line, one clip at a time; and where the reading asks
 * for something back, the question appears in the same place, in the same
 * order, driven by the same position. The frame does not move as the text
 * advances — that was the "marching picture" in the old reader, caused by
 * layout being computed from text-dependent measurements. Here the frame
 * is sized by CSS alone and knows nothing about the words.
 */

/**
 * @param {object} props
 * @param {import('../lib/types.js').Book} props.book
 * @param {number} [props.index]                which stop, from the URL
 * @param {number} [props.pass]                 which of the three readings
 * @param {(next:number)=>void} [props.onMove]  ask the router to move
 * @param {object} [props.quiz]
 * @param {(choice:number)=>void} [props.onAnswer]
 * @param {()=>void} [props.onSkip]
 * @param {object} [props.writing]
 * @param {(text:string)=>void} [props.onWrite]
 * @param {(beat:object)=>string|null} [props.translationFor]
 * @param {string} [props.lang]
 */
export default function Reader({
  book,
  index = 0,
  pass = 1,
  onMove,
  quiz = null,
  onAnswer,
  onSkip,
  writing = null,
  onWrite,
  translationFor,
  lang = '',
}) {
  const track = useMemo(() => trackFor(book, pass), [book, pass]);
  const segments = useMemo(() => segmentsOf(track, book), [track, book]);
  const [playing, setPlaying] = useState(false);
  const [board, setBoard] = useState(false);
  /* Bumped to replay the line the reader is already on. Part of the
     Scene's key, so the media element restarts rather than being asked
     to seek — the seek is the thing that races on iOS. */
  const [again, setAgain] = useState(0);

  /* The position lives in the URL, not in this component. That is what
     makes Back work, makes a stop linkable, and means a reload lands
     where the reader was rather than at the beginning. */
  const i = stepTrack(track, index, 0);
  const stop = track[i];
  const where = whereIn(segments, i);

  const go = useCallback(
    (delta) => {
      const next = stepTrack(track, i, delta);
      if (next !== i) onMove?.(next);
    },
    [track, i, onMove]
  );

  const goSegment = useCallback(
    (delta) => {
      const next = jumpSegment(segments, i, delta);
      if (next !== i) onMove?.(next);
    },
    [segments, i, onMove]
  );

  /* Auto-advance, but stop at the end rather than looping — a reading
     that silently restarts is disorienting in a classroom. It also stops
     at a question: reading on past something a student was asked is the
     one place the app should wait for a person. */
  const onEnded = useCallback(() => {
    const next = stepTrack(track, i, 1);
    if (next === i || track[next]?.kind !== 'line') setPlaying(false);
    if (next !== i) onMove?.(next);
  }, [track, i, onMove]);

  const asking = stop && stop.kind !== 'line';

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return;

      /* ------------------------------------------------------------
         A modal is open: these keys are not ours.

         <dialog> makes the page behind it inert for focus and for the
         pointer, but a listener on `window` still receives every
         keystroke — so the arrow keys drove the reading behind an open
         panel, which is the exact legacy defect this was meant to fix.
         An e2e test caught it: "6 of 244" became "8 of 244".

         Asked of the DOM rather than tracked, because the legacy bug
         was a hand-maintained list of "is something open" selectors
         that someone forgot to add #gdoc to.
         ------------------------------------------------------------ */
      if (document.querySelector('dialog[open]')) return;

      if (e.key === ' ' && !asking) {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, asking]);

  /* Nothing plays over a question. */
  useEffect(() => {
    if (asking) setPlaying(false);
  }, [asking]);

  if (!track.length) return <main className="reader empty">Nothing to read.</main>;

  const unit = book.units.find((u) => u.id === stop.unit);
  const plate = where.segment?.plate;

  return (
    <main className="reader">
      {stop.kind === 'line' ? (
        <Scene
          key={`${stop.clip ?? `${stop.unit}-${stop.i}`}#${again}`}
          plate={stop.plate}
          line={stop.line}
          clip={stop.clip}
          translation={translationFor ? translationFor(stop) : null}
          lang={lang}
          playing={playing}
          onEnded={onEnded}
        />
      ) : (
        /* The picture stays. A question about a segment is much easier
           to answer with the segment still in front of you, and taking
           it away to make room for the question is what made the old
           quiz feel like a test rather than part of the reading. */
        <div className={`stage still ${stop.kind}`}>
          {plate?.src && <img className="plate" src={plate.src} alt={plate.alt} />}
        </div>
      )}

      {stop.kind === 'question' && quiz && (
        <QuestionCard
          /* the question is the one the URL is on, never the one the
             quiz object happens to be pointing at — otherwise going
             back to an earlier question shows a later one */
          question={stop.question}
          answered={quiz.answers[stop.question.id] || null}
          retrying={quiz.retrying && current(quiz)?.id === stop.question.id}
          onAnswer={(choice) => onAnswer?.(choice)}
          onSkip={onSkip ? () => onSkip() : undefined}
          progress={{
            at: quiz.questions.findIndex((q) => q.id === stop.question.id) + 1,
            of: quiz.questions.length,
            right: quizScore(quiz).right,
          }}
        />
      )}

      {stop.kind === 'prompt' && writing && (
        <WritingCard
          prompt={stop.prompt}
          value={writing.written[stop.prompt.id] || ''}
          onChange={(text) => onWrite?.(text)}
          progress={{
            at: writing.prompts.findIndex((p) => p.id === stop.prompt.id) + 1,
            of: writing.prompts.length,
          }}
        />
      )}

      {/* One row, laid out the way a player is: jump, step, play, step,
          jump. It was two rows for a while, and the second one made the
          reader taller than the viewport — which pushed the header off
          the top of a laptop screen and shifted the picture as the text
          changed. Two e2e tests caught it before it shipped. */}
      <div className="transport" role="group" aria-label="Reading controls">
        {/* Named in full for a screen reader. The two once read the same
            — "Segment" and "Segment", with the chevrons aria-hidden —
            which is unusable by voice and ambiguous to anyone else. */}
        <button
          type="button"
          className="btn ghost jump"
          onClick={() => goSegment(-1)}
          disabled={i === 0}
          aria-label="Previous segment"
          title="Previous segment"
        >
          <span aria-hidden="true">⟨⟨</span>
        </button>

        <button type="button" className="btn" onClick={() => go(-1)} disabled={i === 0}>
          ‹ Back
        </button>

        {stop.kind === 'line' ? (
          <>
            <button
              type="button"
              className="btn primary play"
              onClick={() => setPlaying((p) => !p)}
              aria-pressed={playing}
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setAgain((n) => n + 1);
                setPlaying(true);
              }}
            >
              <span aria-hidden="true">↻ </span>Again
            </button>
          </>
        ) : (
          <span className="transport-note">
            {stop.kind !== 'question'
              ? 'Write your answer'
              : quiz?.answers[stop.question.id]
                ? 'Answered'
                : 'Choose an answer'}
          </span>
        )}

        <button
          type="button"
          /* Once the question is answered, moving on is the only thing
             left to do, so Next says so. */
          className={
            'btn' +
            (stop.kind === 'question' && quiz?.answers[stop.question.id] ? ' primary' : '')
          }
          onClick={() => go(1)}
          disabled={i === track.length - 1}
        >
          Next ›
        </button>

        <button
          type="button"
          className="btn ghost jump"
          onClick={() => goSegment(1)}
          disabled={where.index >= segments.length - 1}
          aria-label="Next segment"
          title="Next segment"
        >
          <span aria-hidden="true">⟩⟩</span>
        </button>
      </div>

      {/* Where you are, and the way to somewhere else. One control: the
          segment you are in opens the storyboard. Dots under the picture
          worked at twelve segments and stop working well before forty. */}
      <p className="where">
        <span className="pass">Reading {pass}</span>
        <button
          type="button"
          className="seg-open"
          onClick={() => setBoard(true)}
          aria-haspopup="dialog"
        >
          <span className="act">{unit?.act || where.segment?.act}</span>
          <span className="title">{unit?.title || where.segment?.title}</span>
          <span className="seg-count">
            Segment {where.index + 1} of {where.of}
          </span>
        </button>
        <span className="count">
          {i + 1} of {track.length}
        </span>
      </p>

      {/* A real progress element rather than a div pretending to be one:
          it is announced correctly and honours the OS's own styling. */}
      <progress className="through" value={i + 1} max={track.length}>
        {i + 1} of {track.length}
      </progress>

      <Storyboard
        open={board}
        onClose={() => setBoard(false)}
        segments={segments}
        where={where}
        onJump={(at) => {
          setPlaying(false);
          onMove?.(at);
        }}
      />
    </main>
  );
}
