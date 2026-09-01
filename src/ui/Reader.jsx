import { useCallback, useEffect, useMemo, useState } from 'react';
import Scene from './Scene.jsx';
import Storyboard from './Storyboard.jsx';
import Finish from './Finish.jsx';
import {
  storyTrack,
  stepTrack,
  segmentsOf,
  whereIn,
  jumpSegment,
} from '../lib/reader/track.js';
import { T } from './useUi.jsx';
import { useBook } from './useBook.jsx';

function openPopover() {
  try {
    return !!document.querySelector(':popover-open');
  } catch {
    return false;
  }
}

/**
 * The solo reading surface.
 *
 * There is intentionally no concept of a quiz, prompt, teacher, guide
 * interruption, or character reaction here. One stop is one line of the
 * literary work. Wren and Ambrose frame the work outside this component.
 */
export default function Reader({
  index = 0,
  onMove = undefined,
  translationFor = undefined,
  wordIn = undefined,
  onTap = undefined,
  lang = '',
  muted = false,
  motion = true,
  rate = 1,
}) {
  const { book, media } = useBook();
  const track = useMemo(() => storyTrack(book), [book]);
  const segments = useMemo(() => segmentsOf(track, book), [track, book]);
  const [playing, setPlaying] = useState(false);
  const [board, setBoard] = useState(false);
  const [again, setAgain] = useState(0);

  const i = stepTrack(track, index, 0);
  const stop = track[i];
  const where = whereIn(segments, i);

  const go = useCallback(
    (delta) => {
      setPlaying(false);
      const next = stepTrack(track, i, delta);
      if (next !== i) onMove?.(next);
    },
    [track, i, onMove]
  );

  const goSegment = useCallback(
    (delta) => {
      setPlaying(false);
      const next = jumpSegment(segments, i, delta);
      if (next !== i) onMove?.(next);
    },
    [segments, i, onMove]
  );

  const onEnded = useCallback(() => {
    const next = stepTrack(track, i, 1);
    if (next === i || track[next]?.kind !== 'line') setPlaying(false);
    if (next !== i) onMove?.(next);
  }, [track, i, onMove]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (document.querySelector('dialog[open]') || openPopover()) return;

      if (e.key === ' ' && stop?.kind === 'line') {
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
  }, [go, stop?.kind]);

  useEffect(() => {
    if (stop?.kind !== 'line') setPlaying(false);
  }, [stop?.kind]);

  if (!track.length) return <main className="reader empty">Nothing to read.</main>;

  return (
    <main className="reader solo-reader">
      {stop.kind === 'line' ? (
        <Scene
          key={`${stop.clip ?? `${stop.unit}-${stop.i}`}#${again}`}
          plate={stop.plate}
          visual={stop.visual}
          motion={motion}
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
        <Finish />
      )}

      <div className="transport" role="group" aria-label="Reading controls">
        <button
          type="button"
          className="btn ghost jump"
          onClick={() => goSegment(-1)}
          disabled={i === 0}
          aria-label="Previous scene"
          title="Previous scene"
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
          <span className="transport-note">The end</span>
        )}

        <button
          type="button"
          className="btn"
          onClick={() => go(1)}
          disabled={i === track.length - 1}
        >
          Next ›
        </button>

        <button
          type="button"
          className="btn ghost jump"
          onClick={() => goSegment(1)}
          disabled={where.index >= segments.length - 1 || stop.kind === 'end'}
          aria-label="Next scene"
          title="Next scene"
        >
          <span aria-hidden="true">⟩⟩</span>
        </button>
      </div>

      {stop.kind === 'line' && where.segment ? (
        <p className="where">
          <button type="button" className="where-open" onClick={() => setBoard(true)}>
            <span className="where-act">{where.segment.act || 'Story'}</span>
            <b>{where.segment.title}</b>
            <span>
              {where.through} of {where.span}
            </span>
          </button>
        </p>
      ) : null}

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
