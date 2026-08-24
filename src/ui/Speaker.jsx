import { useEffect, useRef } from 'react';
import { useCueTrack } from './useCueTrack.js';
import { useSpokenLine } from './useSpokenLine.js';

/**
 * One person, saying one thing.
 *
 * Deliberately not "the dialogue box". A box implies something a caller
 * writes into, and the reader used to have one of those: whoever spoke
 * last won, so Wren landed on top of the Professor mid-sentence. This
 * renders the turn it is given and owns nothing, which means it cannot be
 * the place two speakers collide.
 *
 * The words are highlighted from the same WebVTT file and the same media
 * clock the narration uses. Speech is not a second timing mechanism.
 */

/**
 * @param {object} props
 * @param {import('../lib/speech/script.js').Turn} props.turn
 * @param {{id:string, name:string, art?:string, blurb?:string}} props.who
 * @param {string} [props.audioBase]
 * @param {string} [props.cuesUrl]
 * @param {boolean} [props.playing]
 * @param {boolean} [props.muted]
 * @param {number} [props.rate]
 * @param {()=>void} [props.onEnded]
 * @param {string} [props.className]
 */
export default function Speaker({
  turn,
  who,
  audioBase = 'magi-audio/',
  cuesUrl = 'cues/magi.vtt',
  playing = false,
  muted = false,
  rate = 1,
  onEnded,
  className = '',
}) {
  const audioRef = useRef(/** @type {HTMLAudioElement|null} */ (null));
  const clip = turn?.clip || null;
  const { words, index } = useCueTrack(audioRef, clip, cuesUrl);
  /* The words are the book's, punctuation and all. The cue file is a
     transcript with none — see useSpokenLine. */
  const { tokens, lit } = useSpokenLine(turn?.text, words, index);

  /* See Scene: `muted` is a DOM property React does not reflect, and
     playbackRate has no attribute at all. */
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

  if (!turn) return null;

  return (
    <div
      className={`speaker ${className}`.trim()}
      data-who={who.id}
      data-state={turn.state || undefined}
    >
      <div className="sp-face">
        {who.art ? (
          <img src={who.art} alt="" draggable="false" />
        ) : (
          <span className="sp-noface" aria-hidden="true">
            {(who.name || '?').slice(0, 1)}
          </span>
        )}
      </div>

      <div className="sp-said">
        <p className="sp-name">{who.name}</p>
        <p className="sp-text" lang="en">
          {tokens.map((t, i) => (
            <span key={`${i}-${t}`} className={i === lit ? 'w on' : 'w'}>
              {t}{' '}
            </span>
          ))}
        </p>
      </div>

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
    </div>
  );
}
