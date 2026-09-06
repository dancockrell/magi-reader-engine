# Portfolio release checklist

## Current published delivery

The application source targets **v0.9.6-portfolio**. The release was rechecked on
6 September 2026 and is public, not a draft or prerelease. See
[the v0.9.6 notes](RELEASE-0.9.6.md) for the latest published title treatment.
Its complete movie runs approximately 14:51. The local
[award candidate](AWARD-CANDIDATE.md) is separate work and has not replaced it.

The checks below describe older releases at their recorded dates; their hashes,
durations and CI runs are not evidence for the newer candidate.

## 0.9.1 correction — historical

The source at this checkpoint targeted `v0.9.1-portfolio`. See [the shot-level polish report](FILM-POLISH.md) for the four replacements, rejected takes and review limits.

- Local unit tests: 344 passed; lint, typecheck and production build passed.
- Complete corrected movie decoded without errors: H.264, 1920×1080, native 24 fps, 21,165 frames, 881.906 seconds.
- AAC soundtrack packet hash matches 0.9.0 exactly: narration and score are unchanged.
- Corrected MP4 size: 674,042,678 bytes.
- Corrected MP4 SHA-256: `8a5de5a4d2ec012a768f1b2fa7186a63429206f3b1d940f70a5b6a1abb6b31dd`.
- Browser smoke review is muted and now includes 494, 540 and 638 seconds as well as the earlier checkpoints.
- Publication is versioned rather than overwriting the original release's movie.

Published verification on 6 September 2026:

- [Release 0.9.1](https://github.com/dancockrell/magi-reader-engine/releases/tag/v0.9.1-portfolio) is public, not a draft or prerelease; all three assets are uploaded. GitHub's MP4 digest matches the reviewed local file above.
- Source release commit: `b0aa5d5820153f42e91bc3f8a0c6cf2916508cc7`; [CI passed](https://github.com/dancockrell/magi-reader-engine/actions/runs/34006241783).
- Pages delivery commit: `4279f1534cfb021aa6355692f2958d528606f3fb`; [deployment passed](https://github.com/dancockrell/magi-reader-engine/actions/runs/34006327046).
- The same muted browser check passed against both the local production preview and the public Pages site: desktop, 390px bookshelf, text route, remote movie playback, seeks at 480/494/540/610/631/638/880 seconds, and zero page errors.
- Release archive: 36,335,184 bytes. Previous release remains available for recovery.

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
