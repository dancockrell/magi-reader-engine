import { describe, it, expect } from 'vitest';
import book from '../books/fixture/index.js';
import { render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import Guide from './Guide.jsx';
import { BookProvider } from './useBook.jsx';
import { guideOutline, sectionsOf, anchorFor, planOf } from '../lib/guide/outline.js';

/**
 * "Done when it prints cleanly and its table of contents jumps."
 *
 * The printing is CSS, and jsdom has no printer. What can be asserted
 * here is the half that actually breaks: that every contents entry has
 * something in the document to jump to, and that it is still a link — a
 * real href, so it works before the JavaScript settles, survives a
 * reload, and can be shared.
 *
 * Rendered from the engine's own fixture book. This component owns no
 * content — every heading and count in it comes out of the pack — so a
 * title would only prove it works for that title.
 */

/**
 * Rendered at /guide, the way the app mounts it.
 *
 * The book arrives through the provider rather than as a prop, which is
 * how the app supplies it: the router is built before any book is chosen,
 * so nothing on a route can be handed one.
 */
function open(props = {}) {
  const router = createMemoryRouter(
    [
      {
        path: '/guide',
        element: (
          <BookProvider book={book}>
            <Guide {...props} />
          </BookProvider>
        ),
      },
    ],
    { initialEntries: ['/guide'] }
  );
  return render(<RouterProvider router={router} />);
}

describe('the table of contents jumps', () => {
  it('lands every entry on a section that is on the page', () => {
    open();
    const contents = screen.getByRole('navigation', { name: /contents/i });
    const links = within(contents).getAllByRole('link');
    expect(links.length).toBeGreaterThan(5);

    for (const link of links) {
      /* The fragment of the href, which is what the jump uses. Under a
         hash router the href is `#/guide#guide-plan`, so the id is
         everything after the LAST hash. */
      const id = link.getAttribute('href').split('#').pop();
      expect(document.getElementById(id), `nothing to jump to: ${id}`).not.toBeNull();
    }
  });

  it('keeps them as links, so a jump can be shared and reloaded', () => {
    /* A button with an onClick would scroll and leave the URL saying
       nothing. The whole reason this build has a router is that a
       teacher can send a link to exactly the screen they mean. */
    open();
    const contents = screen.getByRole('navigation', { name: /contents/i });
    for (const link of within(contents).getAllByRole('link')) {
      expect(link.getAttribute('href')).toMatch(/\/guide#guide-/);
    }
  });

  it('offers the way back to the contents from every section', () => {
    open();
    const back = screen.getAllByRole('link', { name: /back to contents/i });
    expect(back).toHaveLength(sectionsOf(guideOutline(book)).length);
    expect(
      document.getElementById(back[0].getAttribute('href').split('#').pop())
    ).not.toBeNull();
  });
});

describe('the document', () => {
  it('renders every section the outline describes', () => {
    open();
    for (const section of sectionsOf(guideOutline(book))) {
      const el = document.getElementById(anchorFor(section.id));
      expect(el, `missing section: ${section.id}`).not.toBeNull();
      expect(el.textContent).toContain(section.heading);
    }
  });

  it('uses real headings, in order, and skips no level', () => {
    /* Screen readers and the print stylesheet both walk this. A page of
       styled divs looks the same and is unreadable to both. */
    open();
    const levels = [...document.querySelectorAll('h1,h2,h3,h4')].map((h) =>
      Number(h.tagName[1])
    );
    expect(levels[0]).toBe(1);
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1], `jumped from h${levels[i - 1]}`).toBeLessThanOrEqual(1);
    }
  });

  it('opens the plan, because a closed <details> does not print', () => {
    open();
    const parts = /** @type {NodeListOf<HTMLDetailsElement>} */ (
      document.querySelectorAll('.guide-entry')
    );
    /* One per part the book teaches — the count comes from the book so
       that a part silently missing from the plan fails here too. */
    expect(parts).toHaveLength(planOf(book).length);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(p.open).toBe(true);
  });

  it('names the book it was built from', () => {
    open();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Learning guide');
    expect(document.body.textContent).toContain(book.meta.title);
  });

  it("shows the reader's language under the lines that have one", () => {
    /* The setting reaches this screen. It did not reach the reading for
       two phases, which is the defect this is written against. */
    const lang = book.languages[0].code;
    open({ lang });
    const translated = document.querySelectorAll(`.guide-entry .ui-tr[lang="${lang}"]`);
    /* Two lines per part are quoted from the guides — what to watch for
       and what to notice — and the pack translates both. */
    expect(translated).toHaveLength(planOf(book, lang).length * 2);
    expect(translated.length).toBeGreaterThan(1);
  });

  it('is English only when no language has been chosen', () => {
    open({ lang: '' });
    expect(document.querySelectorAll('.guide-entry .ui-tr')).toHaveLength(0);
  });
});
