import { useRef, useEffect } from 'react';
import { useCueTrack } from './useCueTrack.js';

/**
 * The picture window: one image, one line of narration over it.
 *
 * Two rules the old reader learned the hard way and this keeps:
 *
 *   The picture is never cropped. `object-fit: contain` shows the whole
 *   frame, because a reader that cuts off faces is worse than one with
 *   letterboxing. Any Ken Burns move starts from the full frame.
 *
 *   The subtitle sits ON the picture, once. The same sentence used to
 *   appear three times on one screen — as the big line, as a caption and
 *   again in the translation panel — which is what made the page long
 *   enough to scroll and made the frame drift as text advanced.
 */

/**
 * @param {object} props
 * @param {{id:string,src:string|null,alt:string}} props.plate
 * @param {string} props.line               the words, from the book itself
 * @param {string|null} [props.clip]        audio id, e.g. "n_s1_0"
 * @param {string} [props.audioBase]
 * @param {string} [props.vttBase]
 * @param {string|null} [props.translation] the same line, in the reader's language
 * @param {string} [props.lang]             BCP-47 tag for that translation
 * @param {boolean} [props.playing]
 * @param {()=>void} [props.onEnded]
 */
export default function Scene({
  plate,
  line,
  clip,
  audioBase = '/magi-audio/',
  vttBase = '/vtt/',
  translation = null,
  lang = '',
  playing = false,
  onEnded,
}) {
  const audioRef = useRef(null);
  const vttUrl = clip ? `${vttBase}${clip}.vtt` : null;
  const { words, index } = useCueTrack(audioRef, vttUrl);

  /* Play/pause is driven by the prop, and a rejected play() is not an
     error worth surfacing: browsers refuse autoplay until the reader has
     interacted, which is normal and recoverable. */
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

  /* ------------------------------------------------------------
     The line is always on screen; the highlighting is an extra.

     The first version rendered only the words parsed from the cue file,
     so before that fetch resolved — or if it failed, or if a clip had no
     recording — the subtitle was empty and the student had a picture
     with no text at all. The words come from the book, which is already
     loaded; the cues only decide which one is lit.
     ------------------------------------------------------------ */
  const tokens = words.length
    ? words.map((w) => w.w)
    : String(line || '')
        .split(/\s+/)
        .filter(Boolean);
  const litIndex = words.length ? index : -1;

  return (
    <figure className="scene">
      {plate.src ? (
        <img className="plate" src={plate.src} alt={plate.alt} draggable="false" />
      ) : (
        <div className="plate missing" role="img" aria-label={plate.alt} />
      )}

      <figcaption className="subs" aria-live="off">
        <p className="sub-line" lang="en">
          {tokens.map((t, i) => (
            <span key={`${i}-${t}`} className={i === litIndex ? 'w on' : 'w'}>
              {t}{' '}
            </span>
          ))}
        </p>
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
          {/* The native track as well, so a student who has turned on
              system captions gets them, and so the file is discoverable
              as a caption track rather than only as our own data. */}
          <track
            kind="captions"
            srcLang="en"
            label="English"
            src={vttUrl ?? undefined}
            default
          />
        </audio>
      ) : null}
    </figure>
  );
}
