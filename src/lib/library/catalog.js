import magi from '../../books/magi/index.js';

export const CATALOG = [
  {
    id: 'magi',
    title: 'The Gift of the Magi',
    author: 'O. Henry',
    kind: 'Short story',
    note: 'Love, sacrifice, and the joke hidden inside a perfect gift.',
    local: magi,
    featured: true,
    framing: {
      intro: [
        {
          who: 'wren',
          text: 'I like this one because it starts with almost nothing: a few coins, Christmas tomorrow, and Della trying very hard not to despair.',
          state: 'warm',
          clip: null,
        },
        {
          who: 'prof',
          text: 'And O. Henry knows exactly how much to tell us. He writes like a clever storyteller across the table from you — amused, sympathetic, and always keeping one card out of sight.',
          state: 'talk',
          clip: null,
        },
        {
          who: 'wren',
          text: 'So we are not going to explain the trick first. Read the story. Tap a word if you need it. We can talk after the ending has had its chance.',
          state: 'happy',
          clip: null,
        },
      ],
      afterword: [
        {
          who: 'wren',
          text: 'That ending is funny for about half a second, and then it is not really funny at all.',
          state: 'thoughtful',
          clip: null,
        },
        {
          who: 'prof',
          text: 'Exactly. The irony is the mechanism, not the meaning. Each gift becomes useless, but each sacrifice proves something far more valuable than the object they meant to buy.',
          state: 'talk',
          clip: null,
        },
        {
          who: 'wren',
          text: 'Which is why the story can feel sweet without pretending that being poor is sweet.',
          state: 'soft',
          clip: null,
        },
        {
          who: 'prof',
          text: 'A very important distinction. If you want to see how O. Henry builds that balance — and why he calls these two young people the Magi — open my notes in Explore.',
          state: 'warm',
          clip: null,
        },
      ],
    },
  },
  {
    id: 'raven',
    title: 'The Raven',
    author: 'Edgar Allan Poe',
    kind: 'Poem',
    note: 'A midnight visitor, a grieving mind, and one word that will not leave.',
    mediaNote: 'Narration and subtitles are ready. The recovered per-line art still needs publishing.',
    remote: {
      book: 'https://raw.githubusercontent.com/dancockrell/the-raven-edgar-allan-poe-magi-reader/main/pack/book.json',
      base: 'https://raw.githubusercontent.com/dancockrell/the-raven-edgar-allan-poe-magi-reader/main/pack/',
      audio: 'audio/',
      cues: 'cues/raven.vtt',
    },
    framing: {
      intro: [
        {
          who: 'wren',
          text: 'This poem sounds better aloud than it does silently in your head. Let the rhythm do some of the work before you worry about explaining every line.',
          state: 'curious',
          clip: null,
        },
        {
          who: 'prof',
          text: 'Poe designed it that way. Repetition, internal rhyme, long vowels, and that relentless refrain make the poem feel as if it is closing a door a little further each time.',
          state: 'talk',
          clip: null,
        },
        {
          who: 'wren',
          text: 'And if an old word gets in the way, tap it. Otherwise, stay with the speaker and the bird. Grandpa can explain the machinery later.',
          state: 'happy',
          clip: null,
        },
      ],
      afterword: [
        {
          who: 'wren',
          text: 'The raven barely does anything. It is the man who keeps making the room worse.',
          state: 'thoughtful',
          clip: null,
        },
        {
          who: 'prof',
          text: 'That is one of the poem’s cruellest ideas. The bird has one answer. The speaker keeps inventing more painful questions for it, until “Nevermore” becomes whatever his grief most fears hearing.',
          state: 'talk',
          clip: null,
        },
        {
          who: 'wren',
          text: 'So the horror is not really that a raven talks. It is watching somebody use the raven to trap himself.',
          state: 'soft',
          clip: null,
        },
        {
          who: 'prof',
          text: 'Precisely. Explore is where we can look at the sound pattern, Lenore, the strange classical references, and the way Poe turns repetition into pressure.',
          state: 'warm',
          clip: null,
        },
      ],
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
