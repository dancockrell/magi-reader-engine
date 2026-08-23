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

**Extract the book, harden the legacy app, let the rebuild catch up
behind a test suite that covers both.**

The multi-book goal does not require a rewrite. It requires the book to
stop being welded into a 14,000-line HTML file. Once the content lives in
a validated package, _both_ apps can read it, legacy keeps shipping while
the rebuild grows, and the tests are written once against the data rather
than twice against two UIs.

Cut over when the rebuild is better, feature by feature — never in one
jump.

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

### Phase 4 — The people

Wren and Professor Ambrose are most of the product's character, and the
place the legacy app has been buggiest: talking over each other, a close
button that would not close, greetings repeating.

- A speech component with one queue and one owner
- Audio through the same media-clock path the subtitles use
- Dismissable, and it stays dismissed

**Done when** two characters cannot speak at once — asserted, not
observed — and closing one keeps it closed.

---

### Phase 5 — Class and teacher

The logic is already written and tested in `src/lib/gradebook/`. What is
missing is the shell.

- Student sign-in, class link, QR
- Teacher panel behind the class-key model
- Gradebook, the grading workbook, the outbox
- The Apps Script backend, served from the book package

**Done when** a teacher can set up a class, a student can hand work in,
and the workbook opens with the marks feeding the grade table — the
walkthrough done by hand earlier, now automated.

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

1. **Legacy keeps shipping.** It is not touched except to fix real
   defects, and never reformatted.
2. **Tests come with the feature**, in the same commit.
3. **Pure logic in `src/lib`, presentation in `src/ui`.** Anything that
   can be tested without a browser is.
4. **Every phase ends releasable** — tagged, uploadable, green.
5. **Standards before invention.** `<dialog>`, `<progress>`, WebVTT, the
   History API. The two worst defects this project has produced were both
   hand-rolled versions of something the platform already had.
