# Portfolio release checklist

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
