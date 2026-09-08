# Human-centered physical edit — 8 September 2026

This is an actual full-length rendered checkpoint, not a completed final film.
The whole-film goal remains active. It supersedes the old plan's repeated comb
macros and chain-focused coverage in the specific override intervals.

## Built

- 1920 × 1080, native 24 fps, 21,387 picture frames, 891.125 picture seconds.
- Output SHA256: `b8280394dc4da5fa167e5f57b2cd7e05657a84640a6917e16759b614eef2769f`.
- Output size: 608,258,542 bytes.
- Music/narration AAC packet hash matches v6 exactly:
  `20b3b086e420e399d210179c2fb5a1687439b89ac63d03326bda53b640a967bf`.
- Caption file matches v6; narration start remains 9.25 seconds.
- Local delivery: `http://127.0.0.1:8771/film.html` and the app on port 8771.
- Local served file: `public/video/films/magi-human-cut-v2.mp4`.
- Production master: sibling production checkout's
  `production/human-cut/magi-human-cut-checkpoint.mp4`.

## Changes baked, not merely nominated

The checked opening/home/mirror/departure/purchase/parcel/ending selections are
assembled into the movie. One three-second comb reveal replaces long product
coverage; the next passage uses Della's emotional response and Jim's faces.
The chain passage avoids the watch pendant and cuts to her expectant face.
Post-revelation table shots are reframed to the couple, excluding the sold watch.
Title and moving book blend into Della before narration. Closing window framing
excludes the incompatible distant couple. New literary credits use story stills,
including cropped human performances rather than the incompatible old combs;
the last card fades to black. Still images are deliberate end-credit design,
not held frames inserted to extend story action.

## Checks and limits

- Full video/audio decode completed without errors.
- Browser loaded the exact v2 source at 1080p, readyState 4, and advanced through
  the opening with captions; review was muted. This is not a complete sound screening.
- 65 existing Python tests, 3 focused player/delivery tests and production build pass.
- Download and player use the same local override; public release defaults unchanged.
- Serial rendering uses two encoder threads and one filter thread, and reuses
  completed segments. No generation or credit spending in this pass.
- The old whole-film plan remains a source-selection input, NOT a final approval.
  Its unselected sections remain identified as baseline-unfinished in the render
  manifest. Full contextual screening, remaining middle-film corrections, affectionate
  delivery of the narrator's "boy", and final publication are not complete.
- Some newly salvaged face crops retain minor costume differences. They are
  candidate editorial choices, not a declaration that all continuity is perfect.
- Alternate Della/Jim face coverage can draw different visible subjects from the
  same underlying take. No clip is looped, frozen, reversed or speed-fitted.

## Rebuild

Run `scripts/build_human_intro.py` and `scripts/build_human_credits.py` with the
production root, then `scripts/render_human_cut.py` using
`WHOLE-FILM-CANDIDATE-PLAN.json` and `HUMAN-CUT-OVERRIDES.json`.
Keep replacement media versioned: cached segment keys currently include the edit
recipe, not source bytes. Changing a source in place requires a new source path
or explicit cache invalidation. Never overwrite a movie currently being watched.

GitHub release and Pages are unchanged. This checkpoint is local only.
