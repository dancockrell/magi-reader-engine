import { useEffect, useMemo } from 'react';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { guideOutline, contentsOf, anchorFor, TOP } from '../lib/guide/outline.js';
import { T } from './useUi.jsx';

/**
 * The learning guide, which is also the teacher's guide.
 *
 * It owns no content. Every heading, every count and every word in it
 * comes out of `lib/guide/outline.js`, which comes out of the book pack —
 * so this file is the arrangement, the anchors and the printing, and a
 * second title needs none of it changed.
 *
 * Two things it deliberately does not build:
 *
 *   an accordion — the parts of the plan are `<details>`, so they open
 *   with a click, with a keyboard, with find-in-page, and on paper.
 *
 *   a print dialog — the button calls the one the browser already has.
 *   "Exportable for compliance" is print-to-PDF, which every device a
 *   school owns can already do, and which produces a file a department
 *   can open in ten years.
 */

/**
 * Jump to a section.
 *
 * The router is a hash router, because itch serves this from a static
 * path with no server to rewrite URLs. That has one consequence right
 * here: the fragment belongs to the router, so a bare `href="#words"`
 * would not scroll — it would navigate to a route called `words`, miss,
 * and bounce the reader to the front page.
 *
 * So the links are real links to a real location — `#/guide#guide-words`
 * survives a reload, a bookmark and a Back press, which is the whole
 * reason this build has a router at all — and the scroll the browser
 * would have done is done here instead.
 *
 * `key` is in the dependencies as well as `hash`: clicking the same
 * contents entry twice is two navigations to the same place, and a
 * reader who has scrolled away in between expects the second one to
 * take them back.
 */
function useJumpToHash() {
  const { hash, key } = useLocation();

  useEffect(() => {
    const id = hash.replace(/^#/, '');
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;

    /* Smooth per jump rather than `scroll-behavior: smooth` in the
       stylesheet, so that turning motion off turns this off with it —
       and so a jump in a browser that ignores the option still lands. */
    const still =
      document.documentElement.classList.contains('stillness') ||
      (typeof matchMedia === 'function' &&
        matchMedia('(prefers-reduced-motion: reduce)').matches);
    el.scrollIntoView?.({ behavior: still ? 'auto' : 'smooth', block: 'start' });
  }, [hash, key]);
}

/** A line, with the same line in the reader's language underneath it. */
function Line({ said, lang }) {
  if (!said) return null;
  return (
    <>
      {said.text}
      {said.other && (
        <span className="ui-tr" lang={lang || undefined}>
          {said.other}
        </span>
      )}
    </>
  );
}

/** One part of the book: what it points at, what it asks, what it explains. */
function Entry({ entry, lang }) {
  const asked = entry.asks.length;
  return (
    /* Open, and not by oversight. A closed <details> is not in the
       printed page in any browser, and this document exists to be
       printed — so what is on screen is what comes out of the printer,
       and collapsing a part is the reader's choice rather than a state
       the guide arrives in and prints from. */
    <details className="guide-entry" open>
      <summary>
        <span className="guide-entry-act">{entry.act}</span>
        <span className="guide-entry-title">{entry.title}</span>
        <span className="guide-entry-meta">
          {entry.read ? `${entry.lines} lines` : 'not read aloud'}
          {asked ? ` · ${asked} to answer` : ''}
          {entry.writes ? ' · 1 to write' : ''}
        </span>
      </summary>

      {entry.caption && <p className="guide-entry-cap">{entry.caption}</p>}

      <dl className="guide-entry-body">
        {entry.watch && (
          <>
            <dt>Before it</dt>
            <dd>
              <Line said={entry.watch} lang={lang} />
            </dd>
          </>
        )}
        {entry.focus && (
          <>
            <dt>What to notice</dt>
            <dd>
              <Line said={entry.focus} lang={lang} />
            </dd>
          </>
        )}
        {asked > 0 && (
          <>
            <dt>It asks</dt>
            <dd>
              <ol className="guide-asks">
                {entry.asks.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
            </dd>
          </>
        )}
        {entry.writes && (
          <>
            <dt>To write</dt>
            <dd>
              <p className="guide-writes">{entry.writes.q}</p>
              {entry.writes.intro && <p>{entry.writes.intro}</p>}
              <p className="guide-note">
                {entry.writes.hint}
                {entry.writes.minWords ? ` At least ${entry.writes.minWords} words.` : ''}
              </p>
            </dd>
          </>
        )}
        {entry.words.length > 0 && (
          <>
            <dt>Words explained here</dt>
            <dd>{entry.words.join(', ')}</dd>
          </>
        )}
      </dl>
    </details>
  );
}

/** A table that may be wider than the page it is on. */
function Table({ columns, rows }) {
  return (
    <div className="guide-table">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">
                <T>{c}</T>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join('|')}>
              {row.map((cell, i) => (
                <td key={columns[i]}>
                  <T>{cell}</T>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One piece of a section. The set is closed; see the outline. */
function Block({ block, lang }) {
  switch (block.kind) {
    case 'lede':
      return <p className="guide-lede">{block.text}</p>;
    case 'para':
      return <p>{block.text}</p>;
    case 'note':
      return <p className="guide-note">{block.text}</p>;
    case 'subhead':
      return (
        <h4>
          <T>{block.text}</T>
        </h4>
      );
    case 'list':
      return (
        <ul>
          {block.items.map((item) => (
            <li key={(item.lead || '') + item.text}>
              {item.lead && <b>{item.lead} </b>}
              {item.text}
            </li>
          ))}
        </ul>
      );
    case 'table':
      return <Table columns={block.columns} rows={block.rows} />;
    case 'plan':
      return (
        <div className="guide-plan">
          {block.entries.map((e) => (
            <Entry key={e.id} entry={e} lang={lang} />
          ))}
        </div>
      );
    case 'glossary':
      return (
        <Table
          columns={
            block.words.some((w) => w.other)
              ? ['Word', 'What it means', 'In your language', 'Met in']
              : ['Word', 'What it means', 'Met in']
          }
          rows={block.words.map((w) =>
            block.words.some((x) => x.other)
              ? [w.word, w.meaning, w.other || '', w.where]
              : [w.word, w.meaning, w.where]
          )}
        />
      );
    default:
      return null;
  }
}

/**
 * @param {object} props
 * @param {import('../lib/types.js').Book} props.book
 * @param {string} [props.lang]  overrides the reader's setting, for tests
 */
export default function Guide({ book, lang }) {
  /* The reader's language comes from the shell, the same way the reading
     gets it. Read defensively rather than destructured: this component is
     also rendered on its own in a test, where there is no outlet above
     it and the context is null. */
  const ctx = /** @type {{settings?: {language?: string}}|null} */ (useOutletContext());
  const language = lang ?? ctx?.settings?.language ?? '';
  const { pathname } = useLocation();
  useJumpToHash();

  const outline = useMemo(() => guideOutline(book, { lang: language }), [book, language]);
  const contents = useMemo(() => contentsOf(outline), [outline]);

  /* Every section ends with the way back to the contents, so a reader
     who has jumped into the middle of a long document is never left
     scrolling to find the list again. */
  const backToTop = (
    <Link className="guide-backtop" to={{ pathname, hash: `#${TOP}` }}>
      Back to contents
    </Link>
  );

  return (
    <main className="guide">
      <header className="guide-cover">
        {outline.of && (
          <p className="guide-of">
            {outline.of}
            {outline.by ? `, ${outline.by}` : ''}
          </p>
        )}
        <h1>
          <T>{outline.title}</T>
        </h1>
        <p className="guide-sub">{outline.subtitle}</p>
      </header>

      <div className="guide-wrap">
        <nav className="guide-toc" id={TOP} aria-label="Contents">
          <h2>Contents</h2>
          {contents.map((part) => (
            <div className="guide-toc-part" key={part.key}>
              <b>{part.title}</b>
              <span>{part.note}</span>
              <ol>
                {part.items.map((item) => (
                  <li key={item.id}>
                    <Link to={{ pathname, hash: `#${item.anchor}` }}>
                      <span className="guide-toc-n">{item.n}</span>
                      <T>{item.heading}</T>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          <button
            type="button"
            className="btn ghost guide-print"
            onClick={() => window.print()}
          >
            Print or save as PDF
          </button>
        </nav>

        <div className="guide-body">
          {outline.parts.map((part) => (
            <div key={part.key}>
              <div className="guide-part">
                <h2>{part.title}</h2>
                <p>{part.note}</p>
              </div>
              {part.sections.map((section) => (
                <section key={section.id} id={anchorFor(section.id)}>
                  <h3>
                    <span className="guide-n">{section.n}</span>
                    <T>{section.heading}</T>
                  </h3>
                  {section.blocks.map((block, i) => (
                    <Block key={i} block={block} lang={outline.lang} />
                  ))}
                  {backToTop}
                </section>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
