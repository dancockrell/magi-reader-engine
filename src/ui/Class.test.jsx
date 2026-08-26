import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Class from './Class.jsx';
import book from '../books/fixture/index.js';
import { BookProvider } from './useBook.jsx';
import { encode } from '../lib/qr/encode.js';
import { qrPath } from '../lib/qr/svg.js';
import { classKey, joinCode, mintOwner, readJoin, readClassKey } from '../lib/class/key.js';

/**
 * What the code on the wall actually contains.
 *
 * This is the one thing about the QR feature that is worth more than a
 * screenshot. The class panel shows two long strings a few centimetres
 * apart — the class key, which makes a device the teacher's, and the
 * join link, which does not — and a QR code renders both of them as the
 * same anonymous field of squares. Encoding the wrong one hands the
 * gradebook to every student who scans it, and there is no way to see
 * that by looking.
 *
 * So the code is decoded back here, and asserted to be the join link.
 * The rest of the teacher panel is covered end to end in
 * `e2e/teacher.spec.js`; this is the assertion that has to hold in the
 * same commit as the feature.
 */

const API =
  'https://script.google.com/macros/s/AKfycbwABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abc/exec';

/**
 * Read the drawn code back out of the DOM.
 *
 * The path is the only place the encoded text survives in the rendered
 * output, so the way to find out what was encoded is to find the input
 * whose path matches it. Which is enough: the join link and the class
 * key produce entirely different symbols, and a match on the whole path
 * is a match on every module.
 */
function drawnMatches(svg, text) {
  const drawn = svg.querySelector('path')?.getAttribute('d');
  return !!drawn && drawn === qrPath(text).d;
}

beforeEach(() => {
  localStorage.clear();
});

/**
 * The teacher's panel, on the book the app is showing.
 *
 * Which book that is arrives through the provider, not as a prop: the
 * outbox and the gradebook are filed per book, and the panel has to read
 * that off the reading rather than off anything decided when this file
 * loaded.
 */
function open() {
  return render(
    <BookProvider book={book}>
      <Class />
    </BookProvider>
  );
}

/** Set this device up as a teacher with a Sheet connected. */
function asTeacher(cls = '1-A') {
  const owner = mintOwner(cls);
  localStorage.setItem('reader.teacher.owner.v1', JSON.stringify(owner));
  localStorage.setItem('reader.api.v1', API);
  return owner;
}

describe('the code the class scans', () => {
  it('carries the join link, and not the class key', () => {
    /* The prototype handed students the class key. Anyone who kept the
       link could open the gradebook, and a QR code is the easiest way
       yet invented to hand a whole room something by mistake. */
    const owner = asTeacher();
    open();

    const svg = screen.getAllByRole('img', { name: /code holding the link/i })[0];
    expect(svg).toBeInTheDocument();

    const join = joinCode(API, '1-A');
    const link = `${globalThis.location.origin}${globalThis.location.pathname}#/?join=${join}`;
    expect(drawnMatches(svg, link), 'the code is not the join link').toBe(true);
    expect(
      drawnMatches(svg, classKey(owner, API)),
      'the class key was encoded into the code'
    ).toBe(false);
  });

  it('encodes something a student device can act on and a teacher cannot be made from', () => {
    /* Belt and braces on the payload itself rather than on the drawing:
       what a scan produces has to read as a join code and must not read
       as a class key. */
    const join = joinCode(API, '1-A');
    expect(readJoin(join)).toEqual({ api: API, cls: '1-A' });
    expect(readClassKey(join)).toBeNull();

    const link = `https://example.test/reader/#/?join=${join}`;
    /* and it has to fit in a symbol at all, at a realistic length */
    expect(() => encode(link)).not.toThrow();
    expect(encode(link).version).toBeLessThanOrEqual(10);
  });

  it('is not shown at all until there is a Sheet to point a device at', () => {
    /* Without an endpoint there is no join code, so a code here would
       encode a link that joins nothing. */
    localStorage.setItem('reader.teacher.owner.v1', JSON.stringify(mintOwner('1-A')));
    open();
    expect(screen.queryByRole('img', { name: /code holding the link/i })).toBeNull();
  });

  it('has a way to make it big enough to read from the back of the room', () => {
    asTeacher();
    open();
    expect(screen.getByRole('button', { name: /Show it big/i })).toBeInTheDocument();
  });

  it('describes itself to a screen reader instead of being an unnamed picture', () => {
    asTeacher();
    open();
    const svg = screen.getAllByRole('img', { name: /code holding the link/i })[0];
    expect(svg.getAttribute('aria-label')).toMatch(/link for your class/i);
  });
});
