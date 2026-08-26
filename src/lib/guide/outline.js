import { linesOf, glossOf } from '../reader/beats.js';
import { questionsOf, promptsOf } from '../reader/assessment.js';
import { languagesOf, speechTranslation, wordTranslation } from '../book/translate.js';

/**
 * The learning guide, as an outline.
 *
 * One document for two readers. A student who wants to know what is
 * being asked of them, and a teacher who has to justify it to a head of
 * department, are asking about the same design, and telling them two
 * different stories about it is how the two versions drift apart. So
 * there is one document, in two parts, and the contents says which part
 * is whose.
 *
 * It is built here rather than written in the component, for three
 * reasons that are not style:
 *
 *   1. It has to be true of the book that is loaded. Every count, every
 *      part, every word listed comes out of the pack — so a second title
 *      gets its own guide with no new code, which is the whole point of
 *      the engine/book split.
 *   2. The section list, the ids and the contents are the same data.
 *      Written by hand in JSX they are three lists that agree until
 *      somebody renames a heading, and then the contents jumps to
 *      nothing. Here a link cannot point at a section that is not there,
 *      and a test says so.
 *   3. It can be checked without a browser.
 *
 * What is deliberately NOT here: the answers. See `withoutAnswers` below.
 */

/**
 * One line of a list. `lead` is the part set in bold — the claim — and
 * `text` is the rest of the sentence.
 *
 * @typedef {object} Item
 * @property {string} [lead]
 * @property {string} text
 */

/**
 * Something a character says, and the same thing in the reader's own
 * language when the pack carries it.
 *
 * @typedef {object} Said
 * @property {string} text
 * @property {string|null} other
 */

/**
 * One part of the book, as the guide describes it.
 *
 * @typedef {object} Entry
 * @property {string} id
 * @property {string} title
 * @property {string} act
 * @property {string} caption
 * @property {boolean} read      read aloud, or background material
 * @property {number} lines
 * @property {Said|null} watch   what the reader is pointed at
 * @property {Said|null} focus   what to listen for, second reading
 * @property {string[]} asks     the question stems, without their answers
 * @property {{q:string, intro:string, hint:string, minWords:number}|null} writes
 * @property {string[]} words    the words this part explains
 */

/**
 * A word the book stops to explain.
 *
 * @typedef {object} Gloss
 * @property {string} word
 * @property {string} meaning
 * @property {string|null} other  the meaning in the reader's language
 * @property {string} where       the part it is met in
 */

/**
 * One piece of a section. A small closed set, because every kind has to
 * be rendered on screen AND print sensibly on paper, and a document made
 * of arbitrary shapes cannot promise the second one.
 *
 * @typedef {object} Block
 * @property {'lede'|'para'|'note'|'subhead'|'list'|'table'|'plan'|'glossary'} kind
 * @property {string} [text]
 * @property {Item[]} [items]
 * @property {string[]} [columns]
 * @property {string[][]} [rows]
 * @property {Entry[]} [entries]
 * @property {Gloss[]} [words]
 */

/**
 * @typedef {object} Section
 * @property {string} id       the anchor, unique across the document
 * @property {string} heading
 * @property {Block[]} blocks
 * @property {number} [n]      its number in the contents
 * @property {string} [part]   which part it belongs to
 *
 * `n` and `part` are optional because a section does not know either
 * one: both are filled in by `guideOutline` once the order is settled,
 * which is the only place that can know them.
 */

/**
 * @typedef {object} Part
 * @property {string} key
 * @property {string} title
 * @property {string} note
 * @property {Section[]} sections
 */

/**
 * @typedef {object} Outline
 * @property {string} title
 * @property {string} subtitle
 * @property {string} of        the book this guide is for
 * @property {string} by        its author, when the pack names one
 * @property {string} lang      the reader's language, or ''
 * @property {Part[]} parts
 */

/** The anchor for a section id. Prefixed so it cannot collide with an
 *  id the reader or a book pack puts on the page. */
export const anchorFor = (id) => `guide-${id}`;

/** The top of the document, which the contents and every section links back to. */
export const TOP = anchorFor('top');

/**
 * The three readings, described by what the engine does rather than by
 * what any one book is about.
 *
 * @type {{n:number, name:string, what:string, asks:(n:number)=>string}[]}
 */
const READINGS = [
  {
    n: 1,
    name: 'First reading — watch',
    what: 'The story is read aloud over the pictures, one line at a time, with that line on screen as it is spoken.',
    asks: () => 'Nothing. There is nothing to answer and nothing is marked.',
  },
  {
    n: 2,
    name: 'Second reading — notice',
    what: 'Before each part you are told one thing to look for, and then asked about that exact thing.',
    asks: (n) =>
      n ? `${n} multiple-choice questions, checked as you answer.` : 'Nothing in this book.',
  },
  {
    n: 3,
    name: 'Third reading — think',
    what: 'The same story again, with the questions left open.',
    asks: (n) =>
      n
        ? `${n} written answers, in your own words, read by a person.`
        : 'Nothing in this book.',
  },
];

/** Who does the thinking, and what is holding them up while they do it. */
const RELEASE = [
  [
    '1 · Watch',
    'Modelled. The text is performed, and the guides talk about a part when it is over.',
    'Everything: the recording, the picture, the line on screen, the translation if it is on.',
  ],
  [
    '2 · Notice',
    'Guided. Attention is aimed at one feature of the part, and then checked.',
    'A prompt before each part, and the explanation the book wrote for each question.',
  ],
  [
    '3 · Think',
    'Independent. The student writes unscaffolded prose.',
    'The text and the prompt.',
  ],
];

/**
 * Why the guide carries no answer key.
 *
 * This document is a door in the top bar, next to Vocabulary. Whatever
 * is in it, a student can read before the quiz — so the correct option,
 * the explanation the book wrote for each question, the debrief lines
 * and the grader's keyword lists are all left out, and the question
 * stems stay in. It is the same decision the reading already makes:
 * nothing says which option is right until the answer has been given.
 *
 * A teacher loses nothing by it. The questions are checked by the
 * software, and the marking view shows what each student answered.
 */
const withoutAnswers =
  'There is no answer key in this document. It is one of the doors in the top bar, ' +
  'so anything printed here is something a student can read before the questions — ' +
  'and a student who can read the answer off the page has not been taught anything. ' +
  'The questions themselves are checked by the reader as they are answered.';

/** Everything the book teaches, in the order it is met. */
function taughtIds(book) {
  const order = [...(book?.units || []).map((u) => u.id), ...Object.keys(book?.info || {})];
  return [...new Set(order)].filter((id) => book?.teaching?.[id]);
}

/** A unit, or the background material that is not read aloud. */
function partLike(book, id) {
  return (book?.units || []).find((u) => u.id === id) || book?.info?.[id] || null;
}

/** One line, with the same line in the reader's language beneath it. */
function said(book, lang, text) {
  const s = typeof text === 'string' ? text.trim() : '';
  if (!s) return null;
  return { text: s, other: lang ? speechTranslation(book, lang, s) : null };
}

/** A count, said in words, so a sentence reads rather than being filled in. */
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/**
 * Part by part: what the reading points at, what it asks, and the words
 * it explains.
 *
 * @param {any} book
 * @param {string} lang
 * @returns {Entry[]}
 */
export function planOf(book, lang = '') {
  return taughtIds(book).map((id) => {
    const unit = partLike(book, id) || {};
    const t = book?.teaching?.[id] || {};
    const sa = t.sa || null;
    const lines = linesOf(unit);
    return {
      id,
      title: unit.title || id,
      act: unit.act || '',
      caption: unit.caption || '',
      /* Background material — the author's life, why the story lasted —
         is taught and asked about but never read aloud, and a teacher
         planning a period needs to know which is which. */
      read: lines.length > 0,
      lines: lines.length,
      watch: said(book, lang, t.watch),
      focus: said(book, lang, t.focus),
      asks: (t.mc || []).map((q) => q?.q).filter(Boolean),
      writes: sa?.q
        ? {
            q: sa.q,
            intro: t.writeIntro || '',
            hint: sa.hint || '',
            minWords: sa.minWords || 0,
          }
        : null,
      words: Object.keys(glossOf(unit)),
    };
  });
}

/**
 * Every word the book stops to explain, in reading order.
 *
 * Kept separate from the trainer's own list, which drops a word that is
 * glossed two different ways because it has no line to lean on when it
 * asks about it. A printed glossary has no such problem: both readings
 * are listed, each against the part it was met in, which is the thing
 * that settles which one is meant.
 *
 * @param {any} book
 * @param {string} lang
 * @returns {Gloss[]}
 */
export function glossaryOf(book, lang = '') {
  /** @type {Gloss[]} */
  const out = [];
  const seen = new Set();
  for (const unit of book?.units || []) {
    for (const [word, meaning] of Object.entries(glossOf(unit))) {
      const key = `${word}=${meaning}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        word,
        meaning,
        other: lang ? wordTranslation(book, lang, word) : null,
        where: unit.title || unit.id,
      });
    }
  }
  return out;
}

/**
 * The whole document.
 *
 * @param {any} book
 * @param {{lang?: string}} [opts]
 * @returns {Outline}
 */
export function guideOutline(book, opts = {}) {
  const lang = opts.lang || '';
  const meta = book?.meta || {};
  const units = book?.units || [];
  const questions = questionsOf(book).length;
  const prompts = promptsOf(book).length;
  const lines = units.reduce((n, u) => n + linesOf(u).length, 0);
  const acts = [...new Set(units.map((u) => u.act).filter(Boolean))];
  const langs = languagesOf(book);
  const plan = planOf(book, lang);
  const glossary = glossaryOf(book, lang);
  const cast = Object.values(book?.cast?.members || {});
  /* A pack may carry its own objectives and its own alignment. This one
     does not, and the sections are simply absent rather than invented:
     naming a standard a book has not claimed is the one thing a
     compliance document must never do. */
  const objectives = book?.guide?.objectives || [];
  const standards = book?.guide?.standards || null;

  /** @type {Part[]} */
  const parts = [
    {
      key: 'A',
      title: 'Part One — for students and families',
      note: 'Plain language. What you will do, and what is kept.',
      sections: [
        {
          id: 'what',
          heading: 'What this is',
          blocks: [
            {
              kind: 'lede',
              text: 'One story, read aloud three times, with a different job each time.',
            },
            {
              kind: 'para',
              text:
                `${meta.title || 'This book'} is in ${count(units.length, 'part', 'parts')}` +
                (acts.length ? `, grouped into ${count(acts.length, 'act', 'acts')}` : '') +
                `. ${count(lines, 'line', 'lines')} are read aloud, ` +
                `${count(questions, 'question', 'questions')} are asked, and ` +
                `${count(prompts, 'answer', 'answers')} are written in your own words.`,
            },
            {
              kind: 'para',
              text:
                'It runs in a web browser. There is nothing to install and no account to make. ' +
                'You can read the whole book without signing in to anything: work is sent ' +
                'somewhere only when you have opened a class link from a teacher.',
            },
            ...(cast.length
              ? /** @type {Block[]} */ ([
                  { kind: 'subhead', text: 'Who reads it' },
                  {
                    kind: 'list',
                    items: cast.map((c) => ({ lead: c.name, text: c.blurb || '' })),
                  },
                ])
              : []),
          ],
        },
        {
          id: 'readings',
          heading: 'The three readings',
          blocks: [
            {
              kind: 'lede',
              text: 'The story does not change. What changes is what is asked of you.',
            },
            {
              kind: 'table',
              columns: ['Reading', 'What happens', 'What is asked'],
              rows: READINGS.map((r) => [
                r.name,
                r.what,
                r.asks(r.n === 2 ? questions : prompts),
              ]),
            },
            {
              kind: 'para',
              text:
                'In the second reading an answer is final, and it explains itself: answering ' +
                'shows you what the book has to say about that question, and moving on is ' +
                'yours to press. Nothing on the page says which option is right until you ' +
                'have chosen one.',
            },
            {
              kind: 'para',
              text:
                'You can stop after the first reading and still have had the story. The ' +
                'second and third are where the schoolwork is. It remembers where you were.',
            },
          ],
        },
        {
          id: 'contents',
          heading: 'What is in it',
          blocks: [
            {
              kind: 'table',
              columns: ['Act', 'Part', 'What happens', 'Lines', 'Asks'],
              rows: plan.map((e) => [
                e.act,
                e.title,
                e.caption,
                e.read ? String(e.lines) : '—',
                [
                  e.asks.length ? count(e.asks.length, 'question', 'questions') : '',
                  e.writes ? '1 to write' : '',
                ]
                  .filter(Boolean)
                  .join(' · ') || '—',
              ]),
            },
            {
              kind: 'note',
              text:
                'A dash in the Lines column means that part is not read aloud. It is ' +
                'background material, shown between the readings, and it is asked about ' +
                'like everything else.',
            },
          ],
        },
        {
          id: 'access',
          heading: 'Reading it your way',
          blocks: [
            {
              kind: 'lede',
              text:
                'All of this is in Settings, and anyone can turn any of it on at any time. ' +
                'Nobody has to ask, and nothing is announced to the class.',
            },
            {
              kind: 'list',
              items: [
                ...(langs.length
                  ? [
                      {
                        lead: 'Your own language, under the English.',
                        text: `${langs.map((l) => l.en || l.name).join(', ')}. The English line stays on screen and the translation sits beneath it, so you are always looking at both.`,
                      },
                    ]
                  : []),
                {
                  lead: 'It is read aloud, always.',
                  text: 'Recorded by people, so it sounds the same on every device. Three speeds.',
                },
                {
                  lead: 'Larger text, higher contrast, and a reading ruler',
                  text: 'that keeps your eye on the line you are on.',
                },
                {
                  lead: 'Movement in the pictures can be turned off',
                  text: 'if the drifting bothers you. It is off already if your device asks for less motion.',
                },
                ...(glossary.length
                  ? [
                      {
                        lead: 'Tap any underlined word.',
                        text: `${count(glossary.length, 'word', 'words')} are explained in the story itself, and the ones you tap become your own practice set in Vocabulary.`,
                      },
                    ]
                  : []),
                {
                  lead: 'On a keyboard',
                  text: 'the arrow keys move a line at a time and the space bar pauses and continues.',
                },
              ],
            },
          ],
        },
        {
          id: 'privacy',
          heading: 'Your work and your privacy',
          blocks: [
            {
              kind: 'lede',
              text: 'Reading on your own: nothing is marked, and nothing is sent.',
            },
            {
              kind: 'para',
              text:
                'Your work is kept on the device you did it on, inside the browser. Reading ' +
                'on your own sends nothing anywhere. Opening a class link means your answers ' +
                'go to the teacher whose link it was, and to nobody else.',
            },
            {
              kind: 'para',
              text:
                'There is no account, no email address, no advertising, and no tracking of ' +
                'you across other sites. A different browser, or private browsing, starts ' +
                'fresh — which is also why a shared device does not carry your work to the ' +
                'next student.',
            },
          ],
        },
      ],
    },
    {
      key: 'B',
      title: 'Part Two — for teachers',
      note: 'The design, the plan part by part, and what can be evidenced. Written to be printed and filed.',
      sections: [
        {
          id: 'model',
          heading: 'How it is built',
          blocks: [
            {
              kind: 'lede',
              text: 'Three passes over one text, with the text held constant and the demand raised each time.',
            },
            { kind: 'subhead', text: 'Why the first reading asks nothing' },
            {
              kind: 'para',
              text:
                'A first encounter with a narrative is spent working out what happens. A ' +
                'student still establishing who the people are cannot at the same time ' +
                'notice what the author keeps returning to, so comprehension questions asked ' +
                'during a first read measure decoding speed as much as understanding. The ' +
                'first pass removes that by removing the questions.',
            },
            {
              kind: 'para',
              text:
                'The intended effect is a levelling one: by the time a struggling reader and ' +
                'a fluent one reach the third pass they hold roughly the same plot ' +
                'knowledge, so the analytical task is not silently gated behind fluency.',
            },
            { kind: 'subhead', text: 'Gradual release' },
            {
              kind: 'table',
              columns: ['Pass', 'Who does the thinking', 'What is holding them up'],
              rows: RELEASE,
            },
            { kind: 'subhead', text: 'Cognitive load' },
            {
              kind: 'para',
              text:
                'One line on screen at a time rather than a page; the spoken line and the ' +
                'written line always identical and in the same place; no navigation ' +
                'decisions during the first pass; and the translation, when it is on, ' +
                'directly under its English line rather than in a panel that has to be ' +
                'looked at and matched up.',
            },
          ],
        },
        {
          id: 'plan',
          heading: 'The plan, part by part',
          blocks: [
            {
              kind: 'lede',
              text: 'What each part points at, what it asks, and the words it explains.',
            },
            { kind: 'note', text: withoutAnswers },
            { kind: 'plan', entries: plan },
          ],
        },
        ...(objectives.length
          ? /** @type {any[]} */ ([
              {
                id: 'objectives',
                heading: 'Objectives and alignment',
                blocks: [
                  {
                    kind: 'para',
                    text:
                      'Stated as observable learner performance. Each names the activity ' +
                      'that develops it and the artefact that evidences it — a row with no ' +
                      'evidence is a claim rather than a design.',
                  },
                  {
                    kind: 'table',
                    columns: ['The student will…', 'Developed by', 'Evidenced by'],
                    rows: objectives.map((o) => [
                      o.objective || '',
                      o.developed || '',
                      o.evidenced || '',
                    ]),
                  },
                ],
              },
            ])
          : []),
        ...(standards?.rows?.length
          ? /** @type {any[]} */ ([
              {
                id: 'standards',
                heading: 'Standards alignment',
                blocks: [
                  ...(standards.framework ? [{ kind: 'para', text: standards.framework }] : []),
                  {
                    kind: 'table',
                    columns: ['Code', 'Standard', 'Where it is done'],
                    rows: standards.rows.map((r) => [
                      r.code || '',
                      r.text || '',
                      r.where || '',
                    ]),
                  },
                  ...(standards.note ? [{ kind: 'note', text: standards.note }] : []),
                ],
              },
            ])
          : []),
        ...(glossary.length
          ? /** @type {any[]} */ ([
              {
                id: 'words',
                heading: 'The words this book explains',
                blocks: [
                  {
                    kind: 'lede',
                    text: `${count(glossary.length, 'word', 'words')}, in the order they are met. Each one is tappable in the reading and each one can be practised afterwards.`,
                  },
                  { kind: 'glossary', words: glossary },
                ],
              },
            ])
          : []),
        {
          id: 'assessment',
          heading: 'Assessment and evidence',
          blocks: [
            {
              kind: 'table',
              columns: ['Instrument', 'Type', 'Marked by', 'Reported as'],
              rows: [
                ...(questions
                  ? [
                      [
                        `Second reading — ${count(questions, 'question', 'questions')}`,
                        'Formative',
                        'The software',
                        'Percentage correct, and each answer',
                      ],
                    ]
                  : []),
                ...(prompts
                  ? [
                      [
                        `Third reading — ${count(prompts, 'written answer', 'written answers')}`,
                        'Formative, summative at your discretion',
                        'You',
                        'A coverage band, plus the full text of the answer',
                      ],
                    ]
                  : []),
                ...(glossary.length
                  ? [
                      [
                        'Vocabulary',
                        'Formative, self-directed',
                        'The software',
                        'Words retired, words to revisit',
                      ],
                    ]
                  : []),
                [
                  'Talk between the parts',
                  'Formative',
                  'You, by watching',
                  'Not recorded anywhere',
                ],
              ],
            },
            { kind: 'subhead', text: 'What the numbers do and do not mean' },
            {
              kind: 'para',
              text:
                'The second-reading percentage measures whether the thing that was pointed ' +
                'at was subsequently noticed. It is a check on attention, useful for ' +
                'spotting a student who has disengaged. It is not a reading-comprehension ' +
                'score and it should not be used to rank a class.',
            },
            {
              kind: 'para',
              text:
                'The third reading is not scored by the software. It reports coverage — ' +
                'whether an answer mentions what strong answers tend to mention — as a band ' +
                'and never as a number, because an answer that says something true and ' +
                'unexpected must not be marked down by a machine for missing a keyword. The ' +
                'full text is always shown. Read it.',
            },
            {
              kind: 'note',
              text:
                'If a student reads on their own, none of this exists: nothing is marked, ' +
                'stored centrally, or transmitted. Assessment data is created only when a ' +
                'class link has been opened.',
            },
          ],
        },
        {
          id: 'record',
          heading: 'Printing this, and record keeping',
          blocks: [
            {
              kind: 'lede',
              text:
                'Print, or save as PDF, from the button at the top. It prints as a plain ' +
                'document: no interface, no dark background, and the contents list left off ' +
                'the paper.',
            },
            { kind: 'subhead', text: 'What you can evidence from a run' },
            {
              kind: 'list',
              items: [
                { lead: 'This document.', text: 'The design, the plan, and the assessment.' },
                {
                  lead: 'Per-student results.',
                  text: 'Second-reading answers and the full text of every written answer, from the class tools.',
                },
                {
                  lead: 'Words looked up',
                  text: 'per student, which is the closest thing here to a record of where a text was hard.',
                },
              ],
            },
            { kind: 'subhead', text: 'Data handling, stated plainly' },
            {
              kind: 'para',
              text:
                'Solo use creates no record anywhere but the student’s own browser. Class ' +
                'use transmits answers only to the teacher who issued the link. No ' +
                'accounts, no email addresses, no advertising identifiers, and no ' +
                'third-party analytics.',
            },
            {
              kind: 'note',
              text:
                `Prepared for ${meta.title || 'this book'} from the book package itself, so it ` +
                'says what this build actually contains. ' +
                (standards?.rows?.length
                  ? 'The alignment above is the one the book package declares; verify it against your own state or district adoption before filing, as codes and grade placement vary.'
                  : 'It claims no standards alignment, because this book package declares none. Alignment is a property of a curriculum, not of a reading engine, and a guide that invented nine codes would not be worth filing.'),
            },
          ],
        },
      ],
    },
  ];

  /* Numbered across the whole document rather than within a part, so
     "section 7" means one thing when somebody says it out loud. */
  let n = 0;
  for (const part of parts) {
    for (const section of part.sections) {
      section.n = ++n;
      section.part = part.key;
    }
  }

  return {
    title: 'Learning guide',
    subtitle:
      'The learning guide and the teacher’s guide are the same document. Part One is ' +
      'written for students and families. Part Two is written for teachers, and is ' +
      'intended to be printed for a planning or compliance file.',
    of: meta.title || '',
    by: meta.author || '',
    lang,
    parts,
  };
}

/**
 * Every section, in order, with its part forgotten.
 * @param {Outline} outline
 * @returns {Section[]}
 */
export function sectionsOf(outline) {
  return (outline?.parts || []).flatMap((p) => p.sections);
}

/**
 * The contents: what a link says, and where it goes.
 *
 * Derived from the same object the document is rendered from, which is
 * the only arrangement in which a contents entry cannot point at a
 * section that does not exist.
 *
 * @param {Outline} outline
 * @returns {{key:string, title:string, note:string,
 *            items:{id:string, anchor:string, n:number, heading:string}[]}[]}
 */
export function contentsOf(outline) {
  return (outline?.parts || []).map((p) => ({
    key: p.key,
    title: p.title,
    note: p.note,
    items: p.sections.map((s) => ({
      id: s.id,
      anchor: anchorFor(s.id),
      n: s.n,
      heading: s.heading,
    })),
  }));
}
