import magi from '../../books/magi/index.js';

/**
 * The bookshelf is deliberately small and curated.
 *
 * A catalog entry is not a bundled book. `local` is used only for the
 * title that ships with the app. Remote entries describe a Git-hosted
 * pack that is fetched only when the reader opens it.
 */
export const CATALOG = [
  {
    id: 'magi',
    title: 'The Gift of the Magi',
    author: 'O. Henry',
    kind: 'Short story',
    note: 'Love, sacrifice, and the joke hidden inside a perfect gift.',
    local: magi,
    featured: true,
  },
  {
    id: 'raven',
    title: 'The Raven',
    author: 'Edgar Allan Poe',
    kind: 'Poem',
    note: 'A midnight visitor, a grieving mind, and one word that will not leave.',
    remote: {
      book: 'https://raw.githubusercontent.com/dancockrell/the-raven-edgar-allan-poe-magi-reader/main/pack/book.json',
      base: 'https://raw.githubusercontent.com/dancockrell/the-raven-edgar-allan-poe-magi-reader/main/pack/',
      plate: 'art/plate-{scene}.webp',
      beatPlate: 'art/beat-{scene}-{line}.webp',
      cast: {
        wren: 'art/cast-wren.webp',
        prof: 'art/cast-prof.webp',
      },
      audio: 'audio/',
      cues: 'cues/raven.vtt',
    },
  },
  {
    id: 'rikki-tikki-tavi',
    title: 'Rikki-Tikki-Tavi',
    author: 'Rudyard Kipling',
    kind: 'Short story',
    note: 'A mongoose, a garden, and a very serious fight with cobras.',
    comingSoon: true,
  },
  {
    id: 'three-little-pigs',
    title: 'The Three Little Pigs',
    author: 'Traditional',
    kind: 'Fairy tale',
    note: 'Three houses, one wolf, and a story built for visual storytelling.',
    comingSoon: true,
  },
  {
    id: 'tortoise-and-hare',
    title: 'The Tortoise and the Hare',
    author: 'Aesop',
    kind: 'Fable',
    note: 'Speed is useful. So is actually finishing what you started.',
    comingSoon: true,
  },
  {
    id: 'lion-and-mouse',
    title: 'The Lion and the Mouse',
    author: 'Aesop',
    kind: 'Fable',
    note: 'A small kindness becomes much larger when it comes back around.',
    comingSoon: true,
  },
];

export function catalogBook(id) {
  return CATALOG.find((entry) => entry.id === id) || null;
}
