# Raven Reader

An engine for illustrated readings. The first book is _The Gift of the Magi_.

## The rule this project is built on

**The single-file reader is the specification.** It works, it has been
attacked at length, and the fixes in it were paid for. So it is not
something to preserve — it is a target to pass and then beat.

Everything the old reader got right is captured here as an executable
test before the equivalent is rebuilt. Every one of those tests is a
defect that was found by attacking the original:

| test              | what it stops coming back                                                      |
| ----------------- | ------------------------------------------------------------------------------ |
| formula injection | `=HYPERLINK(...)` in a student's answer running when the teacher opens the CSV |
| leading zeros     | student `01` and `1` becoming the same person in Excel                         |
| date coercion     | a score of `9 / 10` being read as 9 October                                    |
| written totals    | perfect written work scoring 67%, because the questions were counted twice     |
| resubmission      | a grade being replaced with nothing to say a better one existed                |
| substitution      | `craved`/`coveted` appearing as each other's wrong answer                      |

## Layout

```
src/lib/book/       the book package contract — what a valid book is
src/lib/gradebook/  submissions to rows to CSV
src/lib/vocab/      question selection, text handling, session transitions
src/ui/             React components: presentation only
tools/              extract the book from the old reader, and check it
```

`src/lib` is pure. No DOM, no React, no timers. That is what makes the
2,685-question sweep possible in under a second.

## What React is and is not for

React is used for the **form-shaped UI** — the question card, the gate,
the teacher panel, the results. That is where the old reader's `innerHTML`
defects and dead-listener bugs lived, and where it could not be tested.

React is **not** used for the cinema layer: audio timing, the text
fitter, the luminance scrim. Those are imperative measurement-and-timing
work, they are correct, and the hard bugs in them were about layout and
CSS, not the view layer. They stay imperative behind refs.

## Commands

```
npm run dev            the reader, with hot reload
npm run verify         format, lint, types, book contract, sweep, tests
npm run build          dist/ for itch — assets stay as files
SINGLE=1 npm run build one self-contained index.html for a memory stick
npm run book:extract   re-read the book out of the old single-file reader
```

`npm run verify` is the gate. It runs in about four seconds and nothing
should be committed that does not pass it.

## Content is generated; content is not trusted

The engine is meant to carry many books, and the bottleneck is per-book
content — scene text, glossary, definitions, substitutions, translations.
That work can be generated locally.

Which is exactly why `src/lib/book/validate.js` exists. A cheap generator
that is occasionally wrong is only useful when something strict sits
downstream. The validator refuses a word glossed but absent from the
text, unbalanced `{word|meaning}` markup, a `correct` index pointing at
no option, a substitution equal to its own word — the mistakes a
generator actually makes.

It has already caught two in the shipping book: `vestibule` and `janitor`
were each glossed two different ways.
