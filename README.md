# Magi Reader

Magi Reader is a warm, illustrated solo-reading experience for classic stories and poems.

The reader keeps the book uninterrupted: narration drives the timing, subtitles follow the spoken line, and difficult words are tappable without turning the story into a worksheet. Wren and Grandpa Ambrose welcome the reader before the book and return with final thoughts after the ending. Their deeper literary notes live in a separate Explore experience.

## What ships

- A bookshelf with _The Gift of the Magi_ bundled for offline reading.
- Git-hosted book packs, beginning with _The Raven_.
- Narration, subtitles, clickable vocabulary, and a personal vocabulary trainer.
- Per-line art, two-keyframe transitions, and optional finished silent visual clips.
- Separate introductions, afterwords, and Explore notes for interested middle-school readers.
- Storyboard production sheets and a timing-aware storyboard planning tool.

The bundled Gift pack is lazy-loaded when the reader opens it, so the bookshelf does not download the whole book up front. Remote packs are fetched as data and media; the app does not execute JavaScript from book repositories.

## Run it

```bash
npm install
npm run dev
npm test
npm run build
npm run verify
```

Create a storyboard skeleton from real book text and narration cues with `npm run storyboard:plan -- --help`.

## Architecture

```text
src/books/              bundled book packs
src/lib/book/           book validation and vocabulary lookup
src/lib/library/        bookshelf catalog and safe Git-pack loading
src/lib/reader/         uninterrupted story track and reading state
src/lib/media/          narration cues and visual timing
src/ui/                 bookshelf, reader, vocabulary, and Explore UI
docs/storyboards/       exact visual production sheets
tools/                  book checks, release, cues, and storyboard planning
```

`src/lib/library/catalog.js` is the deliberate content boundary: it knows which titles are on the shelf and where their packs live. The generic reader and UI do not hard-code book titles or book-specific media paths.

## Book plugins

A remote catalog entry points to a JSON book pack and a base media URL. The loader resolves narration, cues, cast art, plates, and storyboard media against that base, then adds the catalog's Wren/Ambrose framing and Explore notes.

The detailed pack contract is in `docs/BOOK-FORMAT.md`. New visual work should use the storyboard fields and the examples in `docs/storyboards/`.

## License

MIT. The included stories are public domain. Illustrations and recordings travel with their book packs.
