/**
 * Where a pack keeps its recordings.
 *
 * A pack declares its own media, because the engine must not know the
 * name of a single folder or cue file — that is what lets a second title
 * be a new pack and no new code. This lives with the rest of the
 * book-reading helpers rather than in the pack index, so that a screen
 * asking where the audio is does not have to import the list of books
 * this build happens to ship.
 *
 * Defensive about a pack with no media at all: a missing recording is a
 * quiet scene, not a crash. Typed on the one property it reads rather
 * than on a whole `Book`, because "a pack that declares no media" is a
 * case this answers on purpose and a half-built pack should be able to
 * ask the question.
 *
 * @param {{media?: {audio?: string, cues?: string}}|null|undefined} book
 * @returns {{audio:string, cues:string}}
 */
export function mediaOf(book) {
  return {
    audio: book?.media?.audio || '',
    cues: book?.media?.cues || '',
  };
}
