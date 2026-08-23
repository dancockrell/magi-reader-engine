# Changelog

Versions are what releases are named by. Before this file existed there
were 64 hand-named archives in a Downloads folder — `magi-itch-improved
(17)` through `(21)`, `-fixed` through `-fixed8`, `-guide2`,
`-guide2-clean`, `-nocaptions`, `-scrub`, `-gate`, `-legible` — and no
way to tell which was newest, what any of them contained, or which one
was live on itch.

Releases are built with `npm run release`, which refuses to produce a zip
itch would reject and names the artifact from the version here.

## 0.5.0

Wren and Professor Ambrose. They are most of what makes this a reading
rather than a worksheet, and the book already carried every word they say
— 58 turns of conversation, 15 reactions, a six-part introduction, all of
it recorded, none of it reachable.

**The reading was showing O. Henry without his punctuation.** This is the
part of the release that matters most and it was found by accident. The
subtitle rendered the words parsed from the cue file, and a cue file is a
transcript: it has no commas in it. So the moment a recording loaded,
"Okay. This is The Gift of the Magi. Nineteen-oh-five, New York City, the
day before Christmas." became "Okay This is The Gift of the Magi
Nineteen-oh-five New York City the day before Christmas" — in a reading
app, as the thing a child is asked to read. The words now come from the
book, always, and the cues only decide which one is lit. They do not line
up one to one — an em-dash splits a spoken word in two, "$8" and "87
cents" tokenise differently, 35 of the 323 recordings disagree about the
count — so there is an alignment, tested against every line in the book.

- **Two characters cannot speak at once**, because speech in the reading
  is a stop on the track. One position means one speaker and one
  recording. A test walks the reading and counts playing `<audio>`
  elements; the guarantee is the data model's, not a rule at a call site.
- **One queue, one owner** for the greeting at the door. A caller claims
  it by key; a claim replaces rather than interleaves. The shipping
  reader's `TALKUI.show(who, text)` had no queue at all — whoever called
  last won, which is every one of these bugs at once.
- **Dismissed stays dismissed**, through a reload and through leaving the
  gate and coming back. Sitting through it counts as having heard it.
  Kept per book, with nothing in it that identifies a student, because the
  device is shared — and she can be asked again without clearing storage.
- Speech uses the same WebVTT file and the same media clock the narration
  does. No second timing mechanism.
- The cast travels with the book now, portraits included, so a pack can
  ship a different cast without the engine changing.
- The author page and the note on the story's afterlife had conversations
  hanging off units that are not read segments. The first draft of the
  track dropped all ten turns on the floor; they are placed and tested.
  Those two also stop showing up in the storyboard as "ohenry" and
  "impact", which was an internal id showing through to a child.

Also: eleven correct tests went red for the wrong reason when the reading
grew from 244 stops to 317, because they had "1 of 244" written into
them. The position now comes from the book itself in a shared fixture —
those tests are about Next advancing by one, not about the number.

268 unit + 321 e2e across four engines, 23 skipped by device.

## 0.4.0

Readings 2 and 3. A student can now go through the whole book — read it,
be asked about it, write about it — and what comes out the far end is the
payload the gradebook already knows how to mark.

The three readings are **one track**, not three screens: read a segment,
answer what it asked, read the next. The position in the URL still means
one thing, stop number, whichever reading is open, so Back, reload and a
shared link keep working with nothing else to keep.

- **Reading 2 — the quiz.** A hint and one more try when the teacher has
  enabled it. Nothing on screen says which option is right until the
  answer is given, the hint included. Once it is given the question is
  closed and the explanation the book wrote for it is shown — legacy
  auto-advanced straight past that, which was the part that taught.
- **Reading 3 — the writing.** Word count against a suggested length,
  and the ideas the answer has touched, highlighted in the student's own
  words. No score, ever: a person marks this. The highlighting is
  returned as text segments rather than markup, so a student's writing
  can never become HTML.
- **The storyboard** replaces the dots. Pictures and titles with how far
  through each one you are; it opens onto where you are rather than the
  top of the book. Dots worked at twelve segments and this reader is
  meant to hold more than one book.
- **An attempt survives a reload.** Tablets sleep and lessons end. The
  answers are kept per book and per reading, with nothing in them that
  identifies a student, because the device is shared. The questions are
  always taken from the book and never from the store, so a saved attempt
  cannot resurrect a question that has been edited out.
- The grader keeps the three behaviours that were easy to lose: an
  opinion question has no wrong answer, an answer in another language is
  reported as foreign rather than as weak, and every synonym present is
  reported rather than the first one found.

Four real defects, all caught by tests written with the feature:

- The reader was fifteen pixels taller than a 720-high laptop screen, so
  clicking Next **scrolled the page** — the marching picture again, by
  another route. Also put the header out of reach behind a modal.
- Centring `main` with `align-items` takes the top of the page off the
  screen when the content is taller than the window, with no way to
  scroll back to it. Auto margins do not.
- `.done` was already the finished-screen class. Reusing it for a read
  segment centred every read title in the storyboard and nothing else.
- Both segment buttons had the accessible name "Segment", because the
  chevrons that told them apart were `aria-hidden`.

226 unit + 261 e2e across four engines, 23 skipped by device.

## 0.3.0

The shell: hash routes for every screen, `<dialog>` overlays, settings
that persist and apply, and the gate. Navigation people already know,
which is the argument for the rebuild and never was styling — in the
legacy reader the Back button leaves the app and nothing has a URL.

Three defects the tests caught: the keyboard still drove the reading
behind an open modal (`<dialog>` makes the background inert for focus and
pointer, but a `window` listener receives every keystroke regardless);
the new header buttons were 40px against a 44px floor, on the most-tapped
thing in the app; and arrow-key tests were running on touch-only device
profiles that have no keyboard.

## 0.2.1

**The 0.2.0 legacy zip should not be used.** It was built from an
`index.html` that Prettier had reflowed from 14,447 lines to 37,706 —
every line of a working, hand-tuned single-file app rewritten, and
shipped before anyone noticed.

- `legacy/` is excluded from Prettier and ESLint. It is a preserved
  artifact, not source, and is restored byte-identical to the reader it
  came from.
- A test asserts its shape — line count, size, and that the modules and
  the pasteable backend are still in it — so a reformat fails the build
  instead of reaching a release.
- **The shipping reader now has automated tests at all**, which it never
  had: it boots on a nested path with no uncaught errors and no missing
  assets, the gate and the three readings are present, the Apps Script
  backend parses as JavaScript, and a student can open the reading.

## 0.2.0

The reading view, and the build that itch will actually accept.

**Reader.** 244 beats across 12 units — the whole book, each beat with
its picture, its recording and its cues. The frame is sized by CSS from
the viewport and knows nothing about the text, so it cannot drift as
lines advance. `object-fit: contain`, so no picture is cropped through a
face. The line appears exactly once, on the picture.

**Captions are WebVTT.** The private 177 KB timing table is gone. All
519 clips are identified cues in one standard file, fetched once —
openable in any captioning tool, and the format Whisper emits.

**Vocabulary.** Eight kinds of question chosen at random from those a
word can support, including substitution in the sentence the word
actually lives in. Every kind ends on that sentence.

**Tested for real.** 126 unit and 99 end-to-end across Chromium, WebKit
and Gecko, with axe-core auditing WCAG 2.1 A/AA. A build test serves
`dist/` from a nested path inside a cross-origin iframe, which is how
itch runs a game.

### Fixed

- **Too many files.** itch rejects a zip over 1000 entries; one `.vtt`
  per clip made 1266 and the upload failed. One cue file now: 748.
- **Absolute media paths.** `/art/…` resolves against the domain root,
  so every picture would have 404'd once uploaded while working
  perfectly on a dev server.
- **An empty subtitle** whenever the cue fetch was slow or failed — the
  words come from the book now, and the cues only decide which is lit.
- **`vestibule` and `janitor`** were each glossed two different ways in
  the book; the book contract found both.

## 0.1.0

Scaffold, with the single-file reader as the specification: its
behaviour captured as executable tests before anything was rebuilt.
