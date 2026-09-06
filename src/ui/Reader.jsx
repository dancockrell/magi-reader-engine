/* eslint-disable jsx-a11y/media-has-caption -- the persistent background track is instrumental */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Scene from './Scene.jsx';
import Storyboard from './Storyboard.jsx';
import Finish from './Finish.jsx';
import OpeningSequence from './OpeningSequence.jsx';
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
 * literary work. Opening a title goes directly to its first line.
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
  const { book, media, title } = useBook();
  const track = useMemo(() => storyTrack(book), [book]);
  const segments = useMemo(() => segmentsOf(track, book), [track, book]);
  const [playing, setPlaying] = useState(false);
  const [board, setBoard] = useState(false);
  const [focusView, setFocusView] = useState(false);
  const [again, setAgain] = useState(0);
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const [opening, setOpening] = useState(index === 0 && !!book.opening);
  const scoreRef = useRef(null);

  const i = stepTrack(track, index, 0);
  const stop = track[i];
  const where = whereIn(segments, i);
  const author = book.meta?.author || book.meta?.by || '';
  const visual = stop?.visual;
  const cinematicFilm = motion ? book.cinematicFilm || '' : '';

  useEffect(() => {
    setOpening(index === 0 && !!book.opening);
  }, [book.opening, index]);

  useEffect(() => {
    const score = scoreRef.current;
    if (!score) return;
    score.volume = 0.11;
    if (playing && !muted) {
      const play = score.play();
      if (play && typeof play.catch === 'function') play.catch(() => {});
    } else {
      score.pause();
    }
  }, [muted, playing]);

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
    if (cinematicFilm && track[next]?.kind !== 'line') return;
    if (next === i || track[next]?.kind !== 'line') setPlaying(false);
    if (next !== i) onMove?.(next);
  }, [track, i, onMove, cinematicFilm]);

  const onFilmEnded = useCallback(() => {
    const next = stepTrack(track, i, 1);
    setPlaying(false);
    if (next !== i) onMove?.(next);
  }, [track, i, onMove]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setFocusView(false);
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || opening || board) return;
      if (
        e.target instanceof Element &&
        e.target.closest(
          'button, a, input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="slider"]'
        )
      )
        return;
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
  }, [go, stop?.kind, opening, board]);

  useEffect(() => {
    if (stop?.kind !== 'line') setPlaying(false);
  }, [stop?.kind]);

  useEffect(() => {
    setAudioUnavailable(false);
  }, [stop?.clip]);

  if (!track.length) return <main className="reader empty">Nothing to read.</main>;

  return (
    <main className={`reader solo-reader${focusView ? ' focus-view' : ''}`}>
      {/* The visible subtitle changes in place while focus stays on the
          transport. A sighted reader sees that immediately; assistive
          technology needs the same transition stated explicitly. Keep
          word-by-word highlighting out of this region — announcing the
          whole literary line once is useful, announcing every lit word
          would talk over the narration. */}
      <p className="sr-only reader-status" role="status" aria-atomic="true">
        {opening
          ? `Opening ${title}${author ? ` by ${author}` : ''}.`
          : stop.kind === 'line'
            ? stop.line
            : 'The end of the book.'}
      </p>

      {opening && book.opening ? (
        <OpeningSequence
          opening={book.opening}
          title={title}
          author={author}
          muted={muted}
          motion={motion}
          onFinish={() => {
            setOpening(false);
            setPlaying(true);
          }}
          onSkip={() => setOpening(false)}
        />
      ) : stop.kind === 'line' ? (
        <Scene
          plate={stop.plate}
          visual={visual}
          film={cinematicFilm}
          filmLoop={book.cinematicLoop !== false}
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
          restartToken={again}
          muted={muted}
          rate={rate}
          onEnded={onEnded}
          onFilmEnded={onFilmEnded}
          onAudioUnavailable={() => {
            setPlaying(false);
            setAudioUnavailable(true);
          }}
          onPlaybackBlocked={() => setPlaying(false)}
        />
      ) : (
        <Finish muted={muted} motion={motion} />
      )}

      {!opening ? (
        <div className="transport" role="group" aria-label="Reading controls">
          <button
            type="button"
            className="btn ghost jump jump-prev"
            onClick={() => goSegment(-1)}
            disabled={i === 0}
            aria-label="Previous scene"
            title="Previous scene"
          >
            <span aria-hidden="true">⟨⟨</span>
          </button>

          <button
            type="button"
            className="btn transport-back"
            onClick={() => go(-1)}
            disabled={i === 0}
          >
            ‹ Back
          </button>

          {stop.kind === 'line' ? (
            <>
              {audioUnavailable ? (
                <span className="transport-note">No narration</span>
              ) : (
                <button
                  type="button"
                  className="btn primary play"
                  onClick={() => setPlaying((p) => !p)}
                  aria-pressed={playing}
                >
                  <T>{playing ? 'Pause' : 'Play'}</T>
                </button>
              )}
              <button
                type="button"
                className="btn transport-again"
                onClick={() => {
                  setAudioUnavailable(false);
                  setAgain((n) => n + 1);
                  setPlaying(true);
                }}
              >
                <span aria-hidden="true">↻ </span>
                {audioUnavailable ? 'Try narration' : 'Again'}
              </button>
            </>
          ) : (
            <span className="transport-note">The end</span>
          )}

          <button
            type="button"
            className="btn transport-next"
            onClick={() => go(1)}
            disabled={i === track.length - 1}
          >
            Next ›
          </button>

          <button
            type="button"
            className="btn ghost jump jump-next"
            onClick={() => goSegment(1)}
            disabled={where.index >= segments.length - 1 || stop.kind === 'end'}
            aria-label="Next scene"
            title="Next scene"
          >
            <span aria-hidden="true">⟩⟩</span>
          </button>
          <button
            type="button"
            className="btn ghost focus-toggle"
            aria-pressed={focusView}
            onClick={() => setFocusView((value) => !value)}
            title="Hide the navigation. Escape to return."
          >
            {focusView ? 'Exit focus' : 'Focus view'}
          </button>
        </div>
      ) : null}

      {!opening && stop.kind === 'line' && where.segment ? (
        <p className="where">
          <button
            type="button"
            className="seg-open where-open"
            onClick={() => setBoard(true)}
            aria-label={`Open story map. ${where.segment.act || 'Story'}, ${where.segment.title}, ${where.through} of ${where.span}`}
          >
            <span className="where-act">{where.segment.act || 'Story'}</span>
            <b className="title">{where.segment.title}</b>
            <span className="count">
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

      {book.credits?.score ? (
        <audio ref={scoreRef} src={book.credits.score} preload="metadata" loop />
      ) : null}
    </main>
  );
}
