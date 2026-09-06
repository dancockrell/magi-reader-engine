import { useRef, useEffect, useState } from 'react';
import { useCueTrack } from './useCueTrack.js';
import { useSpokenLine } from './useSpokenLine.js';
import SpokenText from './SpokenText.jsx';

/**
 * One narrated story line.
 *
 * Narration owns time and progression. Visual media is deliberately
 * subordinate to it: a generated clip is muted, plays alongside the
 * narration, and never advances the reader on its own. If a clip is not
 * ready yet, the same storyboard entry still works with one or two key
 * images, which is what lets art production proceed line by line.
 */
export default function Scene({
  plate,
  visual = null,
  film = '',
  filmLoop = true,
  motion = true,
  line,
  clip,
  audioBase = '',
  cuesUrl = '',
  translation = null,
  lang = '',
  gloss = {},
  wordIn = undefined,
  onTap = undefined,
  playing = false,
  restartToken = 0,
  muted = false,
  rate = 1,
  onEnded = undefined,
  onFilmEnded = undefined,
  onAudioUnavailable = undefined,
  onPlaybackBlocked = undefined,
}) {
  const audioRef = useRef(null);
  const filmRef = useRef(null);
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const [failedFilm, setFailedFilm] = useState('');
  const [, setAudioDuration] = useState(0);
  const { words, index } = useCueTrack(audioRef, clip, cuesUrl);

  useEffect(() => {
    setAudioUnavailable(false);
    setAudioDuration(0);
  }, [clip, audioBase]);

  useEffect(() => {
    setImageUnavailable(false);
  }, [plate.src]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = muted;
    el.playbackRate = rate;
  }, [muted, rate, clip]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (restartToken) el.currentTime = 0;
  }, [restartToken]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      const p = el.play();
      if (p && typeof p.catch === 'function') p.catch(() => onPlaybackBlocked?.());
    } else {
      el.pause();
    }
  }, [playing, clip, restartToken, onPlaybackBlocked]);

  useEffect(() => {
    const el = filmRef.current;
    if (!el) return;
    const p = el.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }, [film, motion, failedFilm]);

  const { tokens, lit: litIndex } = useSpokenLine(line, words, index);
  const hasFilm = motion && !!film && failedFilm !== film;
  const hasPair = motion && !hasFilm && !!visual?.end && !!(visual?.start || plate.src);
  const duration = Number(visual?.duration) > 0 ? Number(visual.duration) : 5;
  const visualStyle = /** @type {import('react').CSSProperties & Record<string, string>} */ ({
    '--visual-duration': `${duration}s`,
  });

  return (
    <figure className="scene">
      {imageUnavailable && !hasFilm ? (
        <div className="plate missing" role="img" aria-label={plate.alt}>
          <span aria-hidden="true">Illustration unavailable</span>
        </div>
      ) : hasFilm ? (
        <video
          ref={filmRef}
          className="plate visual-clip"
          src={film}
          poster={plate.src || undefined}
          aria-label={plate.alt}
          loop={filmLoop}
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={onFilmEnded}
          onError={() => setFailedFilm(film)}
        />
      ) : hasPair ? (
        <div
          className={'plate keyframe-pair' + (playing ? ' playing' : '')}
          style={visualStyle}
          role="img"
          aria-label={plate.alt}
        >
          <img
            className="keyframe start"
            src={visual.start || plate.src}
            alt=""
            draggable="false"
            onError={() => setImageUnavailable(true)}
          />
          <img
            className="keyframe end"
            src={visual.end}
            alt=""
            draggable="false"
            onError={() => setImageUnavailable(true)}
          />
        </div>
      ) : plate.src ? (
        <img
          className="plate"
          src={plate.src}
          alt={plate.alt}
          draggable="false"
          onError={() => setImageUnavailable(true)}
        />
      ) : (
        <div className="plate missing" role="img" aria-label={plate.alt} />
      )}

      <figcaption className="subs" aria-live="off">
        <SpokenText
          tokens={tokens}
          lit={litIndex}
          gloss={gloss}
          wordIn={wordIn}
          onTap={onTap}
        />
        {translation ? (
          <p className="sub-tr" lang={lang || undefined}>
            {translation}
          </p>
        ) : null}
      </figcaption>

      {motion && film && failedFilm === film ? (
        <p className="media-note" role="status">
          Film unavailable — the illustrated reading can continue.{' '}
          <button type="button" className="btn ghost" onClick={() => setFailedFilm('')}>
            Retry film
          </button>
        </p>
      ) : null}

      {audioUnavailable ? (
        <p className="media-note" role="status">
          Narration unavailable — you can still read.
        </p>
      ) : null}

      {clip ? (
        <audio
          ref={audioRef}
          src={`${audioBase}${clip}.mp3`}
          preload="auto"
          onLoadedMetadata={(event) => {
            const duration = Number(event.currentTarget.duration);
            setAudioDuration(Number.isFinite(duration) && duration > 0 ? duration : 0);
          }}
          onEnded={onEnded}
          onError={() => {
            setAudioUnavailable(true);
            onAudioUnavailable?.();
          }}
          crossOrigin="anonymous"
        >
          <track kind="captions" srcLang="en" label="English" src={cuesUrl} />
        </audio>
      ) : null}
    </figure>
  );
}
