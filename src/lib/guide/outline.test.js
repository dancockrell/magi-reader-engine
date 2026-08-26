import { describe, it, expect } from 'vitest';
import book from '../../books/fixture/index.js';
import {
  guideOutline,
  sectionsOf,
  contentsOf,
  planOf,
  glossaryOf,
  anchorFor,
} from './outline.js';
import { questionsOf, promptsOf } from '../reader/assessment.js';

/* The engine's own fixture book. The guide owns no content — every
   heading, count and word in it comes out of the pack — so testing it
   against a title would only prove it works for that title. */

/** Every string the document would put in front of a reader. */
function everyString(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) everyString(v, out);
  else if (value && typeof value === 'object')
    for (const v of Object.values(value)) everyString(v, out);
  return out;
}

/** The whole document as one lowercase blob, for "is this in it at all". */
const blobOf = (outline) => everyString(outline).join('\n').toLowerCase();

/** A book with the same shape and none of the same content. */
const TINY = {
  meta: { title: 'A Very Short Book', author: 'Nobody' },
  units: [
    {
      id: 'u1',
      act: 'The only act',
      title: 'The only part',
      caption: 'It happens once.',
      stanzas: ['A {plain|ordinary} line.\nAnother line.'],
    },
  ],
  teaching: {
    u1: {
      watch: 'Watch the line.',
      focus: 'Listen for the second one.',
      debrief: { ok: 'Yes, two lines.', no: 'There were two lines.' },
      writeIntro: 'Say what happened.',
      mc: [{ q: 'How many lines?', opts: ['One', 'Two'], correct: 1, fb: 'Two lines.' }],
      sa: { q: 'What happened?', hint: 'Count them.', minWords: 5, core: [['two']] },
    },
  },
};

describe('the contents jumps', () => {
  it('points every entry at a section that is really in the document', () => {
    /* The failure this exists for: someone renames a heading, the
       contents keeps the old anchor, and the link silently scrolls
       nowhere. Both lists come from one object, and this proves it. */
    const outline = guideOutline(book);
    const ids = new Set(sectionsOf(outline).map((s) => s.id));
    const linked = contentsOf(outline).flatMap((p) => p.items.map((i) => i.id));

    expect(linked.length).toBeGreaterThan(5);
    expect(linked.filter((id) => !ids.has(id))).toEqual([]);
    /* and the other direction: a section nothing links to is unreachable */
    expect([...ids].filter((id) => !linked.includes(id))).toEqual([]);
  });

  it('gives every section its own anchor, so a jump cannot be ambiguous', () => {
    const ids = sectionsOf(guideOutline(book)).map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('prefixes the anchors, so they cannot collide with an id on the page', () => {
    /* The reader and the book packs both put ids on elements. An
       anchor called "words" would be one rename away from a contents
       link that scrolls to a scene. */
    expect(anchorFor('words')).toBe('guide-words');
    for (const s of sectionsOf(guideOutline(book))) {
      expect(anchorFor(s.id).startsWith('guide-')).toBe(true);
    }
  });

  it('numbers the sections in one sequence across both parts', () => {
    /* So that "section seven", said out loud in a staff meeting, means
       one section rather than one per part. */
    const numbers = sectionsOf(guideOutline(book)).map((s) => s.n);
    expect(numbers).toEqual(numbers.map((_, i) => i + 1));
  });

  it('says which part each section belongs to', () => {
    const outline = guideOutline(book);
    const parts = new Set(sectionsOf(outline).map((s) => s.part));
    expect(parts).toEqual(new Set(outline.parts.map((p) => p.key)));
  });
});

describe('the guide is made from the book', () => {
  it('describes the book it was given, not the one it was written against', () => {
    /* The whole engine/book split, in one assertion: a second title
       gets its own guide with no new code. */
    const outline = guideOutline(TINY);
    const blob = blobOf(outline);

    expect(outline.of).toBe('A Very Short Book');
    expect(outline.by).toBe('Nobody');
    expect(blob).toContain('the only part');
    expect(blob).toContain('it happens once');
    expect(blob).not.toContain('mira');
  });

  it('counts what is really in the book', () => {
    const blob = blobOf(guideOutline(book));
    expect(blob).toContain(`${questionsOf(book).length} multiple-choice questions`);
    expect(blob).toContain(`${promptsOf(book).length} written answers`);
    expect(blob).toContain(`${book.units.length} parts`);
  });

  it('carries every part the book teaches, in the order it is met', () => {
    const ids = planOf(book).map((e) => e.id);
    const taught = Object.keys(book.teaching);
    expect(new Set(ids)).toEqual(new Set(taught));
    /* the parts that are read aloud come first, in reading order */
    expect(ids.slice(0, book.units.length)).toEqual(book.units.map((u) => u.id));
  });

  it('marks the material that is never read aloud', () => {
    /* A teacher planning a period needs to know which parts have a
       recording behind them and which are shown between the readings.
       In the storyboard these are the ones with no lines. */
    const plan = planOf(book);
    const silent = plan.filter((e) => !e.read);
    expect(silent.length).toBeGreaterThan(0);
    for (const e of silent) expect(e.lines).toBe(0);
    for (const e of plan.filter((x) => x.read)) expect(e.lines).toBeGreaterThan(0);
  });

  it('asks, in writing, every question the second reading asks aloud', () => {
    /* A plan that lists eleven of fourteen parts is worse than no plan,
       because the three missing ones are invisible. */
    const stems = new Set(planOf(book).flatMap((e) => e.asks));
    const asked = questionsOf(book).filter((q) => q.kind === 'mc');
    expect(asked.length).toBeGreaterThan(0);
    for (const q of asked) expect(stems.has(q.q), `missing: ${q.q}`).toBe(true);
  });

  it('carries every written prompt, with the words it asks for', () => {
    const plan = planOf(book);
    const writes = plan.filter((e) => e.writes);
    expect(writes).toHaveLength(promptsOf(book).length);
    for (const e of writes) expect(e.writes.minWords).toBeGreaterThan(0);
  });

  it('renders the alignment a package declares, and invents none when it does not', () => {
    /* Alignment is a property of a curriculum, not of a reading engine.
       A pack that claims RL.7.1 gets a table; one that claims nothing
       gets a sentence saying so, and never a table of codes nobody
       wrote down. */
    const bare = sectionsOf(guideOutline(TINY)).map((s) => s.id);
    expect(bare).not.toContain('standards');
    expect(bare).not.toContain('objectives');

    const claimed = guideOutline({
      ...TINY,
      guide: {
        objectives: [{ objective: 'Count lines', developed: 'Pass 2', evidenced: 'Item 1' }],
        standards: {
          framework: 'A framework, named by the book.',
          rows: [{ code: 'XX.1.1', text: 'Count things.', where: 'The only part' }],
          note: 'Check it locally.',
        },
      },
    });
    const ids = sectionsOf(claimed).map((s) => s.id);
    expect(ids).toContain('standards');
    expect(ids).toContain('objectives');
    expect(blobOf(claimed)).toContain('xx.1.1');
  });

  it('produces a document for a book with nothing in it, rather than throwing', () => {
    /* The guide is a door in the top bar. A pack that is still being
       extracted must give a thin guide, never a blank screen. */
    const outline = guideOutline({});
    expect(sectionsOf(outline).length).toBeGreaterThan(4);
    expect(planOf({})).toEqual([]);
    expect(glossaryOf({})).toEqual([]);
  });
});

describe('the guide contains no answer key', () => {
  /**
   * It is one of the doors in the top bar, so anything printed in it is
   * something a student can read before the questions. That is the same
   * rule the reading already keeps: nothing says which option is right
   * until the answer has been given.
   */
  it('prints the questions and not the answers', () => {
    const blob = blobOf(guideOutline(book));
    const leaked = [];
    for (const [id, t] of Object.entries(book.teaching)) {
      /* Recaps as well as questions. A recap is asked in the second
         reading like everything else, and it is the shape most likely
         to be forgotten because not every pack has one. */
      for (const q of [...(t.mc || []), ...(t.recap ? [t.recap] : [])]) {
        if (blob.includes(q.opts[q.correct].toLowerCase())) leaked.push(`${id} correct option`);
        if (blob.includes(q.fb.toLowerCase())) leaked.push(`${id} explanation`);
      }
      for (const line of [t.debrief?.ok, t.debrief?.no]) {
        if (line && blob.includes(line.toLowerCase())) leaked.push(`${id} debrief`);
      }
    }
    expect(leaked).toEqual([]);
  });

  it('keeps the grader out of it', () => {
    /* `core`, `support` and `phrases` are how a written answer is scored
       for coverage. Published, they become the answer: a student can hit
       every band without writing a sentence that means anything.

       Checked as shapes rather than as words, because the keyword lists
       quote the question — "like a little singed cat" is in the prompt a
       student is given — so searching the text for them finds the prompt
       and proves nothing. What must never appear is the list itself, and
       the way it would get in is somebody spreading the whole `sa` into
       the entry. */
    const outline = guideOutline(book);
    /** @type {string[][]} */
    const lists = [];
    (function walk(/** @type {any} */ v) {
      if (Array.isArray(v)) {
        if (v.every((x) => typeof x === 'string')) lists.push(v);
        else v.forEach(walk);
      } else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    })(outline);

    const secret = new Set();
    for (const t of Object.values(book.teaching)) {
      for (const group of t.sa?.core || []) secret.add(JSON.stringify(group));
      if (t.sa?.support) secret.add(JSON.stringify(t.sa.support));
      if (t.sa?.phrases) secret.add(JSON.stringify(t.sa.phrases));
    }
    expect(secret.size).toBeGreaterThan(10);
    expect(lists.filter((l) => secret.has(JSON.stringify(l)))).toEqual([]);
  });

  it('hands on only the fields of a prompt it means to', () => {
    /* The regression this guards: `writes: {...sa}`, which is one
       keystroke from what is there now and would print the grader. */
    for (const entry of planOf(book).filter((e) => e.writes)) {
      expect(Object.keys(entry.writes).sort()).toEqual(['hint', 'intro', 'minWords', 'q']);
    }
  });

  it('still shows what each part points at, or it would teach nothing', () => {
    /* The counterweight: a guide with the answers stripped out has to
       keep the parts a teacher actually plans from. */
    const plan = planOf(book);
    expect(plan.every((e) => e.watch?.text)).toBe(true);
    expect(plan.every((e) => e.focus?.text)).toBe(true);
  });
});

describe("the reader's own language", () => {
  it('shows the guide lines in it, where the package has them', () => {
    /* The lines the guide quotes are the lines the characters speak, and
       the pack translates those. A reader who has chosen a language and
       is handed an English-only guide has been given the door and not
       the room. */
    const lang = book.languages[0].code;
    const plan = planOf(book, lang);
    expect(plan.filter((e) => e.watch?.other).length).toBe(plan.length);
    expect(plan.filter((e) => e.focus?.other).length).toBe(plan.length);
  });

  it('translates the words the book explains', () => {
    const lang = book.languages[0].code;
    const words = glossaryOf(book, lang);
    expect(words.length).toBeGreaterThan(20);
    expect(words.filter((w) => w.other).length).toBeGreaterThan(20);
  });

  it('falls back to English rather than to a blank', () => {
    /* A missing translation must read as untranslated. The failure to
       avoid is a guide that goes empty because a language was chosen. */
    const plan = planOf(book, 'not-a-language');
    expect(plan.every((e) => e.watch.text)).toBe(true);
    expect(plan.every((e) => e.watch.other === null)).toBe(true);
    expect(glossaryOf(book, 'not-a-language').every((w) => w.meaning)).toBe(true);
  });

  it('says nothing about language when the package carries no translations', () => {
    expect(planOf(TINY, 'ko').every((e) => e.watch.other === null)).toBe(true);
  });
});

describe('the glossary', () => {
  it('lists a word against the part it was met in', () => {
    const words = glossaryOf(book);
    expect(words.length).toBeGreaterThan(0);
    for (const w of words.slice(0, 5)) {
      expect(w.word).toBeTruthy();
      expect(w.meaning).toBeTruthy();
      expect(w.where).toBeTruthy();
    }
  });

  it('keeps both meanings of a word the book explains twice', () => {
    /* The trainer drops those words, because it has no way to ask about
       one of two meanings. A printed glossary has no such problem: the
       part it was met in is what settles which one is meant, and
       dropping the word from a reference list would be a hole. */
    const twice = {
      units: [
        { id: 'a', title: 'A', stanzas: ['A {still|not moving} thing.'] },
        { id: 'b', title: 'B', stanzas: ['{still|even now} here.'] },
      ],
    };
    const words = glossaryOf(twice);
    expect(words).toHaveLength(2);
    expect(words.map((w) => w.where)).toEqual(['A', 'B']);
  });

  it('lists a word once when it is explained the same way twice', () => {
    const twice = {
      units: [
        { id: 'a', title: 'A', stanzas: ['A {shabby|worn out} coat.'] },
        { id: 'b', title: 'B', stanzas: ['A {shabby|worn out} hat.'] },
      ],
    };
    expect(glossaryOf(twice)).toHaveLength(1);
  });
});
