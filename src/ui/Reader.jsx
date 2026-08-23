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
 * @param {(beat:object)=>string|null} [props.translationFor]
 * @param {string} [props.lang]
 */
export default function Reader({ book, translationFor, lang = '' }) {
  const beats = useMemo(() => beatsOfBook(book), [book]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);

  const go = useCallback((delta) => setI((n) => step(beats, n, delta)), [beats]);

  /* Auto-advance, but stop at the end rather than looping — a reading
     that silently restarts is disorienting in a classroom. */
  const onEnded = useCallback(() => {
    setI((n) => {
      const next = step(beats, n, 1);
      if (next === n) setPlaying(false);
      return next;
    });
  }, [beats]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
        return;
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
