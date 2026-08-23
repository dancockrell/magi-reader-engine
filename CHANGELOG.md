# Changelog

Versions are what releases are named by. Before this file existed there
were 64 hand-named archives in a Downloads folder — `magi-itch-improved
(17)` through `(21)`, `-fixed` through `-fixed8`, `-guide2`,
`-guide2-clean`, `-nocaptions`, `-scrub`, `-gate`, `-legible` — and no
way to tell which was newest, what any of them contained, or which one
was live on itch.

Releases are built with `npm run release`, which refuses to produce a zip
itch would reject and names the artifact from the version here.

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
