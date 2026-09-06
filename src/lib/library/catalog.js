export const CATALOG = [
  {
    id: 'magi',
    title: 'The Gift of the Magi',
    author: 'O. Henry',
    kind: 'Short story',
    note: 'Love, sacrifice, and the joke hidden inside a perfect gift.',
    preview: 'art/storyboard/s1/s1-a-counting.jpg',
    previewAlt: 'Della counting pennies at her kitchen table on Christmas Eve.',
    screening: 'film.html',
    local: () => import('../../books/magi/index.js').then((module) => module.default),
    featured: true,
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
];

export function catalogBook(id) {
  return CATALOG.find((entry) => entry.id === id) || null;
}
