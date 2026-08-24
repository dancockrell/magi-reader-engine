# Magi Reader

The Gift of the Magi — a narrated reader with word-level text highlighting.
Opens in a browser. No install, no account, no build step.

## What's here

```
index.html      the reader
art/            illustrations (webp)
magi-audio/     narration clips and timing data
```

## About the history

This repository's commits are a reconstruction. The project was originally
kept as eight dated folders — `magi-itch-folder`, `magi-itch-improved (3)`,
`(8)`, `(17)`, `(20)`, `magi-itch-ui`, `magi-itch-guide2-clean` — snapshots
taken across a single working session on 22–23 August 2026.

They have been committed here in chronological order, so the session reads
as history you can diff instead of folders you have to compare by hand. The
sizes tell the story on their own:

| Commit | `index.html` | What changed |
|---|---|---|
| 09:45 | 2.9 MB | initial single-file build |
| 12:17 | 15.0 MB | audio and art inlined |
| 16:59 | 21.4 MB | peak inline build |
| 20:29 | 1.5 MB | assets extracted back out to `art/` |
| 10:24 | 1.7 MB | current |

`git checkout` any of them to get that state back.

## Timing data

`magi-audio/timings.js` holds word-level timings as `{t: ms, w: word}` per
clip — 519 clips, 7,954 words. This is a bespoke format for something the
web platform already standardises: WebVTT expresses the same thing with
inline karaoke timestamps, and browsers time it natively through the
TextTrack API rather than a requestAnimationFrame loop.

Migration is open work.
