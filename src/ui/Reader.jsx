import { useCallback, useEffect, useMemo, useState } from 'react';
import Scene from './Scene.jsx';
import { beatsOfBook, step } from '../lib/reader/beats.js';

/**
 * The reading itself.
 *
 * One picture, one line, one clip at a time. The frame does not move as
 * the text advances — that was the "marching picture" in the old reader,
 * caused by layout being computed from text-dependent measurements. Here
 * the frame is sized by CSS alone and knows nothing about the words.
 */

/**
 * @param {object} props
 * @param {import('../lib/types.js').Book} props.book
 * @param {number} [props.index]                which beat, from the URL
 * @param {number} [props.pass]                 which of the three readings
 * @param {(next:number)=>void} [props.onMove]  ask the router to move
 * @param {(beat:object)=>string|null} [props.translationFor]
 * @param {string} [props.lang]
 */
export default function Reader({
  book,
  index = 0,
  pass = 1,
  onMove,
  translationFor,
  lang = '',
}) {
  const beats = useMemo(() => beatsOfBook(book), [book]);
  const [playing, setPlaying] = useState(false);

  /* The position lives in the URL, not in this component. That is what
     makes Back work, makes a beat linkable, and means a reload lands
     where the reader was rather than at the beginning. */
  const i = step(beats, index, 0);
  const go = useCallback(
    (delta) => {
      const next = step(beats, i, delta);
      if (next !== i) onMove?.(next);
    },
    [beats, i, onMove]
  );

  /* Auto-advance, but stop at the end rather than looping — a reading
     that silently restarts is disorienting in a classroom. */
  const onEnded = useCallback(() => {
    const next = step(beats, i, 1);
    if (next === i) setPlaying(false);
    else onMove?.(next);
  }, [beats, i, onMove]);

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
      if (e.key === ' ') {
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
  }, [go]);

  if (!beats.length) return <main className="reader empty">Nothing to read.</main>;

  const beat = beats[i];
  const unit = book.units.find((u) => u.id === beat.unit);

  return (
    <main className="reader">
      <Scene
        key={beat.clip ?? `${beat.unit}-${beat.i}`}
        plate={beat.plate}
        line={beat.line}
        clip={beat.clip}
        translation={translationFor ? translationFor(beat) : null}
        lang={lang}
        playing={playing}
        onEnded={onEnded}
      />

      <div className="transport" role="group" aria-label="Reading controls">
        <button type="button" className="btn" onClick={() => go(-1)} disabled={i === 0}>
          ‹ Back
        </button>
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
          onClick={() => go(1)}
          disabled={i === beats.length - 1}
        >
          Next ›
        </button>
      </div>

      <p className="where">
        <span className="pass">Reading {pass}</span>
        <span className="act">{unit?.act}</span>
        <span className="title">{unit?.title}</span>
        <span className="count">
          {i + 1} of {beats.length}
        </span>
      </p>

      {/* A real progress element rather than a div pretending to be one:
          it is announced correctly and honours the OS's own styling. */}
      <progress className="through" value={i + 1} max={beats.length}>
        {i + 1} of {beats.length}
      </progress>
    </main>
  );
}
