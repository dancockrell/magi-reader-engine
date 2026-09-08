# Isolated v8 application build

Built into production/app-review-v8 with relative v8 movie and checkpoint caption
paths. The curated-media build hook now honors Vite's configured output directory
instead of always writing assets to dist. This keeps the active v6 dist intact.

Local app: http://127.0.0.1:8770/production/app-review-v8/index.html
Local film: http://127.0.0.1:8770/production/app-review-v8/film.html

Movie is hard-linked from immutable public v8 rather than copied again. Captions
are beside it. Both app and film bundle import the same delivery module for
playback, download and caption targets. Build succeeded; HTTP movie206 and VTT200.

Browser check: bookshelf loaded; Watch opened reader; media readyState4,
currentSrc resolved to app-review-v8/video/films/magi-human-cut-v8.mp4,
captions showing, playback advanced to38.369s. Temporary tab closed after check.
Watch starts playback automatically; future review must mute immediately before
allowing it to continue. No audible quality evaluation was made.

No publication. Existing v6 dist and its preview server remain unchanged.
Full v8 decode was already successful; artistic and sound acceptance remain open.
