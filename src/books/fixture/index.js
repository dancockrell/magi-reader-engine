import data from './book.json';

/**
 * The engine's own book, for testing the engine.
 *
 * WHY THIS EXISTS. Fourteen test files used to load `books/magi/book.json`
 * and most of them were not testing that book at all — they were testing
 * beats, tracks, questions, translations and the guide, and reached for
 * the only book in the room. That made the engine inseparable from its
 * first title, which is the one thing the engine/book split is for.
 *
 * So this is a whole book that nobody wrote and nobody owns: four parts
 * in two acts, two background pages, a glossary, questions, written
 * prompts, recaps, a cast, conversations, substitutions, plates and two
 * languages. Complete on purpose — a fixture that carries less than a
 * real pack silently tests less than the real pack did, and the loss
 * shows up years later as a shape nobody covers.
 *
 * IT IS NOT REGISTERED IN `books/index.js`, and it must not be. `BOOKS`
 * is what the reader offers a student, and a fake title in that list is a
 * defect. Nothing outside a test imports this file, so it never enters
 * the bundle: the build reaches `books/index.js` from `main.jsx`, and
 * that file names only the packs this build ships.
 *
 * Two deliberate shapes worth knowing about before changing anything:
 *
 *   `still` is glossed twice with different meanings, in p1 and p4. That
 *   is not a mistake to tidy up — it is how the trainer's "drop a word
 *   with two meanings" rule and the glossary's "keep both" rule are both
 *   exercised, and `validateBook` reports it as a warning by design.
 *
 *   `glimmered` and `flickered` substitute for each other. That is the
 *   ambiguity that made a real substitution question have two right
 *   answers, and it is here so the rule against it stays tested.
 *
 * The media paths and the art filenames point at files that do not
 * exist. Nothing reads them off disk — the tests that check recordings
 * and pictures are really there run against the shipping pack, where
 * that question means something.
 */

/** @type {import('../../lib/types.js').Book} */
export default {
  ...data,
  media: {
    audio: 'fixture-audio/',
    cues: 'cues/fixture.vtt',
  },
};
