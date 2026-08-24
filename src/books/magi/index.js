import data from './book.json';

/**
 * The Gift of the Magi, as a pack.
 *
 * `book.json` is what the extractor produces — the story, the teaching,
 * the characters, the translations. This file is the rest of the pack:
 * where its media actually sits once it is built and uploaded.
 *
 * That split matters. The extractor's output should be portable data
 * with no deployment in it, and the paths below are deployment: they
 * depend on how `tools/copy-assets.mjs` lays the files out, not on
 * anything O. Henry wrote.
 *
 * Relative, with no leading slash — see MEDIA_BASE in reader/beats.js.
 * itch serves a game from a nested path, so "/magi-audio/x.mp3"
 * resolves against the domain root and 404s for every clip.
 */

/** @type {import('../../lib/types.js').Book} */
export default {
  ...data,
  media: {
    audio: 'magi-audio/',
    cues: 'cues/magi.vtt',
  },
};
