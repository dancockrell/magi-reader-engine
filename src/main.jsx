import { StrictMode, useMemo, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import book from './books/magi/book.json';
import { inlineGlosses } from './lib/book/validate.js';
import { lineFor } from './lib/vocab/text.js';
import { createSession, advance, answer, progressOf } from './lib/vocab/session.js';
import VocabCard from './ui/VocabCard.jsx';
import Reader from './ui/Reader.jsx';
import './styles.css';

/** Every glossed word in the book, once, in reading order. */
function wordsOf(b) {
  const seen = new Map();
  for (const u of b.units) {
    const entries = (u.gloss || []).map(([w, d]) => ({ w, d }));
    for (const sz of u.stanzas || []) entries.push(...inlineGlosses(sz));
    for (const e of entries) {
      const k = e.w.toLowerCase();
      if (!seen.has(k)) seen.set(k, { w: e.w, d: e.d, unit: u.id, hits: 0, asked: 0 });
    }
  }
  return [...seen.values()];
}

/**
 * The component decides nothing.
 *
 * Every transition is a pure function in lib/vocab/session.js, so there
 * is no state to update during render and no counter to increment in a
 * memo. What is left here is display and two event handlers.
 */
function Trainer() {
  const ctx = useMemo(() => {
    const all = wordsOf(book);
    return { book, swaps: book.swaps, all };
  }, []);

  const [session, setSession] = useState(() => createSession(ctx));

  const onAnswer = useCallback(({ ok }) => setSession((s) => answer(s, ok)), []);
  const onNext = useCallback(() => setSession((s) => advance(ctx, s)), [ctx]);

  if (session.done) {
    return (
      <main className="done">
        <h1>Finished</h1>
        <p>
          {session.right} right{session.wrong ? `, ${session.wrong} to revisit` : ''}.
        </p>
      </main>
    );
  }

  const target = session.question?.item;
  return (
    <main>
      <VocabCard
        question={session.question}
        line={target ? lineFor(book, target) : null}
        progress={progressOf(session)}
        onAnswer={onAnswer}
        onNext={onNext}
      />
    </main>
  );
}

/** The two halves of the product, switchable while both are being built. */
function App() {
  const [mode, setMode] = useState('read');
  return (
    <>
      <nav className="modes" aria-label="What to do">
        <button
          type="button"
          className="btn"
          aria-pressed={mode === 'read'}
          onClick={() => setMode('read')}
        >
          Read
        </button>
        <button
          type="button"
          className="btn"
          aria-pressed={mode === 'practise'}
          onClick={() => setMode('practise')}
        >
          Vocabulary
        </button>
      </nav>
      {mode === 'read' ? <Reader book={book} /> : <Trainer />}
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
