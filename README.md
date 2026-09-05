# Magi Reader

Magi Reader's current direction is a polished solo literary reading experience: illustrated stories and poems, narration with synchronized text, tappable vocabulary, multilingual support, and a personal vocabulary trainer.

The story should remain uninterrupted. Wren and Grandpa Ambrose frame the book before and after; optional literary/context discussion belongs in a separate Explore experience.

## Current direction and implementation status

**As of 5 September 2026, the solo redesign is in [draft PR #7](https://github.com/dancockrell/magi-reader-engine/pull/7), on `solo-reader-redesign`.** The default branch still contains the earlier classroom implementation. A checkout of `main` therefore does not yet give you the finished solo product. Consult the PR's current status and checks before assuming that transition has landed.

New product work follows the solo direction. Class/teacher UI, sign-in and rosters, quiz/writing passes, hand-in/outbox flows, gradebooks, marking exports, and Apps Script are outside that direction. Do not restore them to satisfy old prototype-parity expectations.

The existing tests and old classroom code remain evidence for that implementation until the reviewed redesign replaces them. This documentation change does not merge the redesign or certify its full application suite.

## Run the checked-out version

```bash
npm install
npm run dev
npm test
npm run build
```

Read `package.json` on your branch for the actual checks and release scripts. Avoid copying historical test totals into acceptance claims: missing book media and branch-specific tests can change what a run covers.

## Architecture and content

The engine separates reusable reading behavior from book-specific text and media. The solo branch's README describes its bookshelf, safe Git-hosted data packs, uninterrupted story track, vocabulary, and storyboard tooling.

On `main`, `src/lib/` still includes classroom and gradebook modules; `src/backend/` and `legacy/` retain the older implementation. These are not requirements for the solo architecture.

- [Book format](docs/BOOK-FORMAT.md) documents the contract on this branch. Use the solo branch's version when authoring for the redesign; its validator is the corresponding executable contract.
- [Historical teaching design](docs/PEDAGOGY.md) preserves learning-design rationale and the earlier classroom decisions. It is not the current feature roadmap.
- [Classroom toolkit](https://github.com/dancockrell/magi-reader-classroom-toolkit) preserves the original standalone classroom machinery.
- [The Gift of the Magi](https://github.com/dancockrell/the-gift-of-the-magi-o-henry-magi-reader) and [The Raven](https://github.com/dancockrell/the-raven-edgar-allan-poe-magi-reader) preserve book content, media, and earlier packaging work. Check each pack's actual published assets before promising complete narration or art.

## History and documentation authority

The frozen single-file prototype remains valuable regression and development history. It is no longer the product specification. The earlier README and classroom screenshots are preserved in Git; new documentation should explain the current reader rather than promote the retired assessment workflow.

## Licence

MIT. The stories are public domain. Illustrations and recordings travel with the book pack; inspect their provenance and distribution records separately.
