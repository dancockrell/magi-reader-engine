import { StrictMode, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createHashRouter,
  Link,
  Navigate,
  RouterProvider,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom';

import { lineFor } from './lib/vocab/text.js';
import { wordsOf } from './lib/vocab/words.js';
import { createSession, advance, answer, progressOf } from './lib/vocab/session.js';
import { loadTapped, saveTapped, tap, practiceSet } from './lib/vocab/tapped.js';
import { storyTrack, stepTrack } from './lib/reader/track.js';
import { translatorFor } from './lib/book/translate.js';
import { rememberWhere, whereLeftOff, forgetWhere } from './lib/reader/resume.js';

import Bookshelf from './ui/Bookshelf.jsx';
import BookRoute from './ui/BookRoute.jsx';
import Gate from './ui/Gate.jsx';
import Reader from './ui/Reader.jsx';
import Explore from './ui/Explore.jsx';
import VocabCard from './ui/VocabCard.jsx';
import { useBook } from './ui/useBook.jsx';
import './styles.css';
import './solo.css';

function ReadingRoute() {
  const { book, id: bookId, lineCounts } = useBook();
  const { beat = '0' } = useParams();
  const navigate = useNavigate();
  const { settings } =
    /** @type {{settings: ReturnType<typeof import('./lib/settings.js').defaults>}} */ (
      useOutletContext()
    );

  const track = useMemo(() => storyTrack(book), [book]);
  const translator = useMemo(
    () => translatorFor(book, settings.language, lineCounts),
    [book, settings.language, lineCounts]
  );

  const wanted = Number.parseInt(beat, 10);
  const safe = stepTrack(track, Number.isFinite(wanted) ? wanted : 0, 0);
  const go = useCallback((n) => navigate(`/book/${bookId}/read/${n}`), [navigate, bookId]);

  useEffect(() => {
    rememberWhere(bookId, { pass: 1, at: safe, of: track.length });
  }, [bookId, safe, track.length]);

  const onTap = useCallback(
    (word) => saveTapped(bookId, tap(loadTapped(bookId), word)),
    [bookId]
  );

  if (safe !== wanted) {
    return <Navigate to={`/book/${bookId}/read/${safe}`} replace />;
  }

  return (
    <Reader
      index={safe}
      onMove={go}
      translationFor={translator ? translator.line : undefined}
      wordIn={translator ? translator.word : undefined}
      onTap={onTap}
      lang={translator ? translator.lang : ''}
      muted={!settings.sound}
      motion={settings.motion}
      rate={settings.pace}
    />
  );
}

function PractiseRoute() {
  const { book, id } = useBook();
  const ctx = useMemo(() => {
    const all = practiceSet(wordsOf(book), loadTapped(id));
    return { book, swaps: book.swaps, all };
  }, [book, id]);
  const [session, setSession] = useState(() => createSession(ctx));
  const onAnswer = useCallback(({ ok }) => setSession((s) => answer(s, ok)), []);
  const onNext = useCallback(() => setSession((s) => advance(ctx, s)), [ctx]);

  const doors = (
    <p className="practise-doors">
      <Link className="btn ghost" to={`/book/${id}`}>
        ‹ Back to the book
      </Link>
      <Link className="btn ghost" to={`/book/${id}/read/0`}>
        Back to the reading
      </Link>
    </p>
  );

  if (session.done) {
    return (
      <main className="done">
        <p className="eyebrow">Vocabulary</p>
        <h1>Good session.</h1>
        <p>
          {session.right} right{session.wrong ? `, ${session.wrong} worth seeing again` : ''}.
        </p>
        {doors}
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
      {doors}
    </main>
  );
}

function GateRoute() {
  const { id: bookId } = useBook();
  const [where, setWhere] = useState(() => whereLeftOff(bookId));
  return (
    <Gate
      resume={where}
      onForget={() => {
        forgetWhere(bookId);
        setWhere(null);
      }}
    />
  );
}

const router = createHashRouter([
  { path: '/', element: <Bookshelf /> },
  {
    path: '/book/:bookId',
    element: <BookRoute />,
    children: [
      { index: true, element: <GateRoute /> },
      { path: 'read/:beat', element: <ReadingRoute /> },
      { path: 'read', element: <Navigate to="read/0" replace /> },
      { path: 'words', element: <PractiseRoute /> },
      { path: 'explore', element: <Explore /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
