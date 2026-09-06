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

/**
 * The seam where the book gets into the solo reader.
 *
 * These tests deliberately use packs other than the bundled title. The
 * provider must re-derive identity, media and line counts whenever the
 * selected book changes; otherwise a Git-loaded book would inherit the
 * previous title's audio paths or translation alignment.
 */

const other = {
  ...book,
  meta: { ...book.meta, id: 'other-book', title: 'Another Reading' },
  media: { audio: 'other-audio/', cues: 'cues/other.vtt' },
};

const shorter = {
  ...book,
  meta: { ...book.meta, id: 'shorter-book' },
  units: book.units.slice(0, 2),
};

beforeEach(() => {
  localStorage.clear();
  resetCues();
});

function reading(pack) {
  return (
    <MemoryRouter>
      <BookProvider book={pack}>
        <Reader index={0} />
      </BookProvider>
    </MemoryRouter>
  );
}

async function read(pack) {
  const result = render(reading(pack));
  await act(async () => {});
  return result;
}

describe('the book is something the app is given', () => {
  it('uses a fixture that is not the bundled title', () => {
    expect(book.meta.id).not.toBe(defaultBook.meta.id);
    expect(other.media.audio).not.toBe(defaultBook.media.audio);
  });

  it('refuses to render a consumer with no book above it', () => {
    expect(() => render(<Probe />)).toThrow(/BookProvider/);
  });
});

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

describe('derived book state follows the selected pack', () => {
  it('counts the lines of the book it was given', () => {
    render(
      <BookProvider book={book}>
        <Probe />
      </BookProvider>
    );
    const want = Object.fromEntries(book.units.map((u) => [u.id, linesOf(u).length]));
    expect(JSON.parse(screen.getByTestId('counts').textContent)).toEqual(want);
  });

  it('recomputes those counts when the book changes', () => {
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
  it('renders a non-default book', async () => {
    await read(book);
    const unit = book.units[0];
    expect(screen.getAllByText(unit.title).length).toBeGreaterThan(0);
    expect(screen.getAllByText(unit.act).length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: unit.caption })).toBeInTheDocument();
  });

  it('uses the recording folder declared by the pack', async () => {
    await read(book);
    const src = document.querySelector('audio')?.getAttribute('src');
    expect(src, 'the reading has no clip to play').toBeTruthy();
    expect(src.startsWith(book.media.audio)).toBe(true);
    expect(src.startsWith(defaultBook.media.audio)).toBe(false);
  });

  it('follows a second pack without a reload', async () => {
    const { rerender } = await read(book);
    expect(document.querySelector('audio').getAttribute('src')).toContain(book.media.audio);

    rerender(reading(other));
    await act(async () => {});

    const src = document.querySelector('audio').getAttribute('src');
    expect(src.startsWith(other.media.audio)).toBe(true);
    expect(src.startsWith(book.media.audio)).toBe(false);
  });
});
