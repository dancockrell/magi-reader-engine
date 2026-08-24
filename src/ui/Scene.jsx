import { useRef, useEffect } from 'react';
import { useCueTrack } from './useCueTrack.js';
import { useSpokenLine } from './useSpokenLine.js';
import SpokenText from './SpokenText.jsx';

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
 * @param {string} [props.cuesUrl]           one WebVTT file for the whole book
 * @param {string|null} [props.translation] the same line, in the reader's language
 * @param {string} [props.lang]             BCP-47 tag for that translation
 * @param {Record<string,string>} [props.gloss]     the words this unit explains
 * @param {(w:string)=>string|null} [props.wordIn]  those meanings, translated
 * @param {boolean} [props.playing]
 * @param {boolean} [props.muted]
 * @param {number} [props.rate]
 * @param {()=>void} [props.onEnded]
 */
export default function Scene({
  plate,
  line,
  clip,
  /* Where this book's media sits, from the pack. No default: a default
     here would be one book's folder name living in the engine, which is
     the whole thing the pack format exists to stop. */
  audioBase = '',
  cuesUrl = '',
  translation = null,
  lang = '',
  gloss = {},
  wordIn,
  playing = false,
  muted = false,
  rate = 1,
  onEnded,
}) {
  const audioRef = useRef(null);
  const { words, index } = useCueTrack(audioRef, clip, cuesUrl);

  /* Set on the element rather than passed as an attribute: React does
     not reflect `muted` to the DOM property reliably, and playbackRate
     has no attribute at all. Both are reapplied whenever the clip
     changes, because a new element starts at the defaults. */
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = muted;
    el.playbackRate = rate;
  }, [muted, rate, clip]);

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
     with no text at all.

     The second version rendered them once the fetch DID resolve, which
     was worse and harder to see: the cue text is a transcript with no
     punctuation, so the moment the audio loaded, O. Henry lost every
     comma he wrote. The words come from the book. Always.
     ------------------------------------------------------------ */
  const { tokens, lit: litIndex } = useSpokenLine(line, words, index);

  return (
    <figure className="scene">
      {plate.src ? (
        <img className="plate" src={plate.src} alt={plate.alt} draggable="false" />
      ) : (
        <div className="plate missing" role="img" aria-label={plate.alt} />
      )}

      <figcaption className="subs" aria-live="off">
        <SpokenText tokens={tokens} lit={litIndex} gloss={gloss} wordIn={wordIn} />
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
          {/* The native track points at the same standard file. It
              carries every clip's cues rather than only this one, so the
              browser's own caption UI shows the whole reading — which is
              what a student using system captions wants anyway. */}
          <track kind="captions" srcLang="en" label="English" src={cuesUrl} />
        </audio>
      ) : null}
    </figure>
  );
}
