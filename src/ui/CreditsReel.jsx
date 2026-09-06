/* eslint-disable jsx-a11y/media-has-caption -- the score is instrumental and has no speech */
import { useCallback, useEffect, useRef, useState } from 'react';

const CARD_TIME = 5200;

export default function CreditsReel({ credits, title, muted = false, motion = true, onDone }) {
  const cards = credits?.cards || [];
  const [at, setAt] = useState(0);
  const audioRef = useRef(null);
  const card = cards[at];

  const finish = useCallback(() => onDone?.(), [onDone]);

  useEffect(() => {
    if (!card) {
      finish();
      return undefined;
    }
    const wait = motion ? CARD_TIME : Math.min(2400, CARD_TIME);
    const timer = window.setTimeout(() => {
      if (at >= cards.length - 1) finish();
      else setAt((n) => n + 1);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [at, card, cards.length, finish, motion]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || muted) return;
    audio.volume = 0.18;
    const play = audio.play();
    if (play && typeof play.catch === 'function') play.catch(() => {});
  }, [muted]);

  if (!card) return null;

  return (
    <section className="credit-reel" aria-label={`${title} credits`}>
      <img key={`${at}-image`} className="credit-image" src={card.image} alt={card.alt || ''} />
      <div key={`${at}-copy`} className="credit-shade">
        <p className="credit-kicker">{card.kicker}</p>
        <h2>{card.title}</h2>
        <p>{card.text}</p>
      </div>

      <div className="credit-progress" aria-label={`Credit ${at + 1} of ${cards.length}`}>
        {cards.map((_, i) => (
          <span key={i} className={i === at ? 'current' : ''} aria-hidden="true" />
        ))}
      </div>

      <button className="credit-skip" type="button" onClick={finish}>
        Skip credits
      </button>

      {credits.score && !muted ? (
        <audio
          ref={audioRef}
          src={credits.score}
          preload="auto"
          onLoadedMetadata={(event) => {
            const cue = Math.max(0, Number(credits.scoreCue) || 0);
            if (cue < event.currentTarget.duration) event.currentTarget.currentTime = cue;
          }}
        />
      ) : null}
    </section>
  );
}

export { CARD_TIME };
