# The plan

## Where we are

`legacy/` is the product. It works, it is on itch, and it has everything:
three readings, the quiz, the written work, Wren and Professor Ambrose,
the class and teacher side, the guide, translations, settings.

`src/` is the reading spine and the vocabulary trainer — two of
twenty-three features — on much better foundations: 132 unit and 107
end-to-end tests across four real browsers, WCAG audited, a book contract
that has already caught two real defects in the shipping app, and a
release process that refuses to build a zip itch will reject.

Neither is finished. The plan is to stop treating them as rivals.

## The strategy

**`src/` is the product. `legacy/` is the prototype it was drawn from.**

_Changed at 0.5.1._ The plan up to here was to keep legacy shipping and
cut over feature by feature when the rebuild won on merit. That is no
longer the arrangement: the React build is the shipping build, and the
single-file HTML app is reference — the place to look up how something
was meant to behave, and the source the book was extracted from.

What follows from that:

- **A missing feature is now a missing feature**, not a reason to keep
  two apps. The list of what legacy has and the rebuild does not is a
  work queue, and it is finished when the queue is empty.
- **Legacy is still never edited or reformatted.** It is a reference, and
  a reference that drifts is worth nothing. The tests that guard its
  shape stay.
- **The book package is still the point.** A second title should need
  new content and no new code.

Ship from `src/`. Read `legacy/` when something is unclear.

## What React is actually for

Not styling. The legacy CSS is good. What a component model and a router
buy is **navigation that behaves the way people already expect**, which
is where the legacy app is genuinely janky:

| today                                                   | what people expect                                            |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| Back button leaves the app                              | Back goes back one screen                                     |
| No URL for anything                                     | `/read/s4/2`, `/practise`, `/class` — bookmarkable, shareable |
| A teacher cannot link a class to a page                 | The class link _is_ a URL                                     |
| Modals hand-rolled; keyboard leaks to the page behind   | `<dialog>`: focus trapped, Escape closes, background inert    |
| Layout measured and set in JS, and it drifts            | CSS owns layout; it cannot drift                              |
| State in one mutable global; stale reads blank the page | State transitions are pure functions with tests               |

So: **routes first**, because that is the change a person actually feels,
and `<dialog>` for every overlay. Reproduce legacy's _information_, not
its interaction model, wherever the conventional pattern is clearer.

## One engine, many books

This is a goal, not a description of where we are. A second title should
be a new folder under `src/books/` and **no change anywhere else** — new
content, no new code.

That only stays true if something checks, because the cheapest way to
write any feature is to reach for the book in front of you, and the
damage is invisible until the day somebody tries to ship a second one.
So `src/engine.test.js` fails if anything outside `src/books/` names a
book, or hard-codes where a book keeps its audio or its cues.

The split:

|                                     |                                                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/lib`, `src/ui`, `src/main.jsx` | the engine. Knows about readings, questions, speech, gradebooks. Knows no titles.                           |
| `src/books/<id>/book.json`          | what the extractor produces: story, teaching, characters, translations. Portable data, no deployment in it. |
| `src/books/<id>/index.js`           | the pack: the data plus where its media sits once built.                                                    |
| `src/books/index.js`                | the registry, and the only place a title is named.                                                          |

### Repositories

Three things, three repositories. Settled 2026-08-25.

| repository                                                                                                            | what it is |
| --------------------------------------------------------------------------------------------------------------------- | ---------- |
| [`magi-reader-engine`](https://github.com/dancockrell/magi-reader-engine)                                             | the engine |
| [`the-gift-of-the-magi-o-henry-magi-reader`](https://github.com/dancockrell/the-gift-of-the-magi-o-henry-magi-reader) | the book   |
| [`the-raven-edgar-allan-poe-magi-reader`](https://github.com/dancockrell/the-raven-edgar-allan-poe-magi-reader)       | the book   |

**The naming rule: full title, author, then the engine.** The engine
itself ends in `-engine`, so that a stranger looking at a list of three
similar names can tell in one glance which one is the code.

Two reasons for the long book names. Spelled out, because someone
searching has the whole title in their head and not our shorthand. And
with the author, because a classic title alone competes with a century
of results — "The Raven Edgar Allan Poe" reaches us and "the-raven" does
not.

#### On the name

The engine was called Raven Reader for about a day. That was a mistake
and it is worth leaving the reason written down: the name came from the
prototype file, was promoted to the product, and was published to GitHub
without anyone checking whether it existed. It does —
[ravenreader.app](https://ravenreader.app/), an RSS reader with press
coverage going back to 2018. Checking availability is not a step after
naming; it is part of what makes a name discoverable at all.

Magi Reader was chosen against a harder test: not merely unclaimed, but
sitting where the audience is already looking. `<Classic> Reader` is the
naming grammar of the graded-reader trade — Penguin Readers, Macmillan
Readers, Oxford Bookworms — so to a language teacher the name already
says what the thing is. _The Gift of the Magi_ is the first book, so the
engine and its flagship title reinforce each other; and a story about
two people each giving up the thing they love most so the other can have
what they need is a fair banner for something given away free to
classrooms.

The cost, accepted knowingly: the Magi book repository stutters —
`the-gift-of-the-magi-o-henry-magi-reader`. Every other title reads
clean, and it is the price of the engine being named after one of its
own books.

**Storage keys keep the `raven.` prefix.** `raven.api.v1`,
`raven.prefs.v2`, `raven.outbox.v1` and the rest are not brand names,
they are where a real teacher's class key and a real student's unsent
work already live. Renaming them would orphan that data on every device
running the shipped build, silently, to fix something no user can see.
They stay until there is a migration worth writing.

Two older repositories are history, and their descriptions say so:
`the-gift-of-the-magi-o-henry-html-prototype` (archived — the
prototype's build snapshots, now also the `prototype` branch here) and
`magi-reader-classroom-toolkit` (the toolkit this grew out of; still
holds the QR check-in page and the voice generators, which have not been
ported).

### Splitting the Magi pack out

The Raven was easy: it existed only in the classroom toolkit, so giving
it a repository _removed_ a copy. Magi is not, and doing it carelessly
would recreate the duplication that started this.

`src/books/magi/` was loaded directly by **fourteen** test files, not the
ten this section used to claim, and by the app itself. Before it can
move:

1. ✅ **A fixture book of its own.** `src/books/fixture/` is _The Lantern
   on the Stair_, written for the purpose: four units, two acts, two info
   panels, 24 glossed words, a cast, dialogue, and Spanish and Korean
   throughout. Eleven of the fourteen files moved onto it. Three did not,
   and the reason matters: `extracted.test.js` counts the real extraction
   against `legacy/index.html`, `align.test.js` needs the real cue file,
   and the Magi-only assertions pulled out of the others now live in
   `src/books/magi/pack.test.js` so they travel **with the pack** when it
   leaves.

   The fixture is not registered in `src/books/index.js`. A fake title in
   a reader's book list is a defect, and nothing outside a test imports
   it, which was checked by building and searching the bundle for its
   text.

   It carries the shapes that break things, which is the only reason a
   synthetic book is worth having: a pair of words that substitute for
   each other, a glossed phrase of two words, a word explained two
   different ways, and a `teaching[x].recap` that Magi never uses and
   that therefore had no coverage at all until now.

2. The engine needs a **bring-your-own-pack contract**: a documented way
   to point a build at a pack that is not in the repository. A workspace,
   a submodule, or a copy step, decided now that step 1 is done.
3. Only then does `src/books/magi/` move out, and
   `the-gift-of-the-magi-o-henry-magi-reader` becomes real.

Until then the engine repository carries the Magi pack, and that is a
known, written-down exception rather than an accident.

One thing to know before writing anything under `src/books/`: `tsconfig`,
`eslint` and `prettier` all exclude that directory, so a pack's own tests
are outside type-checking and linting. That is the price of putting a
pack's tests with the pack, and it is deliberate, but it means a mistake
there is caught only by `vitest`.

### A pack should load in parts

`book.json` is 1 MB, and about 600 KB of that is the four translations —
every line of the story, everything Wren and the Professor say, and the
interface, in Korean, Japanese, Thai and Spanish. A reader in English
downloads all of it and uses none of it.

Splitting the translations into a chunk that loads when a language is
chosen would more than halve the first load. Worth doing before a second
book, because two 1 MB packs in one bundle is the point where it stops
being a detail. Not a correctness problem today.

## Phases

Each phase ends green: `npm run verify:full` passes, a version is tagged,
and the artifact is uploadable.

---

### Phase 1 — Get the whole book out of the HTML

**Why first.** Everything else needs it, and it is the multi-book goal on
its own. Until this is done the rebuild has no questions to ask and no
guide to show.

Still inside `legacy/index.html`: the teaching layer (multiple-choice
questions, written prompts, recaps), Wren's and the Professor's lines,
the cast dialogue, the translations, the guide document.

- Extend `tools/extract-book.mjs` to lift the teaching layer, dialogue,
  guide voice, and translations
- Extend `validateBook` to cover them: an answer index that points at no
  option, a prompt with no question, a translation for a line that does
  not exist
- Extend `book.json` and its typedefs

**Done when** the extracted package contains every question, prompt,
recap, character line and translation in the book, the contract passes,
and a test proves nothing was dropped — counts compared against the
source, not assumed.

**Risk.** The teaching layer is generated and may not be a clean literal.
If it cannot be lifted by parsing, parse the rendered page instead.

---

### Phase 2 — The shell: routes, layout, settings

**Why now.** Everything after this hangs off navigation, and retrofitting
routing is worse than starting with it.

- `react-router` with real URLs: `/`, `/read/:unit/:beat`, `/practise`,
  `/class`, `/guide`
- An app shell: header with Vocabulary, Learning guide, Class, Language,
  Settings — the same doors legacy has, in the same place
- `<dialog>` for every overlay
- Settings as real state: contrast, larger text, reduced motion, pace,
  sound — each persisted, each with a test
- The gate: title, the three readings, resume

**Done when** Back and Forward work, every screen has a URL that survives
a reload, no overlay leaks keyboard focus to the page behind it, and axe
reports nothing on any route.

---

### Phase 3 — The three readings ✅ 0.4.0

Reading 1 exists. Two to go, and they are the assessment.

- ✅ **Reading 2 — the quiz.** Question card, one retry with a hint when
  the teacher has enabled it, scoring
- ✅ **Reading 3 — the writing.** Textarea, word count, the keyword
  grader from `GRADER`, confidence
- ✅ Segment navigation that scales past twelve — the storyboard, not
  dots
- ✅ Line-level transport: back a line, forward a line, replay the
  segment

**Done when** a student can complete all three readings end to end and
the payload matches what the gradebook expects, asserted against the
`parseSubmission` contract that already exists. — met.

The decision that shaped it: the three readings are **one track**, not
three screens. Read a segment, answer what it asked, read the next. The
position in the URL still means one thing — stop number — whichever
reading is open, so Back, reload and a shared link all keep working with
nothing else to keep. `trackFor(book, pass)` is the whole of it.

Two behaviours were changed from the legacy reader on purpose, and both
are named in tests:

- **An answer is final, and it explains itself.** Legacy auto-advanced
  past the explanation the book had written for each question. Now
  answering shows it and Next is the student's to press — which is what
  every quiz they have used already does. Final, because reading the
  explanation and then going back to change the answer would be a way
  through the quiz.
- **Nothing says which option is right until the answer is given** — the
  hint included. A student who can read the answer off the page has not
  been taught anything.

---

### Phase 4 — The people ✅ 0.5.0

Wren and Professor Ambrose are most of the product's character, and the
place the legacy app has been buggiest: talking over each other, a close
button that would not close, greetings repeating.

- ✅ A speech component with one queue and one owner
- ✅ Audio through the same media-clock path the subtitles use
- ✅ Dismissable, and it stays dismissed

**Done when** two characters cannot speak at once — asserted, not
observed — and closing one keeps it closed. — met.

Two mechanisms, because there are two problems wearing one name:

- **In the reading, speech is a stop on the track.** Wren reacts where
  the book says she does; the two of them talk when a part is over. The
  reader is on exactly one stop, so there is one speaker and one
  recording — a guarantee of the data model, not a rule anyone has to
  remember at a call site. This is what "cannot speak at once" now means,
  and there is a test that walks the reading counting playing `<audio>`
  elements.
- **At the door, a queue with one owner.** A caller _claims_ it by key; a
  claim replaces rather than interleaves, and `speaking()` returns at most
  one turn. Closing is remembered by key, so is hearing something through
  to the end, and the keys are written down — "stays dismissed" survives
  the tab being shut, which is the only version of that promise a student
  would recognise. She can still be asked again, without clearing storage.

Found on the way, and worth more than the feature: **the reading was
showing O. Henry without his punctuation.** The subtitle rendered the
words parsed from the cue file, and a cue file is a transcript with no
commas in it — so the moment a recording loaded, every comma the author
wrote vanished from a reading app. The words now come from the book
always, and the cues only decide which one is lit. They do not line up
one to one: 35 of the 323 recordings disagree about the word count, so
there is an alignment, and it is tested against every line in the book.

---

### Phase 4.5 — The reader's own language

Everything here is data the package already carries and nothing renders.
That is the same shape of defect as the four dead settings in 0.5.1, and
it is worth clearing before the class side because it is what the
audience for this book actually needs.

- Tap a word for what it means — 64 glossed words, listed and inline
- The same word in the reader's language — 64 entries, ten languages
- The interface in the reader's language — 129 phrases
- What Wren and the Professor say, in the reader's language

**Done when** a student who reads no English can find their way around
the app, and can look up any word the book chose to gloss.

---

### Phase 5 — Class and teacher

The logic is already written and tested in `src/lib/gradebook/`. What is
missing is the shell.

- ✅ Student sign-in, class link
- ✅ Teacher panel behind the class-key model
- ✅ The outbox
- ✅ The Apps Script backend, served from the app itself
- Gradebook and the grading workbook
- QR for the class link
- Roster check at sign-in (`ROSTER`, `SIGNIN.lookup` in the prototype)

**Done when** a teacher can set up a class, a student can hand work in,
and the workbook opens with the marks feeding the grade table — the
walkthrough done by hand earlier, now automated.

Two things are better than the prototype and are worth keeping when the
rest lands:

- **The class key is transcribable.** Crockford base32 rather than
  base64url: case does not matter, no I/L/O/U, and an `l` reads as a `1`.
  The whole promise is "write it down, type it in on the other machine",
  and base64url failed that silently.
- **The link the class gets is not the key.** A join code points a device
  at a Sheet and carries no identity at all. In the prototype the link a
  teacher writes on the board was also the thing that makes you the
  teacher — anyone who kept it could open the gradebook.

---

### Phase 6 — The guide

Learning guide and teacher's guide are the same document. Printable, and
exportable for compliance.

**Done when** it prints cleanly and its table of contents jumps.

---

### Phase 7 — Parity and cutover

- A test that fails if any feature in the legacy inventory is unported
- Compare a full student run in both, payload against payload
- Cut over when the rebuild wins on merit; keep legacy tagged and
  releasable until then

---

## Rules for the work

1. **Legacy is reference, not a product.** Never edited, never
   reformatted, never shipped from. The tests that guard its shape stay,
   because a reference that drifts is worth nothing.
2. **Tests come with the feature**, in the same commit.
3. **Pure logic in `src/lib`, presentation in `src/ui`.** Anything that
   can be tested without a browser is.
4. **Every phase ends releasable** — tagged, uploadable, green.
5. **Standards before invention.** `<dialog>`, `<progress>`, WebVTT, the
   History API. The two worst defects this project has produced were both
   hand-rolled versions of something the platform already had.
