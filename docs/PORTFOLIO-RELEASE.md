# Portfolio release checklist

## 0.9.1 correction

The current source targets `v0.9.1-portfolio`. See [the shot-level polish report](FILM-POLISH.md) for the four replacements, rejected takes and review limits.

- Local unit tests: 344 passed; lint, typecheck and production build passed.
- Complete corrected movie decoded without errors: H.264, 1920×1080, native 24 fps, 21,165 frames, 881.906 seconds.
- AAC soundtrack packet hash matches 0.9.0 exactly: narration and score are unchanged.
- Corrected MP4 size: 674,042,678 bytes.
- Corrected MP4 SHA-256: `8a5de5a4d2ec012a768f1b2fa7186a63429206f3b1d940f70a5b6a1abb6b31dd`.
- Browser smoke review is muted and now includes 494, 540 and 638 seconds as well as the earlier checkpoints.
- Publication is versioned rather than overwriting the original release's movie.

## 0.9.0 historical release checks

- [x] Complete waiting-scene export: entrance at scene time 38.500s, narration at 38.592s.
- [x] Review replacement source motion and exported waiting/conversation/embrace joins.
- [x] Verify 1920x1080, 24 fps, 21,165 frames, soundtrack, and neutral black at 881.4s.
- [x] Pass 344 app unit tests, lint, typecheck and production build; GitHub CI green.
- [x] Check desktop and 390px bookshelf, film and text routes.
- [x] Check released movie playback and seeks at 480/610/631/880 seconds; no browser page errors.
- [x] Verify GitHub Pages app and cinema URLs with the same browser smoke test.
- [x] Upload MP4, captions and web-app archive; verify release assets and streamed movie.

Validated on 6 September 2026. Source redesign merged through PR #7.

The app package is approximately 40 MB uncompressed and 36 MB zipped; the full-quality movie is approximately 677 MB and streams separately. The package does not include raw generations or intermediate films.

The installable browser app is not a Windows executable. The movie is not automatically cached offline; the MP4 download is the offline viewing route.

Editorial review in this release concentrated on the user-flagged passages. A fresh, uninterrupted human viewing remains the final artistic sign-off; automated tests and sampled visual review do not replace it.

This checklist is intentionally not an assertion that an automated audit makes a film perfect.
