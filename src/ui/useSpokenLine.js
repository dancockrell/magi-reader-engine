import { useMemo } from 'react';
import { alignCues } from '../lib/media/vtt.js';

/**
 * The book's words, and which one is being said.
 *
 * Shared by the reading and by the two characters, because the rule is
 * the same in both places and it was worth getting wrong only once: what
 * is on screen is the text the book wrote, punctuation and all. The cue
 * file times the speech; it does not supply the words. It has no
 * punctuation in it at all.
 *
 * @param {string} text            the line, from the book
 * @param {{w:string}[]} cues      the recording's word timings
 * @param {number} index           which cue is current, or -1
 * @returns {{tokens:string[], lit:number}}
 */
export function useSpokenLine(text, cues, index) {
  const tokens = useMemo(
    () =>
      String(text || '')
        .split(/\s+/)
        .filter(Boolean),
    [text]
  );

  const map = useMemo(() => (cues.length ? alignCues(tokens, cues) : []), [tokens, cues]);

  return { tokens, lit: index >= 0 && index < map.length ? map[index] : -1 };
}
