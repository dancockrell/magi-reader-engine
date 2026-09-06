import { mediaOf } from '../book/media.js';
import { segmentsOf, storyTrack } from './track.js';
import { throughOf } from './resume.js';

const wordsIn = (text) => String(text || '').match(/\p{L}+(?:[’']\p{L}+)*/gu)?.length || 0;

/**
 * Facts for the book's front door, derived from the same track the
 * reader opens. The time is an intentionally broad reading estimate at
 * 160 words per minute, rounded up to five minutes; it is orientation,
 * not a promise about narration timing.
 */
export function readingOverview(book, resume = null, tapped = []) {
  const track = storyTrack(book);
  const lines = track.filter((stop) => stop.kind === 'line');
  const wordCount = lines.reduce((sum, stop) => sum + wordsIn(stop.line), 0);
  const minutes = wordCount ? Math.max(5, Math.ceil(wordCount / 160 / 5) * 5) : 0;
  const media = mediaOf(book);

  return {
    scenes: segmentsOf(track, book).length,
    lines: lines.length,
    minutes,
    progress: throughOf(resume),
    tapped: tapped.length,
    narration: !!media.audio && lines.some((line) => !!line.clip),
    explore: !!(
      book?.explore?.intro ||
      book?.explore?.lenses?.length ||
      Object.keys(book?.explore?.units || {}).length
    ),
    framing: !!((book?.preshow || []).length || (book?.afterword || []).length),
  };
}
