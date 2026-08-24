# Changelog

Versions are what releases are named by. Before this file existed there
were 64 hand-named archives in a Downloads folder — `magi-itch-improved
(17)` through `(21)`, `-fixed` through `-fixed8`, `-guide2`,
`-guide2-clean`, `-nocaptions`, `-scrub`, `-gate`, `-legible` — and no
way to tell which was newest, what any of them contained, or which one
was live on itch.

Releases are built with `npm run release`, which refuses to produce a zip
itch would reject and names the artifact from the version here.

## 0.7.0

A class can be run on this. A teacher sets one up, hands out a link, and
students' work arrives in their Sheet.

Everything rests on one idea, carried over from the prototype: **the
teacher is whoever set the class up**, because nobody else was there. So
there is nothing to log in to and no password to lose. Setting a class up
mints a key on that device, and that key — written down once — is what
makes any other device the teacher's too.

Two things are better than the prototype, both found by testing what a
person actually does rather than what the code does:

- **The class key is transcribable.** It was base64url, which is
  case-sensitive, and the whole promise of a key is "write it down, type
  it in on the other machine". A teacher who wrote `RAVEN-aB3x` and typed
  `raven-ab3x` was told it is not a class key, with no hint why — a
  silent failure on the one path the key exists for. Crockford base32
  now: no I, L, O or U, case does not matter, and an `l` reads as a `1`.
  It is also a third shorter, 217 characters down to 169.
- **The link the class gets is not the key.** A join code points a device
  at a Sheet and carries no identity at all. In the prototype students
  were handed the class key, so the link written on the board was also
  the thing that makes you the teacher: anyone who kept it could open the
  gradebook on their own machine. Losing a join code now costs a class
  the privacy of where their work is sent; it cannot cost them the
  gradebook.

**Handing in**, with three promises that came out of a classroom rather
than out of the code, each of them a test:

- **A student sees it being sent** — a bar and the word "Sending",
  because that is what they will understand and wait for. The bar moves
  on real steps, not on a timer pretending to be progress.
- **A student is never told it failed.** They cannot do anything about
  it, will not understand it, and the likely response is to hand in again
  and again. The work goes in the outbox before anything is sent, and the
  retry is ours, quietly. A test drops the network and reads the whole
  screen looking for _fail, error, could not, try again, offline,
  problem_.
- **A student is never told it went somewhere it did not.** No class on
  the device means the work stays there, and it says so, rather than
  showing a Hand in button that does nothing.

Smaller, and all of it load-bearing:

- Four fields cleaned at the door, because it is much cheaper than
  cleaning thirty rows of gradebook afterwards. `07` stays `07` — a
  spreadsheet that drops the zero has renamed a child. Invisible
  characters go. `asdf` is refused; 김민수, สมชาย and Николай are not. Every
  problem points at its own box.
- The outbox is keyed by student, reading and book, so pressing the
  button twice replaces rather than making a teacher reconcile two rows.
  It sends one at a time, because thirty tablets on one access point is
  what made the network bad in the first place.
- `text/plain` on the wire, on purpose: a JSON content type makes the
  browser send a CORS preflight, Apps Script does not answer one, and the
  request fails before it is made on every device every time.
- Resetting a device destroys the class on it — key, Sheet link and
  waiting work together — and needs the word DELETE typed. Somebody who
  resets their way in arrives in an empty room, which is the point.

Two things the tests taught about the tests: `fill()` does not reach
React's change tracking in Firefox, which has now cost a spec twice, so
the typing helper lives in the shared fixture; and Firefox over BiDi does
not expose a request body at all, so the payload assertions read the
outbox instead — the same bytes, before the wire, and now checked in four
engines rather than two.

384 unit + 569 e2e across four engines, 27 skipped by device.

## 0.6.0

**The React build is now the product.** The single-file HTML app is
reference — the place to look up how something was meant to behave, and
the source the book was extracted from. It is still never edited and
never reformatted, and the tests that guard its shape stay, because a
reference that drifts is worth nothing.

This release is the rest of what the book already carried and nothing
rendered — the same shape of defect as the four dead settings in 0.5.1,
and the part the audience for this book actually needs.

- **Tap a word for what it means.** 69 words the book explains, written
  two ways — a list on the unit, and `{word|meaning}` inline in the
  stanzas — and a reader does not care which. A dotted underline, not
  something that looks like a control: forty buttons in a sentence would
  read as a form.
- **And in your own language.** 64 of the 69 have translations. The five
  that do not — beggar, pier glass, longitudinal, pluck, hashed — show
  their English meaning and drop the second line. Named in a test so five
  does not quietly become thirty.
- **What Wren and the Professor say, translated.** 413 lines, extracted
  from the prototype this release. Every spoken line in the book, in all
  four languages.
- **The interface in the reader's language.** 129 phrases, under the
  English rather than instead of it — the words on the buttons are words
  this student is learning, and a teacher saying "press Vocabulary" out
  loud has to keep working. An untranslated phrase reads as English,
  never as a blank.

The pop-up is the platform's `popover`: top layer, light dismiss and
Escape, none of it written here. Two defects came out of using it, both
caught by tests written the same hour:

- **A closed popover was covering the page and eating taps.** Declaring
  `display: grid` on the box overrode the browser's own rule that hides a
  closed one, so sixty-four invisible boxes sat over everything. On the
  iPad profile the transport could not be pressed at all. Invisible and
  clickable is the worst thing a stylesheet can produce, and it took a
  device profile to find it.
- **The arrow keys drove the reading behind an open pop-up** — the third
  version of this defect this project has produced, after the legacy
  guide and the `<dialog>` one. A popover is not a dialog and does not
  make the page behind it inert. Asked of the DOM again rather than
  tracked.

Also: the pace list lived in two places, the panel and the schema, and
could drift — a stored pace the schema rejects becomes Normal while the
button stays lit. One list now. And the door labels came out as
"Vocabulary어휘" on one line, because a flex row makes `display: block` on
a child mean nothing.

307 unit + 449 e2e across four engines, 27 skipped by device.

## 0.5.1

An audit of what a reader actually hits, rather than of what the tests
already cover. No console errors and nothing 404s — and seven controls
that did nothing at all.

Four were settings that saved, persisted, and reached exactly nothing. A
control that stays ticked across a reload and changes nothing is worse
than one that is missing, because there is no way for a student to tell.

- **Language.** The book carries four complete translations — every line
  of every unit in Korean, Japanese, Thai and Spanish — and the panel
  promises them. Nothing rendered a word of it. For the classes this is
  built for, that was the feature.
- **Sound on** never set `muted`. **Pace** never set `playbackRate`.
  **Reading ruler** applied a class no rule in the stylesheet matched.

And three more:

- **A reading did not end, it ran out.** Twenty-eight questions answered,
  then a greyed-out Next and nothing else. The ending is now a stop of
  its own, which also stops the finish card being stacked underneath a
  question that has not been answered yet. It says plainly that handing
  the work in is not built, rather than implying the work went somewhere.
- **The gate's "Carry on" panel** was written, styled, and had never
  appeared once, because nothing recorded a position and nothing passed
  one in.
- **The vocabulary trainer was a room with no door.**

Plus: the background pages are asked about and showed a black rectangle
where the picture should be.

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
