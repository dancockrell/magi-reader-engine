import { useCallback, useEffect, useMemo, useState } from 'react';
import Scene from './Scene.jsx';
import Storyboard from './Storyboard.jsx';
import QuestionCard from './QuestionCard.jsx';
import WritingCard from './WritingCard.jsx';
import Speaker from './Speaker.jsx';
import Finish from './Finish.jsx';
import {
  aimAt,
  trackFor,
  stepTrack,
  segmentsOf,
  whereIn,
  jumpSegment,
  unitLike,
} from '../lib/reader/track.js';
import { current, quizScore } from '../lib/reader/assessment.js';
import { speaker } from '../lib/speech/script.js';
import { glossOf } from '../lib/reader/beats.js';
import { T } from './useUi.jsx';
import { useBook } from './useBook.jsx';

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
 * Is one of the word pop-ups open?
 *
 * `:popover-open` is a selector an older engine does not know, and an
 * unknown selector makes querySelector throw rather than return null —
 * which would take the whole keydown handler with it. Guarded, so a
 * browser without popovers keeps its arrow keys.
 */
function openPopover() {
  try {
    return !!document.querySelector(':popover-open');
  } catch {
    return false;
  }
}

/**
 * @param {object} props
 * @param {number} [props.index]                which stop, from the URL
 * @param {number} [props.pass]                 which of the three readings
 * @param {(next:number)=>void} [props.onMove]  ask the router to move
 * @param {object} [props.quiz]
 * @param {(choice:number)=>void} [props.onAnswer]
 * @param {()=>void} [props.onSkip]
 * @param {object} [props.writing]
 * @param {(text:string)=>void} [props.onWrite]
 * @param {(beat:object)=>string|null} [props.translationFor]
 * @param {(text:string)=>string|null} [props.saidIn]   speech, translated
 * @param {(w:string)=>string|null} [props.wordIn]
 * @param {(w:string)=>void} [props.onTap]  told which word a student looked up      a glossed word, translated
 * @param {string} [props.lang]
 * @param {boolean} [props.muted]
 * @param {number} [props.rate]
 * @param {import('react').ReactNode} [props.handIn]  shown at the end
 */
export default function Reader({
  index = 0,
  pass = 1,
  onMove,
  quiz = null,
  onAnswer,
  onSkip,
  writing = null,
  onWrite,
  translationFor,
  saidIn,
  wordIn,
  onTap,
  lang = '',
  muted = false,
  rate = 1,
  handIn = null,
}) {
  /* The book is asked for, not imported. The reading is of whatever book
     the app is showing, and every list built below is keyed on it — a
     track, a set of segments or a glossary left over from a previous
     book would be read against the wrong pictures.

     The book says where its own recordings are, too. The engine does not
     know the name of a single one of them. */
  const { book, media } = useBook();

  const track = useMemo(() => trackFor(book, pass), [book, pass]);
  const segments = useMemo(() => segmentsOf(track, book), [track, book]);
  /* Built once per book: the words each unit explains, so a stop that is
     not a line — a question, a conversation — can still offer them. */
  const glossByUnit = useMemo(() => {
    /** @type {Record<string, Record<string,string>>} */
    const out = {};
    for (const u of book.units || []) out[u.id] = glossOf(u);
    return out;
  }, [book]);
  const glossFor = (unitId) => glossByUnit[unitId] || {};
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

  /* Which part's prompt to show, decided in lib and tested there. */
  const aim = useMemo(() => {
    const text = aimAt(book, pass, track, i);
    return text ? { text, other: saidIn ? saidIn(text) : null } : null;
  }, [book, pass, track, i, saidIn]);

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

  /* A stop either has a voice or wants an answer. Speech runs on: the
     Professor reads, Wren says her piece, and their conversation plays
     through without a click between every turn. A question stops it —
     reading on past something a student was asked is the one place the
     app should wait for a person. */
  const speaks = (s) => s?.kind === 'line' || s?.kind === 'say';
  const asking = !!stop && !speaks(stop);

  /* Auto-advance, but stop at the end rather than looping — a reading
     that silently restarts is disorienting in a classroom. */
  const onEnded = useCallback(() => {
    const next = stepTrack(track, i, 1);
    if (next === i || !speaks(track[next])) setPlaying(false);
    if (next !== i) onMove?.(next);
  }, [track, i, onMove]);

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

      /* A pop-up is open: same rule, and it needed saying separately.
         A popover is not a dialog and does not make the page behind it
         inert, so tapping a word and pressing the arrow key moved the
         reading underneath it — the third time this project has shipped
         a version of this defect, and the second time a test caught it
         the same afternoon it was written. Asked of the DOM, again,
         rather than tracked. */
      if (openPopover()) return;

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

  const unit = unitLike(book, stop.unit);
  const plate = where.segment?.plate;

  return (
    <main className="reader">
      {/* Announced, because it arrives without the student doing
          anything and a reader that only paints it leaves a screen
          reader silent at the start of every part. */}
      {aim ? (
        <p className="aim" role="status">
          <span className="aim-lead">Look for</span>
          <span className="aim-said">{aim.text}</span>
          {aim.other ? <span className="aim-tr">{aim.other}</span> : null}
        </p>
      ) : null}
      {stop.kind === 'line' ? (
        <Scene
          key={`${stop.clip ?? `${stop.unit}-${stop.i}`}#${again}`}
          plate={stop.plate}
          line={stop.line}
          clip={stop.clip}
          translation={translationFor ? translationFor(stop) : null}
          lang={lang}
          gloss={stop.gloss}
          wordIn={wordIn}
          onTap={onTap}
          audioBase={media.audio}
          cuesUrl={media.cues}
          playing={playing}
          muted={muted}
          rate={rate}
          onEnded={onEnded}
        />
      ) : (
        /* The picture stays. A question about a segment is much easier
           to answer with the segment still in front of you, and taking
           it away to make room for the question is what made the old
           quiz feel like a test rather than part of the reading.

           `stop.plate` first: a question about the author page is about
           a different picture from the segment the reader came in on,
           and a black rectangle is what it looked like without this. */
        <div className={`stage still ${stop.kind}`}>
          {(stop.plate || plate)?.src && (
            <img
              className="plate"
              src={(stop.plate || plate).src}
              alt={(stop.plate || plate).alt}
            />
          )}
        </div>
      )}

      {stop.kind === 'say' && (
        <Speaker
          /* keyed by the clip so the recording restarts rather than
             being asked to seek — the seek is what races on iOS */
          key={`${stop.turn.clip ?? stop.at}#${again}`}
          turn={stop.turn}
          who={speaker(book, stop.turn.who)}
          translation={saidIn ? saidIn(stop.turn.text) : null}
          lang={lang}
          /* They talk about the segment, so the words that segment
             explains are the words worth tapping while they do. */
          gloss={glossFor(stop.unit)}
          wordIn={wordIn}
          onTap={onTap}
          audioBase={media.audio}
          cuesUrl={media.cues}
          playing={playing}
          muted={muted}
          rate={rate}
          onEnded={onEnded}
        />
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

      {stop.kind === 'end' && (
        <Finish pass={pass} quiz={quiz} writing={writing} handIn={handIn} />
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

        {speaks(stop) ? (
          <>
            <button
              type="button"
              className="btn primary play"
              onClick={() => setPlaying((p) => !p)}
              aria-pressed={playing}
            >
              <T>{playing ? 'Pause' : 'Play'}</T>
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
            {stop.kind === 'end'
              ? 'The end'
              : stop.kind === 'prompt'
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
