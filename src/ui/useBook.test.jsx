import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import book from '../books/fixture/index.js';
import { defaultBook } from '../books/index.js';
import { BookProvider, useBook } from './useBook.jsx';
import { linesOf } from '../lib/reader/beats.js';
import { resetCues } from './useCueTrack.js';
import Reader from './Reader.jsx';
import Class from './Class.jsx';

/**
 * The seam where the book gets in.
 *
 * The book used to be an `import` at the top of `main.jsx`, and
 * everything that fell out of it — the id a student's work is filed
 * under, the folder the recordings are in, the line counts a translation
 * is checked against — was worked out once, when the file loaded. With
 * one book that is invisible. With two it is a data-loss bug: the second
 * book's answers get written under the first book's name, and nothing
 * anywhere says so.
 *
 * So these are the tests that could not have passed before. Every one of
 * them renders a book that is NOT the one the app ships with, and two of
 * them change the book while the screen is mounted — which is the case a
 * value captured at load can never survive.
 */

/** A second title, so "follows the book" can mean something. */
const other = {
  ...book,
  meta: { ...book.meta, id: 'other-book', title: 'Another Reading' },
  media: { audio: 'other-audio/', cues: 'cues/other.vtt' },
};

/** A third, shorter, so the derived counts have to be different. */
const shorter = {
  ...book,
  meta: { ...book.meta, id: 'shorter-book' },
  units: book.units.slice(0, 2),
};

beforeEach(() => {
  localStorage.clear();
  /* The cue file is fetched once and cached at module scope, so a book
     read in one test would hand its timings to the next one. */
  resetCues();
});

/** The reading, mounted on whichever book it is handed. */
function reading(pack) {
  return (
    <MemoryRouter>
      <BookProvider book={pack}>
        <Reader index={0} pass={1} />
      </BookProvider>
    </MemoryRouter>
  );
}

/** Mounted, with the cue fetch allowed to settle before anything is asked. */
async function read(pack) {
  const r = render(reading(pack));
  await act(async () => {});
  return r;
}

describe('the book is something the app is given', () => {
  it('is not the book the app ships with, so these tests mean something', () => {
    /* If the fixture were ever registered as a title, every assertion
       below would still pass and prove nothing. */
    expect(book.meta.id).not.toBe(defaultBook.meta.id);
    expect(other.media.audio).not.toBe(defaultBook.media.audio);
  });

  it('refuses to render a screen that has no book above it', () => {
    /* The router is built at module scope, so the provider has to wrap
       it rather than live inside it. Get that wrong and every screen
       reads a book nobody chose — which is worth an error the first
       time it is rendered, not a quiet default. */
    expect(() => render(<Probe />)).toThrow(/BookProvider/);
  });
});

/** Reads the seam and puts what it found on the page. */
function Probe() {
  const { id, title, media, lineCounts } = useBook();
  return (
    <ul>
      <li data-testid="id">{id}</li>
      <li data-testid="title">{title}</li>
      <li data-testid="audio">{media.audio}</li>
      <li data-testid="counts">{JSON.stringify(lineCounts)}</li>
    </ul>
  );
}

describe('what falls out of the book falls out of THIS book', () => {
  it('counts the lines of the book it was given', () => {
    render(
      <BookProvider book={book}>
        <Probe />
      </BookProvider>
    );
    const want = Object.fromEntries(book.units.map((u) => [u.id, linesOf(u).length]));
    expect(JSON.parse(screen.getByTestId('counts').textContent)).toEqual(want);
  });

  it('counts them again when the book changes, rather than keeping the first answer', () => {
    /* The line counts are what refuse a translation that does not line
       up. Left over from a previous book they would refuse a good
       translation and wave a mismatched one through — silently, against
       the wrong sentences. */
    const { rerender } = render(
      <BookProvider book={book}>
        <Probe />
      </BookProvider>
    );
    const first = screen.getByTestId('counts').textContent;

    rerender(
      <BookProvider book={shorter}>
        <Probe />
      </BookProvider>
    );
    const second = screen.getByTestId('counts').textContent;

    expect(second).not.toBe(first);
    expect(Object.keys(JSON.parse(second))).toEqual(shorter.units.map((u) => u.id));
    expect(screen.getByTestId('id')).toHaveTextContent('shorter-book');
  });
});

describe('the reading is of the book it is given', () => {
  it('renders a book that is not the default at all', async () => {
    await read(book);

    const unit = book.units[0];
    /* Twice over: in the segment button and in the storyboard behind it. */
    expect(screen.getAllByText(unit.title).length).toBeGreaterThan(0);
    expect(screen.getAllByText(unit.act).length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: unit.caption })).toBeInTheDocument();
  });

  it('plays the recordings the pack names, not a folder the engine remembers', async () => {
    await read(book);
    const src = document.querySelector('audio')?.getAttribute('src');
    expect(src, 'the reading has no clip to play').toBeTruthy();
    expect(src.startsWith(book.media.audio)).toBe(true);
    expect(src.startsWith(defaultBook.media.audio)).toBe(false);
  });

  it('follows the book to a second pack without a reload', async () => {
    /* The case the old shape could not survive: the reading is already
       on screen when the book changes. A media path read once at load
       would keep pointing at the first pack, and every clip would 404. */
    const { rerender } = await read(book);
    expect(document.querySelector('audio').getAttribute('src')).toContain(book.media.audio);

    rerender(reading(other));
    await act(async () => {});

    const src = document.querySelector('audio').getAttribute('src');
    expect(src.startsWith(other.media.audio)).toBe(true);
    expect(src.startsWith(book.media.audio)).toBe(false);
  });
});

describe('per-book storage keys follow the book', () => {
  /**
   * The outbox is filed per book, and the teacher's panel is where it
   * shows. Seeded directly, because what is being tested is which key
   * gets read — not how work gets into it.
   */
  const parked = (id, count) =>
    localStorage.setItem(
      `reader.outbox.v1.${id}`,
      JSON.stringify(
        Array.from({ length: count }, (_, i) => ({
          id: `w${i}`,
          at: Date.now(),
          tries: 0,
          payload: {},
        }))
      )
    );

  const teacher = () => {
    localStorage.setItem(
      'reader.teacher.owner.v1',
      JSON.stringify({ id: 'abc', cls: '1-A', at: '2026-01-01' })
    );
  };

  const panel = (pack) =>
    render(
      <BookProvider book={pack}>
        <Class />
      </BookProvider>
    );

  it('reads the outbox of the book on screen', () => {
    teacher();
    parked(book.meta.id, 2);
    parked(other.meta.id, 0);

    panel(book);
    expect(screen.getByText(/pieces of work handed in/i).textContent).toMatch(/\b2\b/);
  });

  it('reads a different book’s outbox from a different key', () => {
    teacher();
    parked(book.meta.id, 2);
    parked(other.meta.id, 0);

    panel(other);
    expect(screen.getByText(/Nothing is waiting/i)).toBeInTheDocument();
  });

  it('changes which key it reads when the book changes under it', () => {
    /* The whole point. A book id captured when the module loaded cannot
       do this, and the failure is silent: one book's work written under
       another book's name, discovered by a teacher who cannot find it. */
    teacher();
    parked(book.meta.id, 2);
    parked(other.meta.id, 0);

    const { rerender } = panel(other);
    expect(screen.getByText(/Nothing is waiting/i)).toBeInTheDocument();

    rerender(
      <BookProvider book={book}>
        <Class />
      </BookProvider>
    );
    expect(screen.queryByText(/Nothing is waiting/i)).toBeNull();
    expect(screen.getByText(/pieces of work handed in/i).textContent).toMatch(/\b2\b/);
  });
});
