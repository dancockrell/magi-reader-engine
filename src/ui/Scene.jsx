import { useRef, useEffect } from 'react';
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
  motion = true,
  line,
  clip,
  audioBase = '',
  cuesUrl = '',
  translation = null,
  lang = '',
  gloss = {},
  wordIn,
  onTap,
  playing = false,
  muted = false,
  rate = 1,
  onEnded,
}) {
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const { words, index } = useCueTrack(audioRef, clip, cuesUrl);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = muted;
    el.playbackRate = rate;
  }, [muted, rate, clip]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      const p = el.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } else {
      el.pause();
    }
  }, [playing, clip]);

  /* Visual clips follow the narration but do not control it. A shorter
     clip simply rests on its last frame; a longer one is paused when the
     narration advances to the next line. */
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.playbackRate = rate;
    if (playing && motion) {
      const p = el.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } else {
      el.pause();
    }
  }, [playing, motion, rate, visual?.clip]);

  const { tokens, lit: litIndex } = useSpokenLine(line, words, index);
  const hasVideo = motion && !!visual?.clip;
  const hasPair = motion && !hasVideo && !!visual?.end && !!(visual?.start || plate.src);
  const duration = Number(visual?.duration) > 0 ? Number(visual.duration) : 5;
  const visualStyle = /** @type {import('react').CSSProperties & Record<string, string>} */ ({
    '--visual-duration': `${duration}s`,
  });

  return (
    <figure className="scene">
      {hasVideo ? (
        <video
          ref={videoRef}
          className="plate visual-clip"
          src={visual.clip}
          poster={visual.start || plate.src || undefined}
          aria-label={plate.alt}
          muted
          playsInline
          preload="metadata"
        />
      ) : hasPair ? (
        <div
          className={'plate keyframe-pair' + (playing ? ' playing' : '')}
          style={visualStyle}
          role="img"
          aria-label={plate.alt}
        >
          <img className="keyframe start" src={visual.start || plate.src} alt="" draggable="false" />
          <img className="keyframe end" src={visual.end} alt="" draggable="false" />
        </div>
      ) : plate.src ? (
        <img className="plate" src={plate.src} alt={plate.alt} draggable="false" />
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

      {clip ? (
        <audio
          ref={audioRef}
          src={`${audioBase}${clip}.mp3`}
          preload="auto"
          onEnded={onEnded}
          crossOrigin="anonymous"
        >
          <track kind="captions" srcLang="en" label="English" src={cuesUrl} />
        </audio>
      ) : null}
    </figure>
  );
}
