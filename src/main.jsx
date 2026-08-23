import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
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
import { trackFor, stepTrack } from './lib/reader/track.js';
import { answerQuestion, skipQuestion, write } from './lib/reader/assessment.js';
import {
  loadAttempt,
  saveAttempt,
  restoreQuiz,
  restoreWriting,
  snapshotQuiz,
  snapshotWriting,
} from './lib/reader/attempt.js';

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

/* The teacher's rules would come from the class settings; until phase 5
   wires that up, the reader's own default is the kind one. */
const RULES = { retry: true };
const BOOK_ID = book.meta?.id || 'magi';

/**
 * One reading.
 *
 * Owns the attempt — the answers and the writing — because those have to
 * survive moving between stops, and the position moves through the
 * router. The position itself is never held here: it is the URL.
 */
function ReadingRoute() {
  const { pass = '1', beat = '0' } = useParams();
  const navigate = useNavigate();

  const passNo = [1, 2, 3].includes(Number(pass)) ? Number(pass) : 1;
  const track = useMemo(() => trackFor(book, passNo), [passNo]);

  /* Resumed on the way in rather than started empty, so a tablet that
     slept through break does not cost a student their work. */
  const [quiz, setQuiz] = useState(() => restoreQuiz(book, RULES, loadAttempt(BOOK_ID, 2)));
  const [writing, setWriting] = useState(() => restoreWriting(book, loadAttempt(BOOK_ID, 3)));

  useEffect(() => {
    saveAttempt(BOOK_ID, 2, snapshotQuiz(quiz));
  }, [quiz]);
  useEffect(() => {
    saveAttempt(BOOK_ID, 3, snapshotWriting(writing));
  }, [writing]);

  /* The URL is the position. A bad one is corrected rather than
     allowed to blank the page — a stale saved index used to do
     exactly that in the legacy reader. */
  const wanted = Number.parseInt(beat, 10);
  const safe = stepTrack(track, Number.isFinite(wanted) ? wanted : 0, 0);
  const go = useCallback((n) => navigate(`/read/${passNo}/${n}`), [navigate, passNo]);

  const stop = track[safe];

  /* Answering points the quiz at the question the reader is actually on
     first. Walking back to an earlier question and answering it must
     change that question, not whichever one the quiz object had reached. */
  const onAnswer = useCallback(
    (choice) => {
      if (stop?.kind !== 'question') return;
      const at = quiz.questions.findIndex((q) => q.id === stop.question.id);
      if (at < 0) return;
      setQuiz(answerQuestion({ ...quiz, at, done: false }, choice));
      /* Deliberately does not move on. A wrong first answer under "one
         more try" shows a hint; a recorded answer shows the explanation
         the book wrote for that question, which is the part that teaches
         — and auto-advancing scrolled straight past it. Next is the
         student's to press, which is what every quiz they have used
         already does. */
    },
    [quiz, stop]
  );

  const onSkip = useCallback(() => {
    if (stop?.kind !== 'question') return;
    const at = quiz.questions.findIndex((q) => q.id === stop.question.id);
    setQuiz(skipQuestion({ ...quiz, at, done: false }));
    go(stepTrack(track, safe, 1));
  }, [quiz, stop, track, safe, go]);

  const onWrite = useCallback(
    (text) => {
      if (stop?.kind !== 'prompt') return;
      const at = writing.prompts.findIndex((p) => p.id === stop.prompt.id);
      if (at < 0) return;
      setWriting((w) => write({ ...w, at }, text));
    },
    [writing, stop]
  );

  if (safe !== wanted || String(passNo) !== pass) {
    return <Navigate to={`/read/${passNo}/${safe}`} replace />;
  }

  return (
    <Reader
      book={book}
      index={safe}
      pass={passNo}
      onMove={go}
      quiz={passNo === 2 ? quiz : null}
      onAnswer={onAnswer}
      onSkip={onSkip}
      writing={passNo === 3 ? writing : null}
      onWrite={onWrite}
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
