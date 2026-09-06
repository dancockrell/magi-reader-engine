# The book pack format

> **Version scope:** this is the pack contract for the classroom-era code on this branch. For new solo-reader packs, use [the contract on `solo-reader-redesign`](https://github.com/dancockrell/magi-reader-engine/blob/solo-reader-redesign/docs/BOOK-FORMAT.md) and its matching validator. Questions and teaching passes below are not a mandate to restore classroom features. The [README](../README.md) explains the transition.

The engine reads books. It does not contain one. Everything a particular
title is made of, the text, the pictures, the glossary, the questions, the
translations and the two characters who talk about it, arrives as a pack.

This document says what a pack must contain. It is written for two readers
at once:

- **A person authoring a book by hand.** Read sections 1 to 6, copy the
  minimal book in section 7, and fill it in.
- **A language model asked to turn a plain text into a book.** Sections 4,
  6, 8 and 9 are the ones that matter. Section 8 is a list of mistakes that
  generators actually make, taken from the reasons written above each check
  in `src/lib/book/validate.js`.

Two words are used precisely throughout.

**Rejected** means `validateBook` returns an error. The book will not pass
`npm run book:check` and will not pass CI. You find out immediately.

**Inert** means the book loads, the contract is satisfied, and the feature
you were aiming at silently does nothing. Nobody finds out until a class
does. Inert failures are the dangerous ones and they are called out
individually below.

---

## 1. Two files, one pack

A pack is a folder under `src/books/<id>/` containing at least:

```
src/books/<id>/
  book.json    the book itself: portable data, no deployment in it
  index.js     the pack: where this book's media sits once built
```

`index.js` imports `book.json`, spreads it, and adds whatever depends on
how the files were laid out rather than on what the author wrote:

```js
import data from './book.json';

/** @type {import('../../lib/types.js').Book} */
export default {
  ...data,
  media: {
    audio: 'example-audio/',
    cues: 'cues/example.vtt',
  },
};
```

The pack is then listed in `src/books/index.js`, which is the only file the
reader reads to know what titles this build carries.

### The rule for deciding which file a path belongs in

> If the path **carries information you could not recover from the book
> itself**, it is data, and it goes in `book.json`. If the path is
> **derivable from a naming scheme some tool chose**, it is deployment, and
> it goes in `index.js`.

The two shipped packs answer this differently, and both are right.

**Magi** keeps its `plates` map in `book.json`. Its art is
content-addressed: `s9` maps to `art/b761df088c6ff86d.webp`. There is no
way from a scene id to that filename. Lose the map and the pictures are
unreachable. The map carries information, so it is data.

**The Raven** keeps its `plates` map in `pack/index.js`. Its art is named
for the key the build used, so `s9` maps to `art/plate-s9.webp`. That is
not a fact about the poem, it is one tool's convention. It is deployment,
so it sits next to the audio paths in the file a person edits when the
layout changes. The Raven pack does the same for its two cast portraits,
reattaching `art` to the cast members that `book.json` describes.

There is a second, mechanical half to the Raven's reasoning, and it
generalises to anything generated: `book.json` is produced by an extractor,
and hand edits to generated output get silently undone by the next run.
The Raven repository already carries a scar from exactly that. If your
`book.json` is generated, nothing you would want to edit by hand should
live in it.

**`media` always lives in `index.js`, in both packs, with no exception.**
It is the one field the engine reads that no author writes.

### Paths are relative, always, with no leading slash

`MEDIA_BASE` in `src/lib/reader/beats.js` is the empty string, and Vite is
configured with `base: './'`. itch.io serves a build from a nested path, so
`/art/x.webp` resolves against the domain root and 404s every picture in
the book. `engine.test.js` fails a pack whose `media.audio` or `media.cues`
starts with `/` or with `http`.

---

## 2. Where the contract is enforced, and where it is not

`validateBook` lives in `src/lib/book/validate.js` and is called from:

- `tools/check-book.mjs`, via `npm run book:check -- path/to/book.json`,
  which exits non-zero on any error
- the test suite

It is **not** called at runtime. The reader does not validate the book it
loads. A book that has not been through `book:check` is not checked by
anything, and its failures arrive as blank cards in front of a class. Run
the check.

```
npm run book:check -- src/books/example/book.json
```

`validateBook` returns `{ ok, errors, warnings, wordCount }`.

- `errors` block. Any one of them means the book is rejected.
- `warnings` do not block. There is currently exactly one kind, described
  under `gloss` below.
- `wordCount` is the number of words the vocabulary trainer can actually
  ask about, which is not the same as the number of words you glossed.

There is a second, advisory gate in `src/lib/book/quality.js`
(`qualityOf`). It does not block anything. See section 9.

---

## 3. The top level, at a glance

| Field                | Required               | Shape                     | If it is missing                        |
| -------------------- | ---------------------- | ------------------------- | --------------------------------------- |
| `meta`               | **yes** (`title`)      | object                    | no title: rejected                      |
| `units`              | **yes**, at least one  | array                     | rejected                                |
| `info`               | no                     | object keyed by id        | no background pages                     |
| `teaching`           | in practice yes        | object keyed by unit id   | readings 2 and 3 are empty              |
| `swaps`              | no                     | `{word: substitute}`      | one trainer question type never offered |
| `plates`             | no (but see §1)        | `{scene: path}`           | every picture is a grey box             |
| `media`              | **yes, in `index.js`** | `{audio, cues}`           | silent book, no highlighting            |
| `cast`               | no                     | `{members: {...}}`        | falls back to Wren and Reader           |
| `guideVoice`         | no                     | object                    | no greeting, no reading intros          |
| `preshow`            | no                     | array                     | nothing before the door                 |
| `wrenReactions`      | no                     | keyed by unit id          | no interruptions                        |
| `dialogue`           | no                     | keyed by unit id          | nobody talks between parts              |
| `languages`          | no                     | array of objects          | no language picker                      |
| `lineTranslations`   | no                     | keyed by unit id          | no line translations                    |
| `wordTranslations`   | no                     | keyed by word             | no glossary translations                |
| `uiTranslations`     | no                     | keyed by English string   | interface stays English                 |
| `speechTranslations` | no                     | keyed by English sentence | speech stays English                    |
| `guide`              | no                     | `{objectives, standards}` | those guide sections are absent         |
| `recaps`             | no                     | keyed by unit id          | **read by nothing, see §5**             |
| `wrenLines`          | no                     | object                    | **read by nothing, see §5**             |

---

## 4. Field reference

### `meta`

```json
"meta": {
  "id": "example",
  "title": "An Example Book",
  "author": "Somebody Long Dead",
  "source": "Project Gutenberg #12345"
}
```

- **`title`** (string, required). The only field `validateBook` insists on
  in the entire book. Missing: rejected with `meta.title: a book needs a
title`. It is used in the guide and in the assignment name on every
  submission (`"<title> — Reading 2 Quiz"`).
- **`id`** (string). `validateBook` does not check it. `engine.test.js`
  does, and so does the reader: `main.jsx` uses `book.meta.id` as the
  storage key prefix for saved attempts, and `bookById` uses it to resolve
  a link. **Inert failure:** a pack with no `id` writes its saved work
  under a key containing `undefined`, so two such books overwrite each
  other's answers, and nothing complains.
- **`author`** (string, optional). Read by `guideOutline` as the byline.
  Absent means no byline.
- **`source`** (string, optional). Read by nothing. Keep it anyway: it is
  where the provenance of a public-domain text belongs.

### `units`

An array, at least one entry, in reading order. This is the story.

```json
{
  "id": "s1",
  "scene": "s1",
  "act": "Act I — The Knock",
  "num": 1,
  "title": "A Weary Midnight",
  "caption": "Interior. A study, past midnight. Lamp low.",
  "stanzas": ["line\nline\nline", "line\nline"],
  "para": "A plain-language summary of the scene.",
  "gloss": [["dreary", "dark, sad and boring"]],
  "mc": []
}
```

**`id`** (string, required). Rejected if missing, and rejected if it
duplicates another unit's id. It is the key that `teaching`,
`lineTranslations`, `wrenReactions` and `dialogue` all hang off, and it is
half of every narration clip name. Keep it short and URL-safe.

**`title`** (string, required). Rejected if missing. Shown in the
storyboard, the contents table and the guide.

**`stanzas`** (array of strings, at least one). Rejected with `a unit with
no text cannot be read` if absent or empty.

A stanza is a block. Lines within it are separated by `\n`. The engine
flattens every stanza, splits on `\n`, trims, and drops empty lines
(`linesOf` in `src/lib/reader/beats.js`). What comes out is the beat list:
one line on screen at a time, one recording each.

Three consequences a generator must respect:

1. **Line numbering runs across the whole unit, not per stanza.** The
   clip for the first line of stanza two in a unit whose first stanza had
   three lines is `n_<id>_3`, not `n_<id>_1_0`.
2. **A blank line changes nothing** because it is dropped, but it does not
   reset the count either.
3. **The line on screen is the book's line, punctuation and all.** The cue
   file only decides which word is lit. Do not strip punctuation to match a
   transcript.

Stanzas may contain the inline `{word|meaning}` markup. See below.

**`scene`** (string, optional, defaults to `id`). The key into `plates`.
Two units can share a picture by sharing a `scene`. Note carefully:
**pictures are keyed by `scene`, audio clips are keyed by `id`.** They are
usually equal and it is fine to leave `scene` off entirely.

**`act`** (string, optional). A division of the story. Shown above the
title in the reader and used to group the contents table. It is also what
the vocabulary trainer's odd-one-out question widens to when a single unit
does not yield three words, so a book with no acts offers that question
type less often. Not an error.

**`caption`** (string, optional). One line describing the picture. Used as
the image's alt text, falling back to `title`, falling back to `"Scene
illustration"`. This is the accessibility text for the whole visual layer.
Write it as a description of the picture, not as a restatement of the line.

**`num`** (number, optional). Read by nothing. Harmless.

**`para`** (string, optional). A plain-language summary. Read by nothing in
the current engine, despite both shipped books carrying one for every unit.
Harmless, and worth keeping: it is the obvious source for a future summary
view, and both real books have it.

**`gloss`** (array, optional). The words this unit stops to explain.

```json
"gloss": [
  ["dreary", "dark, sad and boring"],
  ["lore", "old knowledge and stories"]
]
```

Each entry is a **two-element array**, `[word, meaning]`.

- An entry with no word is rejected: `entry with no word`.
- An entry with no meaning is rejected: `"<w>" has no meaning`.
- **An entry whose word does not appear in this unit's own text is
  rejected**, with `"<w>" is glossed but does not appear in the text`. The
  reason, from `validate.js`: the vocabulary trainer would otherwise ask
  about a word the student never met, and could not show it in its line.
  This is the single check a generator trips most often.

The word must appear _in this unit_, not somewhere in the book. The match
is case-insensitive and uses `wordRe`, which is worth understanding:

- apostrophes and hyphens are **not** word boundaries, so `o'er` and
  `lamp-light` are single words, and glossing `mark` does not match inside
  `unremarkable`
- a trailing `'s` **is** allowed, so glossing `bosom` matches `my bosom's
core`, and glossing `Della` matches `Della's`. This exists because a
  stricter rule reported two of The Raven's glosses as defects and made
  every possessive in Magi unglossable
- an elision is left alone: glossing `o` does not match `o'er`
- multi-word glosses work: `watch house` is a legal glossed term

> **Inert failure, and it is easy to hit.** `validateBook` also accepts the
> object form `{"w": "dreary", "d": "..."}`, because `validate.js` reads
> `Array.isArray(entry) ? entry : [entry?.w, entry?.d]`. The reader does
> not. `glossOf` in `beats.js` reads `Array.isArray(pair) ? pair : []`, so
> an object-form entry is skipped. The book validates, the word appears in
> the vocabulary trainer, and it is **not tappable in the reading and not
> in the printed glossary**. Always use the array form.

**A word defined twice with different meanings is a warning, not an error.**
This is deliberate and the reasoning is worth reading in full at line 255
of `validate.js`. English words mean more than one thing and poetry leans
on it: Poe writes "to still the beating of my heart" and later "Let my
heart be still a moment", four stanzas apart, and both glosses are correct.
So both are kept in the reading, where the surrounding line settles which
is meant, and the trainer declines to quiz that word at all, because out of
its line there is no single right answer. The warning stays because the
other cause of a double definition, a generator glossing inconsistently by
accident, is real. The word is subtracted from `wordCount`.

Defining a word twice with the _same_ meaning is silent and fine.

**`mc`** (array, optional). Unit-level multiple choice. Validated exactly
like `teaching[id].mc` below.

> **Inert failure.** Nothing in the reader ever renders unit-level `mc`.
> `questionsOf` in `src/lib/reader/assessment.js` reads only
> `book.teaching[unitId].mc`. Put a question here and it is validated,
> counted by the quality report, and never asked. **Comprehension
> questions belong in `teaching`.**

### The inline `{word|meaning}` markup

Inside a stanza, `{word|meaning}` marks a hard word and defines it in
place:

```
"The stair was full of {gloom|near darkness}, and nobody had lit the lamp."
```

The reader shows `gloom`, tappable, with `near darkness` behind the tap.
The braces and the meaning never appear on screen (`plainStanza` strips
them), and the word counts as a normal word for line splitting and for cue
alignment.

**Inline glosses and the `gloss` list are the same promise.** `glossOf`
merges both into one map, `wordsOf` feeds both to the trainer, and
`validateBook` treats both as glossary entries when checking `swaps`. Use
whichever fits: inline for a word you want defined at the exact moment it
is read, the list for a word that occurs somewhere in the unit and deserves
an entry. Both shipped books use both.

The regex is `\{([^|{}]*)\|([^{}]*)\}`.

- **Braces must balance within each stanza.** Unequal counts are rejected
  with `unbalanced gloss braces (N open, M close)`. The reason: the reader
  would render `{hair` as literal text on screen, which is the classic
  generated-content failure.
- **A literal `{` or `}` in your prose will be counted.** There is no
  escape. If the source text contains a brace, remove it.
- **An empty word is rejected**: `gloss with an empty word`.
- **An empty meaning is rejected**: `gloss "<w>" has no meaning`.
- The word may not contain `|` or braces. The meaning may not contain
  braces, but it _may_ contain a `|`: `{x|y|z}` parses as word `x`, meaning
  `y|z`. That is almost certainly not what you meant.
- An inline gloss cannot fail the "does not appear in the text" check, by
  construction. That is a reason to prefer it when generating.

### `info`

Background material that is taught but never read aloud: an author study,
a note on why the text lasted.

```json
"info": {
  "notes": {
    "id": "notes",
    "scene": "notes",
    "type": "info",
    "act": "Between the readings",
    "title": "Where this story came from",
    "caption": "A page that is shown, not read aloud.",
    "spoken": ["..."],
    "html": "<h3>...</h3>"
  }
}
```

An object keyed by id. The key is what `teaching`, `dialogue`,
`wrenReactions` and `lineTranslations` refer to; the `id` inside the entry
should match it.

Info ids are real unit ids for every purpose that asks "is this a real
unit": `allUnitIds` unions `units` and `Object.keys(info)`. Teaching an
info page is legal and expected. Both shipped books teach two of them.

What is actually read off an info entry: `scene` (for the plate), `caption`
and `title` (for alt text and the storyboard), and `act` and `title` (for
the guide). Its questions come from `teaching`, its conversation from
`dialogue`, and both are appended after the story rather than dropped,
because losing a question silently shows up as a class where the marks do
not add up.

> **Inert.** `spoken`, `html` and `type` are carried by both shipped books
> and read by nothing in the current engine. There is no `innerHTML` render
> path anywhere in `src/`. An info page's prose is currently not displayed;
> what a student sees is the picture, the conversation about it, and the
> questions. Do not spend generation effort on `html`.

### `teaching`

This is the assessment, and it is where readings 2 and 3 come from. An
object keyed by unit id (a story unit or an info id).

**A key that is not a known unit id is rejected**: `teaches a unit that
does not exist`. That check catches a renamed unit before the mark does.

```json
"teaching": {
  "s1": {
    "watch": "One thing to look for, said before the part is read.",
    "focus": "What to listen for, second reading.",
    "debrief": { "ok": "...", "no": "..." },
    "writeIntro": "How to structure the written answer.",
    "mc": [ ... ],
    "recap": { ... },
    "sa": { ... }
  }
}
```

**`watch`** and **`focus`** (strings, optional). Shown in the guide, and
translated via `speechTranslations` when a language is on. Point at exactly
the thing the questions will ask about: that is the whole design of reading
two.

**`debrief`** (`{ok, no}`, optional). Read by nothing in the current
engine. Kept out of the guide on purpose (it would be an answer key a
student can read before the quiz), and not rendered anywhere else.

**`writeIntro`** (string, optional). Shown in the guide as the intro to the
written prompt. Only appears if `sa.q` exists.

**`mc`** (array, optional). The reading-two questions, asked in order.

```json
{
  "q": "Why does Mira move slowly once she has found the lamp?",
  "opts": ["...", "...", "...", "..."],
  "correct": 1,
  "fb": "The text says the glass was thin and brittle."
}
```

- **`q`** required. `question with no text` if missing.
- **`opts`** must have **at least two** entries: `needs at least two
options`.
- **`opts` must be unique**: `duplicate options`. Two identical strings
  mean two right answers or two wrong ones, and the student cannot tell.
- **`correct`** must be an integer in `[0, opts.length)`: `answer N is not
one of M options`. The reason from `validate.js`: this is not a cosmetic
  fault, it is a mark a student cannot earn, discovered in front of a
  class. It is zero-based.
- **`fb`** (string, optional). Shown after the student answers, right or
  wrong. Not validated. `QuestionCard` also accepts `explain` as an alias.
  Write it: an answered question that explains itself is the difference
  between a quiz and a lesson.

**`recap`** (object, optional). A looking-back question placed after this
unit's own questions. Same shape as an `mc` entry plus `label` (a heading)
and `wren` (a line for the guide character).

> **The contract is much weaker here than it looks.** `validateTeaching`
> checks only that a recap has a `q` and a non-empty `opts`. It does not
> check `correct` at all, does not require two options, and does not check
> for duplicates, even though `assessment.js` pushes recaps into the same
> question list and marks them with the same `choice === q.correct`. A
> recap with `correct: 7` and four options is **accepted by the contract
> and cannot be answered correctly by anyone**. Hold recaps to the same
> standard as `mc` yourself.

**`sa`** (object, optional). The reading-three written prompt. One per
unit.

```json
"sa": {
  "q": "What is the stair like before the lamp is lit? Use two details.",
  "hint": "One thing you can see, and one thing you can feel.",
  "minWords": 12,
  "opinion": false,
  "core": [
    ["dark", "darkness", "gloom", "black", "unlit"],
    ["cold", "dusty", "soot", "dirty", "old"]
  ],
  "support": ["stair", "lamp", "landing", "tread"],
  "phrases": ["full of gloom", "still and black"]
}
```

- **`q`** required if `sa` exists: `a written prompt with no question`.
- **`core` and `support` cannot both be empty**: `nothing for the grader to
look for`. The reason: otherwise every answer scores nil. Note that
  **`phrases` alone does not satisfy this** (the check is
  `core.concat(support)`).
- **`core`** is a list of _ideas_. Each entry is either a string or an
  array of synonyms for one idea; all synonyms present are reported, and
  the first is the idea's label. Coverage is `coreHit / core.length`, so
  each entry costs a real fraction of the score. Group synonyms; do not
  list them as separate ideas.
- **`support`** is the same shape, worth a small bonus, not a fraction.
- **`phrases`** are matched as substrings against the _normalised_ answer.
  `norm` in `src/lib/reader/grader.js` lowercases, keeps letters, digits,
  spaces and apostrophes, and turns everything else into a space. **A
  phrase containing a comma, a dash or any other punctuation can never
  match.** Write `full of gloom`, never `full of gloom,`.
- **`minWords`** (number). An answer under 60% of it is banded `low`
  regardless of coverage.
- **`opinion`** (boolean). Changes the grading to keep the promise the
  question made: length shows effort, touching any idea group shows the
  answer is grounded, and no particular position is required. Set it on
  any prompt that asks the student what they think.

Nothing here is ever shown to a student before they answer. `core`,
`support`, `phrases` and `fb` are deliberately excluded from the learning
guide, and `outline.test.js` fails if any of them leak into it.

### `swaps`

A map from a glossed word to a word that could stand in for it. It powers
one vocabulary question type ("which word fits here instead?").

```json
"swaps": { "gloom": "darkness", "brittle": "fragile" }
```

Validated against the glossary it claims to serve:

- **An empty substitution is rejected**: `empty substitution`.
- **A substitution equal to its own word is rejected**: `substitution is
the word itself`. It teaches nothing.
- **A word that is not glossed anywhere in the book is rejected**: `"<w>"
is not in any unit's glossary`. Inline glosses count.
- **A substitution with a run of two or more spaces is rejected**:
  `substitution has stray whitespace`.

Keys are matched case-insensitively against the glossary, and the trainer
looks them up lowercased. Use lowercase keys.

> Not checked, but a real defect: **mutual swaps**. If `glimmered` swaps to
> `flickered` and `flickered` swaps to `glimmered`, a question about either
> one has two right answers. `distractorsFor` in `src/lib/vocab/kinds.js`
> defends against this at question-build time, so the pair is safe, but it
> is a shape to be aware of. The fixture ships that exact pair on purpose,
> to keep the defence tested.

### `plates`

A map from a scene id to a picture file, relative, no leading slash.

```json
"plates": { "cover": "art/cover.webp", "s1": "art/s1.webp" }
```

Looked up as `plates[unit.scene || unit.id]`, and for info pages as
`plates[info.scene || id]`. `plates.cover` is used by the door screen.

Not validated at all. **Inert failure:** a missing entry produces
`plate.src === null`, and the reader draws an empty box with the caption as
its `aria-label`. Deliberately: the art is content-addressed in Magi, so
guessing a path would 404 rather than fail loudly, and a blank frame is at
least honest. Nothing tells you the key was wrong.

Extra keys are harmless. Both shipped books carry more plates than units,
because the original builds changed the picture partway through a segment
and the engine currently shows one picture per unit.

### `media` (pack file only)

```json
"media": { "audio": "example-audio/", "cues": "cues/example.vtt" }
```

`audio` is a **prefix**, not a directory reference: `Scene.jsx` builds the
source as `` `${audioBase}${clip}.mp3` ``. Include the trailing slash.

`cues` is one WebVTT file for the whole book. See section 6.

Not checked by `validateBook`. Checked by `engine.test.js` for every pack
in `BOOKS`: both must be present, both must be relative, neither may start
with `http`.

### `cast`, `guideVoice`, `preshow`, `wrenReactions`, `dialogue`

The performance layer. None of it is validated. All of it is optional, and
all of it is inert when absent, which is usually what you want.

**`cast`**: `{ members: { <id>: {id, name, role, voice, side, blurb, art} } }`.
If absent or empty, `castOf` falls back to two members, `wren` (a guide)
and `prof` (a reader). `blurb` appears in the guide's "who reads it" list.
`art` is used directly as an `<img src>`, so it is a path and belongs
wherever section 1's rule puts it (Magi: `book.json`; Raven: `index.js`).

Dialogue entries write `"w"` and `"p"`; `speaker()` maps those to `wren`
and `prof`. Any other value is used as a member id as-is. **Inert failure:**
a `who` that names no member renders a speaker with an empty name.

**`guideVoice`**: only `hello` and `passIntro` are read.

- `hello` (string): the greeting at the door. Clip `g_hello`.
- `passIntro` (`{"1": "...", "2": "...", "3": "..."}`): what each reading
  will ask of you. Clips `g_pass1`, `g_pass2`, `g_pass3`. Keys are
  stringified numbers.
- `name`, `praise`, `nudge` and `end` are carried by both shipped books and
  **read by nothing**.

**`preshow`**: an array of `{state, text}`, played before the door. Clips
`g_pre0`, `g_pre1`, and so on by array index.

**`wrenReactions`**: `{ <unitId>: [{at, state, line}] }`. `at` is a **beat
index**, meaning a line index within that unit, zero-based, counted the
same way clips are. An entry with a `state` and no `line` is a change of
expression only, not an interruption, and produces no stop and no clip. An
entry with a `line` becomes a stop, with clip `wh_<unitId>_<at>`.

> **Inert failure:** an `at` beyond the last line of the unit never fires.
> Nothing checks it. Count your lines.

Reactions and dialogue are played **only in reading one**. Readings two and
three are not interrupted, because a question is hard enough to answer
without someone talking over the passage it is about.

**`dialogue`**: `{ <unitId>: [{who, state, text}] }`, the conversation
after a part. Clips `d_<unitId>_<i>` by array index. Works for info ids
too.

### `languages` and the four translation maps

**`languages`**: what the picker offers.

```json
"languages": [
  { "code": "es", "name": "Español", "en": "Spanish" },
  { "code": "ko", "name": "한국어", "en": "Korean" }
]
```

`code` is what every translation map is keyed by. `name` is shown in the
picker in its own script, `en` beside it in English.

> **Inert failure.** `validateTranslations` tolerates a bare string in this
> array (`typeof l === 'string' ? l : l?.code`), but `languagesOf` filters
> to `l && l.code`. A language written as `"es"` instead of `{"code":"es"}`
> validates and is invisible in the app. Always use the object form.

**The one check here runs in a deliberate direction.** For each offered
language, if `wordTranslations` is non-empty and _no_ word is translated
into that language, the book is rejected: `offered to students but no word
is translated into it`. The reverse is explicitly allowed: Magi's word list
carries `zh`, `vi`, `id`, `pt`, `fr` and `ru` that the picker does not
show, and that is a feature. Data ready for a language not yet exposed is
fine. Offering a language a student then finds empty is not.

Note the guard: if `wordTranslations` is absent or empty entirely, the
check does not fire. The Raven ships four languages and no translations at
all, and passes. That is a hole, not a licence.

**`lineTranslations`**: `{ <unitId>: { <code>: [line, line, ...] } }`.

Indexed by position, one entry per **line**, not per stanza. A key that is
not a known unit or info id is rejected: `translates a unit that does not
exist`.

> **Inert failure, and the one most worth guarding against.** If the array
> length does not equal the unit's line count, `lineTranslation` returns
> `null` for every line of that unit and the reader shows nothing. This is
> deliberate: showing a student the wrong sentence in their own language is
> worse than showing them none. It is silent. Count lines the way
> `linesOf` does: flatten the stanzas, split on `\n`, trim, drop empties.

**`wordTranslations`**: `{ <word>: { <code>: "..." } }`. Keys are looked up
lowercased, so write them lowercase. Keys that are not glossed words are
never looked up and are harmless.

**`uiTranslations`**: `{ "<English UI string>": { <code>: "..." } }`. Keyed
by the exact English phrase the interface uses. A missing entry falls back
to English, never to a blank or a key.

**`speechTranslations`**: `{ "<English sentence>": { <code>: "..." } }`.
Keyed by the sentence itself, whitespace-collapsed and trimmed, because a
line built from two recordings translates as its parts. This covers
dialogue, reactions, the preshow, the greeting, and the `watch` and `focus`
lines in `teaching`. Not validated: a key that matches no spoken line is
simply never found.

### `guide`

Optional. Adds two sections to the learning guide.

```json
"guide": {
  "objectives": [
    { "objective": "...", "developed": "...", "evidenced": "..." }
  ],
  "standards": {
    "framework": "...",
    "rows": [{ "code": "...", "text": "...", "where": "..." }],
    "note": "..."
  }
}
```

If absent, those sections do not appear and the guide says so, explicitly,
rather than inventing an alignment. That behaviour is load-bearing: naming
a standard a book has not claimed is the one thing a compliance document
must never do. Do not generate standards codes.

---

## 5. Declared but never read

Verified by searching all of `src/` outside `src/books/` and the tests.

| Field                                             | Status                                                                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `book.recaps`                                     | In the `Book` typedef, carried by both shipped books, read by nothing. Recaps are read from `teaching[id].recap`. |
| `book.wrenLines`                                  | Present and empty (`{}`) in both shipped books. Read by nothing.                                                  |
| `guideVoice.name` / `.praise` / `.nudge` / `.end` | Carried, read by nothing.                                                                                         |
| `unit.para`                                       | Carried for every unit in both books, read by nothing.                                                            |
| `unit.num`                                        | Read by nothing.                                                                                                  |
| `unit.mc`                                         | Validated and scanned by `quality.js`, never rendered. See the warning under `units`.                             |
| `teaching[id].debrief`                            | Read by nothing.                                                                                                  |
| `info[id].spoken` / `.html` / `.type`             | Read by nothing.                                                                                                  |
| `meta.source`                                     | Read by nothing. Keep it for provenance.                                                                          |

None of these are errors. A generator should not spend effort on them, and
a person removing them should know that the two shipped books and
`validate.test.js`'s "is a whole book, not a sketch" check both expect
`recaps` to be present.

---

## 6. The names the engine hardcodes

**A generator that invents its own names produces a silent book.** None of
these are configurable and none of them are validated.

### Audio clip ids

| Clip id             | What it speaks                           | Built by                           |
| ------------------- | ---------------------------------------- | ---------------------------------- |
| `n_<unit.id>_<i>`   | narration, line `i` of the unit          | `beatsOf`, `reader/beats.js`       |
| `wh_<unit.id>_<at>` | Wren's reaction to line `at`             | `reactionsFor`, `speech/script.js` |
| `d_<unit.id>_<i>`   | turn `i` of the dialogue after that unit | `talkFor`                          |
| `g_pre<i>`          | preshow item `i`                         | `preshowRun`                       |
| `g_hello`           | `guideVoice.hello`                       | `helloRun`                         |
| `g_pass<n>`         | `guideVoice.passIntro[n]`                | `passIntroRun`                     |

`<i>` and `<at>` are zero-based. Narration uses the **unit id**, not the
scene id. Line numbering runs across the whole unit.

### The file name

```
`${media.audio}${clip}.mp3`
```

From `Scene.jsx`. The extension is `.mp3`, hardcoded, with no fallback
source element. There is no manifest of which recordings exist: `beatsOf`
accepts a `hasClip` predicate, but the reader never supplies one, so every
beat names a clip whether or not the file is there. A missing recording is
a 404 and a line the student has to advance by hand. Nothing warns.

### The cue file

One WebVTT file for the whole book, at `media.cues`. Not one per clip:
itch.io refuses a zip of more than 1000 files and per-clip cues put the
build at 1266, quite apart from costing 519 requests.

Each clip is one cue, and **the cue identifier is the clip id**:

```
WEBVTT

n_s1_0
00:00:00.100 --> 00:00:02.000
Once <00:00:00.477>upon <00:00:00.816>a <00:00:01.010>midnight

n_s1_1
00:00:02.100 --> 00:00:04.400
Over <00:00:02.390>many <00:00:02.640>a <00:00:02.780>quaint
```

The first word carries the cue's own start time and is not re-stamped
inline. Timestamps are `hh:mm:ss.fff`. `wordsByClip` in
`src/lib/media/vtt.js` splits the bundle on blank lines and keys each block
by its identifier line.

The cue text is a **timing artifact**, not the text on screen. It comes
from a transcriber and has no punctuation. `alignCues` matches it against
the book's own words to decide which one to light, greedily and looking
only forwards, tolerating the roughly 10% of clips where the tokenisation
disagrees. Never render cue text. Never edit the book to match a
transcript.

If the cue file is missing or fails to load, the reading still works: the
line is always on screen, and only the word highlighting is lost. That is
why The Raven can name a `cues` path for a file that does not exist yet.

`tools/timings-to-vtt.mjs` (`npm run book:cues`) builds the bundle. Whisper
emits this format directly, which is what makes a new book's timings a GPU
job rather than an authoring job.

### Picture paths

Whatever `plates` says, keyed by `unit.scene || unit.id`, and `cover` for
the door. Relative, no leading slash. Nothing is derived and nothing is
guessed.

---

## 7. A minimal valid book

This is complete and it passes. It was written to a file and run through
`node tools/check-book.mjs`, which reported `PASSES the contract`, one
unit, three words, zero warnings. Copy it and fill it in.

```json
{
  "meta": {
    "id": "example",
    "title": "An Example Book",
    "author": "Somebody Long Dead",
    "source": "Project Gutenberg #12345"
  },
  "units": [
    {
      "id": "s1",
      "scene": "s1",
      "act": "Act I",
      "num": 1,
      "title": "The Road at Dusk",
      "caption": "A narrow road, and the last of the light on it.",
      "stanzas": [
        "The road was {narrow|not wide} and the light was going.\nHe walked on, because there was nowhere on it to stop.",
        "A dog barked once from a yard he could not see.\nAfter that the evening was {silent|with no sound at all}."
      ],
      "para": "A man walks a narrow road at dusk. There is nowhere to stop, a dog barks once, and then nothing.",
      "gloss": [["yard", "the ground around a house"]]
    }
  ],
  "teaching": {
    "s1": {
      "watch": "One man, one road, and the light going. Watch what stops him resting.",
      "focus": "Listen for the reason he keeps walking.",
      "debrief": {
        "ok": "Yes: there is nowhere on the road to stop.",
        "no": "Read the second line again. The reason is in it."
      },
      "writeIntro": "Say what the road is like, then give one detail from the text as evidence.",
      "mc": [
        {
          "q": "Why does the man keep walking?",
          "opts": [
            "He is being followed by the dog.",
            "There is nowhere on the road to stop.",
            "He has been told to arrive before dark.",
            "He is trying to keep warm."
          ],
          "correct": 1,
          "fb": "The text says he walked on because there was nowhere on it to stop. Nothing is chasing him."
        }
      ],
      "sa": {
        "q": "What is the road like at this hour? Use two details from the text.",
        "hint": "One thing you can see, and one thing you can hear.",
        "minWords": 12,
        "core": [
          ["narrow", "thin", "small"],
          ["dark", "dusk", "evening", "night"]
        ],
        "support": ["road", "dog", "silent"],
        "phrases": ["nowhere on it to stop"]
      }
    }
  }
}
```

Its pack file, `src/books/example/index.js`:

```js
import data from './book.json';

/** @type {import('../../lib/types.js').Book} */
export default {
  ...data,
  plates: {
    cover: 'art/example-cover.webp',
    s1: 'art/example-s1.webp',
  },
  media: {
    audio: 'example-audio/',
    cues: 'cues/example.vtt',
  },
};
```

That pack expects four recordings: `n_s1_0.mp3` through `n_s1_3.mp3` (four
lines: two stanzas of two), each with a cue of the same id in
`cues/example.vtt`.

A useful first check on any generated book: does the line count you
believe in match `linesOf`? Everything downstream, clips, cues, reactions
and line translations, is indexed by it.

The **fullest worked example** is `src/books/fixture/book.json`. It is a
whole book that nobody wrote and nobody owns, built deliberately to carry
every shape the engine handles: four units in two acts, two info pages,
inline and listed glosses, questions, recaps, written prompts, a cast,
conversations, substitutions, plates and two complete languages. It also
carries two shapes on purpose that you would otherwise mistake for
mistakes: `still` glossed twice with different meanings, and `glimmered` /
`flickered` swapping for each other. Read it before generating anything.

---

## 8. What a generator gets wrong

Every item here is a check that exists because it happened. In rough order
of how often it fires.

1. **Glossing a word that is not in the text.** Rejected. The word must
   appear in _that unit_, not elsewhere in the book, and not in a form the
   boundary rule will not reach. Safest fix: prefer inline
   `{word|meaning}`, which cannot fail this check.
2. **Unbalanced braces in a stanza.** Rejected. Usually a truncated
   generation, sometimes a literal brace in the source text.
3. **`correct` pointing at an option that does not exist.** Rejected. It is
   zero-based. A model that writes options as A, B, C, D and then answers
   "B" as `2` produces a mark nobody can earn.
4. **Duplicate options.** Rejected. Two paraphrases of the same idea are
   worse than duplicates, and the contract cannot see those at all.
5. **A substitution equal to its own word.** Rejected. Also: a substitution
   for a word that is not glossed anywhere.
6. **An `sa` with no `core` and no `support`.** Rejected. `phrases` does
   not count.
7. **A `teaching` key that is not a unit or info id.** Rejected. Renaming a
   unit and forgetting the teaching map is the usual cause.
8. **Offering a language nothing is translated into.** Rejected, but only
   when `wordTranslations` is non-empty.
9. **Object-form gloss entries.** Accepted, and the word is then not
   tappable and not in the glossary. Use `[word, meaning]`.
10. **A bare string in `languages`.** Accepted, and invisible.
11. **Questions written on the unit instead of in `teaching`.** Accepted,
    never asked.
12. **A recap with a bad `correct`.** Accepted, unanswerable.
13. **`lineTranslations` arrays that do not match the line count.**
    Accepted, and every translation for that unit silently disappears.
14. **`wrenReactions` with an `at` past the end of the unit.** Accepted,
    never fires.
15. **`phrases` containing punctuation.** Accepted, never matches.
16. **Inventing clip names, or a `.wav` extension.** Accepted, and the book
    is silent.
17. **A leading slash on any path.** Accepted locally, 404s on itch.
18. **Missing `meta.id`.** Accepted, and two books then share a gradebook.

---

## 9. Quality, not just validity

Everything above is structure. A book that passes every check in
`validate.js` is safe to put in front of a class. It is not necessarily
worth putting in front of a class, and nothing in the contract can tell the
difference.

This matters more as generation scales. A model asked for eight
comprehension questions returns eight well-formed comprehension questions,
every time, and some of them test nothing. There is nothing malformed to
see.

Some of the gap is machine-checkable, and `src/lib/book/quality.js`
(`qualityOf`) checks it. That report is advisory: it does not block, it
scores a book so a batch can be sorted worst-first, and a human author may
knowingly break any of its rules and be right to. Its bar for a rule is
that a student could exploit the pattern to score without reading. It
currently finds:

- the right answer sitting in the same option position too often (measured
  against the shipping book, this found that 43% of Magi's answers are
  option 0)
- the longest option being the answer too often
- distractors containing absolutes ("always", "never", "all of"), which
  read as false to anyone who has sat an exam
- a definition that contains the word it defines
- the same question asked twice
- a part of the book nothing asks about

**The rest is not machine-checkable, and this is the important half.** A
structurally perfect book can still be a bad one in ways nothing in this
repository can detect:

- **A question answerable without reading the passage.** "Why was the
  narrator sad?" with one plausible option and three absurd ones tests
  general knowledge, or nothing. Detecting this properly needs a model in
  the loop, answering with the text withheld and being scored against
  chance. Deterministic code cannot do it. This is the single largest known
  gap.
- **Distractors that are obviously wrong.** Options nobody would pick do
  not narrow the field; they turn a four-option question into a
  one-option question.
- **A gloss that defines a word using a harder word.** Note that a length
  proxy for this was tried and removed: it flagged `coax` as "gently
  persuade" and `truant` as "staying away from school without permission",
  both of which are exactly right. Length is not difficulty. Doing it
  properly needs a word-frequency list.
- **A gloss that is right but useless in context**, giving the dictionary
  sense rather than the one the line is using.
- **A writing prompt with no position to take.** "Describe what happens in
  this part" is a summary task wearing the clothes of an analytical one.
  A prompt should have at least two defensible answers.
- **`core` idea groups that are not really separable**, so coverage is
  effectively one idea scored twice.
- **`watch` and `focus` lines that point at something the questions never
  ask about**, which quietly breaks the whole design of reading two.
- **A `caption` that restates the line instead of describing the picture**,
  which leaves a screen-reader user with no idea what is on screen.

None of that is solved here, and this section is not an attempt to solve
it. It is here so that nobody reads "PASSES the contract" as "this is a
good book". The contract stops at structure. Somebody still has to read the
book.

---

## 10. Where the code and the types disagree

Noted rather than fixed, because this is documentation only. Each was
checked against both files.

- **`Unit.gloss` is typed `string[][]`** in `src/lib/types.js`, which
  matches what the reader accepts. `validate.js` additionally accepts
  `{w, d}` objects, and `wordsOf` and `quality.js` accept them too, but
  `glossOf` does not. The type is right and the validator is too
  permissive.
- **`meta` is typed `{title, id?, source?}`** and does not declare
  `author`, which `guideOutline` reads and the fixture provides.
- **`book.guide`** (objectives and standards) is read by `guideOutline` and
  is not in the `Book` typedef at all.
- **`book.speechTranslations`** is read by `translate.js` and is not in the
  `Book` typedef, although `lineTranslations`, `wordTranslations` and
  `uiTranslations` all are.
- **`book.recaps`** is in the `Book` typedef and is read by nothing.
- **`Unit.mc`** is in the typedef and is validated, but the reader takes
  its questions only from `teaching`.

## 11. Checks whose reason is not written down

Nearly every check in `validate.js` carries a comment saying why it exists,
and those reasons are reproduced above. Two do not, and I am inferring
rather than quoting:

- **`duplicate options`** has no stated reason. The inferred one is that
  two identical options make one of them unmarkable and the pair
  indistinguishable to the student.
- **`substitution has stray whitespace`** (a run of two or more spaces) has
  no stated reason. The inferred one is that it is a formatting artifact
  from extraction rather than a pedagogical fault, and it would render as a
  visibly broken option.

Neither inference changes what an author or a generator should do.
