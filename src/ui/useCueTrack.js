import { useEffect, useRef, useState } from 'react';
import { wordsFromVtt, wordAt } from '../lib/media/vtt.js';

/**
 * Word highlighting driven by the media clock.
 *
 * The old reader ran a requestAnimationFrame loop comparing
 * `audio.currentTime` against a private timing table. Two things are
 * wrong with that, and the second one bit this project already:
 * rAF stops in a backgrounded tab, and it ties the highlight to the
 * frame rate rather than to the audio.
 *
 * `timeupdate` comes from the media element itself, so it keeps working
 * when the tab is hidden and it is the audio's own clock. The cue text
 * still comes from a real WebVTT file, which is why a translator can fix
 * a timing in Subtitle Edit without touching this code.
 *
 * @param {import('react').RefObject<HTMLAudioElement>} audioRef
 * @param {string|null} vttUrl
 */
export function useCueTrack(audioRef, vttUrl) {
  const [words, setWords] = useState([]);
  const [index, setIndex] = useState(-1);
  const wordsRef = useRef([]);

  /* Fetch and parse the cue once per clip. The <track> element would
     also parse it, but browsers expose inline cue timestamps
     inconsistently, so the file is read directly and the element is
     left to handle the native caption track for anyone who turns
     system captions on. */
  useEffect(() => {
    let cancelled = false;
    if (!vttUrl) {
      setWords([]);
      wordsRef.current = [];
      setIndex(-1);
      return undefined;
    }
    fetch(vttUrl)
      .then((r) => (r.ok ? r.text() : ''))
      .then((text) => {
        if (cancelled) return;
        const list = wordsFromVtt(text);
        wordsRef.current = list;
        setWords(list);
        setIndex(-1);
      })
      .catch(() => {
        if (cancelled) return;
        wordsRef.current = [];
        setWords([]);
      });
    return () => {
      cancelled = true;
    };
  }, [vttUrl]);

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
