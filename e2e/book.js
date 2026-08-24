import { readFileSync } from 'node:fs';
import { trackFor, segmentsOf } from '../src/lib/reader/track.js';

/**
 * What the book actually contains, for the tests that need to say where
 * they are.
 *
 * These were written out as literals — "1 of 244", "Segment 3 of 12" —
 * and the moment Wren and the Professor were given their conversations
 * back, eleven correct tests went red for the wrong reason. The number is
 * never what those tests are about: they are about Next advancing by one,
 * a deep link landing where it says, the progress bar matching the track.
 *
 * That the reading really is 244 lines long is a claim worth making, so
 * it is made once, in a unit test against the book, where it belongs.
 */

const book = JSON.parse(readFileSync('src/books/magi/book.json', 'utf8'));

const track = trackFor(book, 1);

export const TOTAL = track.length;
export const SEGMENTS = segmentsOf(track, book).length;

/** The position readout in reading 1, as the reader prints it. */
export const at = (n) => `${n} of ${TOTAL}`;

/** The same, in whichever reading. */
export const atIn = (pass, n) => `${n} of ${trackFor(book, pass).length}`;

/** The segment readout, as the reader prints it. */
export const segment = (n) => `Segment ${n} of ${SEGMENTS}`;
