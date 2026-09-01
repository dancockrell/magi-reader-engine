export const CATALOG = [
  {
    id: 'magi',
    title: 'The Gift of the Magi',
    author: 'O. Henry',
    kind: 'Short story',
    note: 'Love, sacrifice, and the joke hidden inside a perfect gift.',
    local: () => import('../../books/magi/index.js').then((module) => module.default),
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
    explore: {
      intro: {
        title: 'Do not reduce this to “the twist”',
        text: 'The famous ending matters, but O. Henry spends most of the story teaching us how Della and Jim value things. Watch the numbers, the shabby apartment, the two treasures, and the narrator’s jokes. By the time the gifts fail as objects, the story has already changed the meaning of value.',
      },
      lenses: [
        {
          kicker: 'Voice',
          title: 'The narrator is in the room with you',
          text: 'He comments on his own metaphors, calls us “dear friends,” looks politely away from an embrace, and keeps making little jokes. That friendly voice lets the story move between poverty, comedy, and tenderness without becoming either cold or sugary.',
          lookFor:
            '“Forget the hashed metaphor,” “dear friends,” and the ten seconds when the narrator asks us to look elsewhere.',
        },
        {
          kicker: 'Value',
          title: 'The story keeps doing arithmetic — then breaks arithmetic',
          text: '$1.87, $8 a week, $20 wages, $20 for the hair, $21 for the chain: prices are everywhere. O. Henry makes us count because the couple has to count. Then he gives us two gifts whose practical value becomes zero and asks whether that makes the giving worthless.',
          lookFor:
            'Every exact dollar amount, especially the shift from Della’s $1.87 to the narrator’s “eight dollars a week or a million a year.”',
        },
        {
          kicker: 'Structure',
          title: 'Two treasures, two sacrifices, two impossible gifts',
          text: 'The plot is almost perfectly symmetrical. Jim’s watch and Della’s hair are introduced together; each secretly gives up one treasure to honor the other; each receives an object meant for the treasure that is gone. The symmetry makes the final reversal feel inevitable after it surprises us.',
          lookFor:
            'The “two possessions” paragraph in Part 4 and the paired reveals in Parts 10 and 11.',
        },
        {
          kicker: 'Irony',
          title: 'The joke is not on Della and Jim',
          text: 'A weaker version of this story would laugh at two foolish people who bought useless gifts. O. Henry does the opposite. The practical failure exposes the emotional success: each independently chose the other person over the thing they loved most.',
          lookFor:
            'The last paragraph’s deliberate collision between “foolish,” “unwisely,” and “wisest.”',
        },
      ],
      units: {
        s1: 'Notice how often the exact amount returns. Repetition makes $1.87 feel less like information and more like a wall Della keeps walking into.',
        s2: 'The broken mailbox, useless bell, shrinking name card, and falling wages make poverty physical. O. Henry then ends the tour with Della hugging Jim: the room is shabby; the relationship is not.',
        s3: 'The scene begins gray three times — cat, fence, yard — and then Della’s eyes suddenly shine. The narrow mirror is not just furniture; it is the hinge where helplessness turns into a costly plan.',
        s4: 'Queen of Sheba and King Solomon are comic exaggerations, but they do serious work: they raise one watch and one head of hair to the level of legendary treasure before the sacrifices begin.',
        s5: 'Madame Sofronie is almost brutally efficient. The dialogue is short because the transaction is short. Della’s treasured hair becomes merchandise in a few sentences, and she refuses herself time to reconsider.',
        s6: '“Quietness and value” describes both the chain and Jim. Della is not shopping for something flashy; she is trying to find an object that feels morally like the person she loves.',
        s7: 'The narrator calls the haircut “the ravages made by generosity added to love.” It is funny language for a painful consequence. That mixture of comedy and tenderness is the story’s normal temperature.',
        s8: 'The suspense comes from refusing to name Jim’s expression. Della has prepared for anger, shock, and disgust; the story withholds the one explanation she has not imagined.',
        s9: 'When Jim finally embraces her, the narrator literally turns our gaze away. Then the story suddenly asks whether eight dollars a week and a million a year are really different. The plot is beginning to argue about what wealth means.',
        s10: 'The combs create the first half of the trap: they are exactly what Della wanted and exactly what she cannot use. Her scream becoming tears compresses delight, loss, and understanding into a few seconds.',
        s11: 'The second reveal completes the symmetry. Jim’s calm smile matters: by the time he explains the watch, he has already moved past the failed objects and back to ordinary life — “put the chops on.”',
        s12: 'The ending is built on a paradox. O. Henry calls them foolish for sacrificing useful treasures and wise for understanding what a gift is actually for. The title finally stops being decorative and becomes the story’s judgment.',
      },
    },
  },
  {
    id: 'raven',
    title: 'The Raven',
    author: 'Edgar Allan Poe',
    kind: 'Poem',
    note: 'A midnight visitor, a grieving mind, and one word that will not leave.',
    mediaNote:
      'Narration and subtitles are ready. The recovered per-line art still needs publishing.',
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
    explore: {
      intro: {
        title: 'Listen before you dissect it',
        text: 'Poe wanted this poem to work on the ear as well as the intellect. Its machinery is unusually visible: rhyme, repeated consonants, repeated vowels, repeated questions, and one repeated answer. The interesting part is how that rigid machinery produces a feeling of a mind becoming less controlled.',
      },
      lenses: [
        {
          kicker: 'Sound',
          title: 'The rhyme is doing psychological work',
          text: 'The heavy internal rhyme does more than make the poem musical. It keeps returning the speaker to the same sounds, just as his thoughts keep returning to Lenore. The poem feels unable to move forward because its language keeps circling back.',
          lookFor:
            'Pairs and chains such as “dreary/weary,” “napping/tapping/rapping,” and the repeated -ore sound around Lenore and Nevermore.',
        },
        {
          kicker: 'Speaker',
          title: 'Watch who asks the dangerous questions',
          text: 'The raven supplies almost no information. The speaker chooses increasingly painful questions even after he knows the answer will be “Nevermore.” That makes the poem partly a supernatural scene and partly a study of self-torment.',
          lookFor:
            'The point where curiosity changes into questions about Lenore, heaven, and reunion.',
        },
        {
          kicker: 'Symbol',
          title: 'The bird becomes a machine for meaning',
          text: 'A raven with one memorized word is almost blank. The speaker supplies the interpretations. Each new question changes what “Nevermore” means, so the refrain grows darker without the bird learning a single new word.',
          lookFor:
            'How the emotional meaning of the same answer changes from comic interruption to permanent sentence.',
        },
        {
          kicker: 'Structure',
          title: 'Repetition becomes pressure',
          text: 'The poem repeatedly promises a small variation — another knock, another guess, another question — while returning to the same ending. That combination of movement and return is why the poem can feel as if it is tightening rather than simply repeating itself.',
          lookFor:
            'What changes immediately before each “Nevermore,” and what stubbornly does not.',
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
