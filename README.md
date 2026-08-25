# Magi Reader

**An illustrated reading engine for language classrooms.** A public-domain
story becomes a narrated, illustrated reading that a class works through
three times — once to watch, once to be questioned, once to write — and
the work lands in the teacher's spreadsheet already half marked.

The first book is _The Gift of the Magi_ (O. Henry, 1905), which is where
the name comes from. The engine is separate from the book: a second title
is a new folder, not new code — the second is _The Raven_.

![The reading, with Korean under the English and a glossed word marked](docs/reading.png)

---

## What it does

**For a student**

- The story read aloud, one line at a time, with the word being spoken
  lit as it is said — driven by the media clock and a WebVTT file, not a
  timer.
- Any hard word is tappable, in English and in their own language.
- The whole app — story, characters, interface — in Korean, Japanese,
  Thai or Spanish, underneath the English rather than instead of it.
- Three readings: watch, answer, write. Their place is remembered, their
  answers survive a reload, and handing in is one button.

**For a teacher**

- Set up a class on any device. There is nothing to log in to.
- Work arrives in a Google Sheet, or — with no Google in the room — in
  files that produce a marking workbook.
- That workbook groups every written answer **by question rather than by
  student**, because marking thirty answers to one question needs one
  standard in your head, not thirty.

|                                                                             |                                                                                  |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| ![A word tapped, with its meaning in English and Korean](docs/glossary.png) | ![Wren and Professor Ambrose discussing the part just read](docs/characters.png) |
| A glossed word, in two languages                                            | Two characters, one at a time                                                    |
| ![A quiz question, answered, with the explanation shown](docs/quiz.png)     | ![The teacher's panel: class key, Sheet link, collected work](docs/teacher.png)  |
| An answer is final, and explains itself                                     | The teacher's side, end to end                                                   |

---

## Running it

```bash
npm install
npm run dev            # the reader
npm test               # 480 unit tests
npm run e2e            # 635 end-to-end, four browser engines
npm run release        # verify everything, then build an uploadable zip
```

`npm run release` refuses to produce a build that the target host would
reject — it has caught a zip with too many files in it before.

---

## How it is put together

```
src/lib/            pure. No DOM, no React, no timers.
  book/             the pack contract, and translation lookup
  reader/           the track: readings, beats, questions, grading
  speech/           who says what, and when
  class/            identity, the class key, the outbox, sending
  gradebook/        submissions to rows to CSV to a real .xlsx
  media/            WebVTT, and lining a transcript up with the text
src/ui/             React. Presentation only.
src/books/<id>/     a book pack: extracted data plus where its media sits
src/backend/        the Apps Script a teacher pastes into their Sheet
legacy/             the single-file prototype this was drawn from
tools/              extract the book, check it, cut a release
```

**`src/lib` is pure**, and that is load-bearing rather than tidy: it is
what lets a 2,685-question sweep run in under a second, and what lets a
whole student attempt be played through in a test without rendering
anything.

**One engine, many books.** `src/engine.test.js` walks every source file
outside `src/books/` and fails if one names a book or hard-codes where a
book keeps its audio. The rule only survives if something checks it.

**Standards before invention.** `<dialog>` for modals, `popover` for the
glossary, `<progress>` for progress, WebVTT for word timing, the History
API for navigation. The three worst defects this project has produced
were all hand-rolled versions of something the platform already had.

---

## The rule the rebuild was built on

**The single-file prototype is the specification.** It works, it was
attacked at length, and the fixes in it were paid for. So it is not
something to preserve — it is a target to pass and then beat.

It is still here, twice over. `legacy/index.html` is its final state,
1.68 MB of hand-written HTML, never edited and guarded by a test that
fails if its shape changes. And the
[`prototype`](../../tree/prototype) branch carries how it got there —
ten build snapshots, from the first 2.9 MB itch upload through the
21 MB fully-inlined build to the day the assets were pulled back out.
The last commit on that branch and `legacy/index.html` on `main` are the
same file, byte for byte.

Every defect found by attacking the original is an executable test here,
written before the equivalent was rebuilt:

| test              | what it stops coming back                                                        |
| ----------------- | -------------------------------------------------------------------------------- |
| formula injection | `=HYPERLINK(...)` in a student's answer running when the teacher opens the sheet |
| leading zeros     | student `01` and `1` becoming the same person in Excel                           |
| date coercion     | a score of `9 / 10` being read as 9 October                                      |
| written totals    | perfect written work scoring 67%, because the questions were counted twice       |
| resubmission      | a grade replaced with nothing to say a better one existed                        |
| substitution      | `craved`/`coveted` appearing as each other's wrong answer                        |
| endpoint shape    | a doctored class key pointing a whole class's writing at a stranger's script     |
| modal keyboard    | the arrow keys driving the reading behind an open panel                          |

That last one has come back twice in new clothes — once as a `<dialog>`,
once as a `popover` — and both times the test caught it the same hour.

---

## Things worth knowing

- **Four engines, every run.** Chromium, WebKit on an iPad profile,
  Chromium on a phone profile, and a real Firefox over WebDriver BiDi.
  Several defects were visible in exactly one of them: an invisible
  popover eating taps, only on the iPad.
- **The class key.** A teacher is whoever set the class up — nobody else
  was there. The key is Crockford base32, so it survives being written on
  paper and retyped in the wrong case. The link students get carries no
  identity and cannot open the gradebook.
- **A student is never told a hand-in failed.** They can do nothing about
  it and will hand in again. The work is written down before it is sent
  and the retry is silent.

## Licence

MIT. The story is public domain. The illustrations and recordings are
generated assets that travel with the book pack.
