# Full-length v6 and local app preview

8 September 2026. Local candidate, not final, not published.

- Movie SHA256: `5cfef5049f6d91fc75e801d682132d5f84466678f6d0314e6ec0ce54bca87af4`.
- Movie: `public/video/films/magi-human-cut-v6.mp4`, 609094176 bytes.
- Includes sustained mirror reaction replacing two v5 inserts; the remainder
  follows v5. Source reprise is explicit in MIRROR-RELEASE-RECUT.md.
- Local app: `http://127.0.0.1:8772/`.
- Local standalone film: `http://127.0.0.1:8772/film.html`.
- Production build passed with relative VITE_FILM_URL and VITE_FILM_CAPTIONS
  selecting v6 and the unchanged checkpoint captions. Both entry points share
  the generated delivery module.
- Movie hard-linked into dist/video/films to avoid another 609MB allocation;
  captions copied beside it. Do not mutate this immutable movie in place.
- Vite preview serves movie byte ranges (HTTP206, video/mp4) and captions
  (HTTP200, text/vtt) from the same origin. No cross-origin caption dependency.
- 33 test files, 346 tests passed. JSDOM reports unimplemented media play/pause;
  these tests do not certify native video playback.
- The separate browser review tab opened, but no usable playback controls were
  obtained. Full-speed visual and audible screening are NOT verified by this.

Existing user playback was not navigated or switched. Earlier 8770/8771 review
servers remain distinct. GitHub and the published release are unchanged.
The previous v5 full decode succeeded; do not mislabel it as a v6 decode.
Artistic acceptance, remaining hair/continuity polish and final publication remain.
