import { useEffect, useRef, useState } from 'react';
import { wordsByClip, wordAt } from '../lib/media/vtt.js';

/**
 * Word highlighting driven by the media clock.
 *
 * The old reader ran a requestAnimationFrame loop comparing
 * `audio.currentTime` against a private timing table. Two things are
 * wrong with that, and the second bit this project already: rAF stops in
 * a backgrounded tab, and it ties the highlight to the frame rate rather
 * than to the audio.
 *
 * `timeupdate` comes from the media element itself, so it keeps working
 * when the tab is hidden and it is the audio's own clock. The cue text
 * still comes from a real WebVTT file, which is why a translator can fix
 * a timing in Subtitle Edit without touching this code.
 */

/**
 * The whole book's cues, fetched once.
 *
 * Every clip's timing lives in a single WebVTT file — 519 separate ones
 * put the build over itch's 1000-file limit and cost 519 requests. The
 * promise is cached at module scope so that however many Scenes mount,
 * the file is fetched exactly once.
 *
 * @type {Promise<Record<string, {t:number,w:string}[]>>|null}
 */
let cuesPromise = null;

/** @param {string} url */
export function loadCues(url) {
  if (!cuesPromise) {
    cuesPromise = fetch(url)
      .then((r) => (r.ok ? r.text() : ''))
      .then((text) => wordsByClip(text))
      .catch(() => ({}));
  }
  return cuesPromise;
}

/** Testing seam: forget the cached fetch. */
export function resetCues() {
  cuesPromise = null;
}

/**
 * @param {import('react').RefObject<HTMLAudioElement>} audioRef
 * @param {string|null} clip           which recording, e.g. "n_s1_0"
 * @param {string} [cuesUrl]
 */
export function useCueTrack(audioRef, clip, cuesUrl = 'cues/magi.vtt') {
  const [words, setWords] = useState([]);
  const [index, setIndex] = useState(-1);
  const wordsRef = useRef([]);

  useEffect(() => {
    let cancelled = false;
    if (!clip) {
      wordsRef.current = [];
      setWords([]);
      setIndex(-1);
      return undefined;
    }
    loadCues(cuesUrl).then((byClip) => {
      if (cancelled) return;
      const list = byClip[clip] || [];
      wordsRef.current = list;
      setWords(list);
      setIndex(-1);
    });
    return () => {
      cancelled = true;
    };
  }, [clip, cuesUrl]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;

    const tick = () => {
      const list = wordsRef.current;
      if (!list.length) return;
      setIndex(wordAt(list, el.currentTime * 1000));
    };
    const reset = () => setIndex(-1);
    const finish = () => setIndex(wordsRef.current.length - 1);

    el.addEventListener('timeupdate', tick);
    el.addEventListener('seeking', tick);
    el.addEventListener('seeked', tick);
    el.addEventListener('loadedmetadata', reset);
    el.addEventListener('ended', finish);
    return () => {
      el.removeEventListener('timeupdate', tick);
      el.removeEventListener('seeking', tick);
      el.removeEventListener('seeked', tick);
      el.removeEventListener('loadedmetadata', reset);
      el.removeEventListener('ended', finish);
    };
  }, [audioRef]);

  return { words, index };
}
