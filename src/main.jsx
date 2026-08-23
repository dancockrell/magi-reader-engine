import { StrictMode, useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createHashRouter,
  Navigate,
  RouterProvider,
  useNavigate,
  useParams,
} from 'react-router-dom';

import book from './books/magi/book.json';
import { inlineGlosses } from './lib/book/validate.js';
import { lineFor } from './lib/vocab/text.js';
import { createSession, advance, answer, progressOf } from './lib/vocab/session.js';
import { beatsOfBook, step } from './lib/reader/beats.js';

import Shell from './ui/Shell.jsx';
import Gate from './ui/Gate.jsx';
import Reader from './ui/Reader.jsx';
import VocabCard from './ui/VocabCard.jsx';
import './styles.css';

/* ---------------------------------------------------------------
   Hash routing, deliberately.

   itch serves a game from a static path with no server to rewrite
   URLs, so a browser reload on /read/2/14 would 404 under history
   routing. A hash keeps every route reloadable and shareable on a
   plain file host, which is where this actually lives.
   --------------------------------------------------------------- */

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

function ReadingRoute() {
  const { pass = '1', beat = '0' } = useParams();
  const navigate = useNavigate();
  const beats = useMemo(() => beatsOfBook(book), []);

  /* The URL is the position. A bad one is corrected rather than
     allowed to blank the page — a stale saved index used to do
     exactly that in the legacy reader. */
  const wanted = Number.parseInt(beat, 10);
  const safe = step(beats, Number.isFinite(wanted) ? wanted : 0, 0);
  const passNo = [1, 2, 3].includes(Number(pass)) ? Number(pass) : 1;

  if (safe !== wanted || String(passNo) !== pass) {
    return <Navigate to={`/read/${passNo}/${safe}`} replace />;
  }

  return (
    <Reader
      book={book}
      index={safe}
      pass={passNo}
      onMove={(next) => navigate(`/read/${passNo}/${next}`)}
    />
  );
}

function PractiseRoute() {
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
    <main className="practise">
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

/** Phases 5 and 6 fill these in; they are routes now so the doors work. */
function NotYet({ what, phase }) {
  return (
    <main className="notyet">
      <h1>{what}</h1>
      <p>
        Not built yet — it is phase {phase} of the plan. It is in the shipping reader today.
      </p>
    </main>
  );
}

const router = createHashRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Gate /> },
      { path: 'read/:pass/:beat', element: <ReadingRoute /> },
      { path: 'read/:pass', element: <Navigate to="/read/1/0" replace /> },
      { path: 'practise', element: <PractiseRoute /> },
      { path: 'class', element: <NotYet what="Class" phase={5} /> },
      { path: 'guide', element: <NotYet what="Learning guide" phase={6} /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
