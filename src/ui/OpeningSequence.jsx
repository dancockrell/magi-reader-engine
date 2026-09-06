/* eslint-disable jsx-a11y/media-has-caption -- the opening contains effects, never speech */
import { useEffect, useRef, useState } from 'react';

const TITLE_CARD_TIME = 1500;
const STILL_TIME = 1400;

export default function OpeningSequence({
  opening,
  title,
  author,
  muted,
  motion,
  onFinish,
  onSkip = undefined,
}) {
  const videoRef = useRef(null);
  const [phase, setPhase] = useState('title');
  const [dissolving, setDissolving] = useState(false);
  const [forcedMuted, setForcedMuted] = useState(false);

  useEffect(() => {
    if (phase !== 'title') return undefined;
    const timer = window.setTimeout(
      () => {
        if (motion) setPhase('book');
        else onFinish();
      },
      motion ? TITLE_CARD_TIME : STILL_TIME
    );
    return () => window.clearTimeout(timer);
  }, [motion, onFinish, phase]);

  useEffect(() => {
    if (phase !== 'book') return undefined;
    const video = videoRef.current;
    if (!video) return undefined;
    video.volume = 0.32;
    video.muted = muted;
    const play = video.play();
    if (play && typeof play.catch === 'function') {
      play.catch(() => {
        video.muted = true;
        setForcedMuted(true);
        const quietPlay = video.play();
        if (quietPlay && typeof quietPlay.catch === 'function') quietPlay.catch(() => {});
      });
    }

    const fallback = window.setTimeout(
      onFinish,
      (Number(opening.duration) || 4.1) * 1000 + 500
    );
    return () => window.clearTimeout(fallback);
  }, [muted, onFinish, opening.duration, phase]);

  const scene = opening.scene || opening.poster || '';
  const titlePoster = opening.titlePoster || opening.poster || scene;

  return (
    <section
      className={`opening-master ${phase}-phase${dissolving ? ' dissolving' : ''}${motion ? '' : ' still'}`}
      aria-label={`Opening ${title}`}
    >
      {phase === 'title' ? (
        <div className="opening-title-card">
          {titlePoster ? (
            <img className="opening-title-poster" src={titlePoster} alt="" />
          ) : null}
          <div className="opening-title-shade" />
          <div className="opening-title-copy">
            <span>A short story</span>
            <h1>{title}</h1>
            {author ? <p>by {author}</p> : null}
          </div>
        </div>
      ) : motion ? (
        <>
          <video
            ref={videoRef}
            src={opening.video}
            poster={opening.poster || undefined}
            muted={muted || forcedMuted}
            playsInline
            preload="auto"
            onTimeUpdate={(event) => {
              if (event.currentTarget.currentTime >= (Number(opening.dissolveAt) || 3.1)) {
                setDissolving(true);
              }
            }}
            onEnded={onFinish}
          />
          {scene ? (
            <img className="opening-match-frame" src={scene} alt="" aria-hidden="true" />
          ) : null}
        </>
      ) : scene ? (
        <img className="opening-still-image" src={scene} alt="" />
      ) : null}

      <button
        className="opening-master-skip"
        type="button"
        onClick={() => (onSkip ? onSkip() : onFinish())}
      >
        Skip opening
      </button>
    </section>
  );
}

export { STILL_TIME, TITLE_CARD_TIME };
