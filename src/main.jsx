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

import { defaultBook } from './books/index.js';
import { lineFor } from './lib/vocab/text.js';
import { wordsOf } from './lib/vocab/words.js';
import { createSession, advance, answer, progressOf } from './lib/vocab/session.js';
import { loadTapped, saveTapped, tap, practiceSet } from './lib/vocab/tapped.js';
import { trackFor, stepTrack } from './lib/reader/track.js';
import { translatorFor } from './lib/book/translate.js';
import { rememberWhere, whereLeftOff, forgetWhere } from './lib/reader/resume.js';
import { answerQuestion, skipQuestion, write } from './lib/reader/assessment.js';
import {
  loadAttempt,
  saveAttempt,
  restoreQuiz,
  restoreWriting,
  snapshotQuiz,
  snapshotWriting,
} from './lib/reader/attempt.js';

import { buildSubmission } from './lib/reader/assessment.js';
import { loadStudent, saveStudent, forgetStudent } from './lib/class/student.js';
import { loadApi } from './lib/class/key.js';
import { loadOutbox, saveOutbox, queue, flush } from './lib/class/outbox.js';
import { senderFor } from './lib/class/send.js';

import Shell from './ui/Shell.jsx';
import HandIn from './ui/HandIn.jsx';
import Class from './ui/Class.jsx';
import Gate from './ui/Gate.jsx';
import Reader from './ui/Reader.jsx';
import Guide from './ui/Guide.jsx';
import VocabCard from './ui/VocabCard.jsx';
import { BookProvider, useBook } from './ui/useBook.jsx';
import './styles.css';

/* ---------------------------------------------------------------
   Hash routing, deliberately.

   itch serves a game from a static path with no server to rewrite
   URLs, so a browser reload on /read/2/14 would 404 under history
   routing. A hash keeps every route reloadable and shareable on a
   plain file host, which is where this actually lives.
   --------------------------------------------------------------- */

/* The teacher's rules would come from the class settings; until phase 5
   wires that up, the reader's own default is the kind one. */
const RULES = { retry: true };

/**
 * One reading.
 *
 * Owns the attempt — the answers and the writing — because those have to
 * survive moving between stops, and the position moves through the
 * router. The position itself is never held here: it is the URL.
 */
function ReadingRoute() {
  /* Which book, its id and its line counts all come from the app rather
     than from module scope. The id is what a student's answers are filed
     under, and computing it once when this file loaded meant that the
     moment a second book existed, one book's work would be written under
     the other's name. `lineCounts` has the same problem more quietly: it
     is what refuses a translation that does not line up, so a stale one
     refuses a good translation and accepts a bad one. */
  const { book, id: bookId, lineCounts } = useBook();
  const { pass = '1', beat = '0' } = useParams();
  const navigate = useNavigate();
  /* The settings live in the shell, and until now they stopped there:
     language, sound and pace were all saved, all persisted, and none of
     them reached the reading. */
  const { settings } =
    /** @type {{settings: ReturnType<typeof import('./lib/settings.js').defaults>}} */ (
      useOutletContext()
    );

  const passNo = [1, 2, 3].includes(Number(pass)) ? Number(pass) : 1;
  const track = useMemo(() => trackFor(book, passNo), [book, passNo]);
  const translator = useMemo(
    () => translatorFor(book, settings.language, lineCounts),
    [book, settings.language, lineCounts]
  );

  /* Resumed on the way in rather than started empty, so a tablet that
     slept through break does not cost a student their work. */
  const [quiz, setQuiz] = useState(() => restoreQuiz(book, RULES, loadAttempt(bookId, 2)));
  const [writing, setWriting] = useState(() => restoreWriting(book, loadAttempt(bookId, 3)));

  useEffect(() => {
    saveAttempt(bookId, 2, snapshotQuiz(quiz));
  }, [bookId, quiz]);
  useEffect(() => {
    saveAttempt(bookId, 3, snapshotWriting(writing));
  }, [bookId, writing]);

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

  /* Written down as they read, so the gate can offer to carry on. */
  useEffect(() => {
    rememberWhere(bookId, { pass: passNo, at: safe, of: track.length });
  }, [bookId, passNo, safe, track.length]);

  /**
   * A word looked up is a word to practise.
   *
   * Written straight to storage rather than held in state: nothing on
   * this screen renders the list, so holding it would re-render the whole
   * reading on every tap for nothing anyone can see. The practice screen
   * reads it when it opens.
   */
  const onTap = useCallback(
    (word) => saveTapped(bookId, tap(loadTapped(bookId), word)),
    [bookId]
  );

  /* ---- handing it in ---- */
  const [student, setStudent] = useState(() => loadStudent());
  const [handedIn, setHandedIn] = useState(() => new Set());
  const api = loadApi();

  /**
   * Write it down, then send it.
   *
   * In that order, always. Everything after the first step is best
   * effort: if the send fails the work is already in the outbox and
   * goes next time, and the student is not told, because there is
   * nothing they could do about it and the likely response is to hand
   * in again.
   */
  const onHandIn = useCallback(
    async (setStep) => {
      const payload = buildSubmission({ book, pass: passNo, student, quiz, writing });
      if (!payload) return;

      const pending = queue(loadOutbox(bookId), payload);
      saveOutbox(bookId, pending);
      setStep?.(2);

      const { items } = await flush(pending, senderFor(api));
      saveOutbox(bookId, items);
      setHandedIn((s) => new Set(s).add(passNo));
    },
    [book, bookId, passNo, student, quiz, writing, api]
  );

  /* The offline path: a file the teacher collects by hand. Named so it
     can be found in a Downloads folder with thirty others in it. */
  const onSaveFile = useCallback(() => {
    const payload = buildSubmission({ book, pass: passNo, student, quiz, writing });
    if (!payload) return;
    const who = [student?.cls, student?.no, student?.name].filter(Boolean).join(' ') || 'work';
    const name = `${who} — reading ${passNo}.json`.replace(/[\\/:*?"<>|]/g, '-');

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }, [book, passNo, student, quiz, writing]);

  const handIn = (
    <HandIn
      pass={passNo}
      student={student}
      hasClass={!!api}
      onSaveFile={onSaveFile}
      alreadyIn={handedIn.has(passNo)}
      onSignIn={(s) => {
        saveStudent(s);
        setStudent(s);
      }}
      onSignOut={() => {
        forgetStudent();
        setStudent(null);
      }}
      onHandIn={onHandIn}
    />
  );

  if (safe !== wanted || String(passNo) !== pass) {
    return <Navigate to={`/read/${passNo}/${safe}`} replace />;
  }

  return (
    <Reader
      index={safe}
      pass={passNo}
      onMove={go}
      quiz={passNo === 2 ? quiz : null}
      onAnswer={onAnswer}
      onSkip={onSkip}
      writing={passNo === 3 ? writing : null}
      onWrite={onWrite}
      translationFor={translator ? translator.line : undefined}
      saidIn={translator ? translator.said : undefined}
      wordIn={translator ? translator.word : undefined}
      onTap={onTap}
      lang={translator ? translator.lang : ''}
      muted={!settings.sound}
      rate={settings.pace}
      handIn={handIn}
    />
  );
}

function PractiseRoute() {
  const { book, id } = useBook();
  const ctx = useMemo(() => {
    /* The words this student looked up, newest first, rather than ten at
       random from the whole book. Three places in the app promised this
       and none of them did it: a student who tapped four words in part
       three was offered words from parts they had not reached, and told
       those were the ones they had chosen.

       A student who has tapped nothing still gets the whole glossary,
       because an empty practice screen is worse than an unfocused one. */
    const all = practiceSet(wordsOf(book), loadTapped(id));
    return { book, swaps: book.swaps, all };
  }, [book, id]);
  const [session, setSession] = useState(() => createSession(ctx));
  const onAnswer = useCallback(({ ok }) => setSession((s) => answer(s, ok)), []);
  const onNext = useCallback(() => setSession((s) => advance(ctx, s)), [ctx]);

  /* Somewhere to go from here, in both states. The trainer used to be a
     room with no door: the only way out was the browser's Back button,
     and on a tablet in a classroom that is not a way out. */
  const doors = (
    <p className="practise-doors">
      <Link className="btn ghost" to="/">
        ‹ Back to the start
      </Link>
      <Link className="btn ghost" to="/read/1/0">
        Back to the reading
      </Link>
    </p>
  );

  if (session.done) {
    return (
      <main className="done">
        <h1>Finished</h1>
        <p>
          {session.right} right{session.wrong ? `, ${session.wrong} to revisit` : ''}.
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

/**
 * The gate, with somewhere to carry on from.
 *
 * The panel was written and styled and had never appeared once, because
 * nothing recorded a position and nothing passed one in.
 */
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
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <GateRoute /> },
      { path: 'read/:pass/:beat', element: <ReadingRoute /> },
      { path: 'read/:pass', element: <Navigate to="/read/1/0" replace /> },
      { path: 'practise', element: <PractiseRoute /> },
      { path: 'class', element: <Class /> },
      { path: 'guide', element: <Guide /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

/**
 * The app, and the one place that decides which book it is.
 *
 * The routes above no longer name a book, and that is the point: none of
 * them can, because the router is a module constant built before any book
 * exists. So the book is held here, in state, and handed to the tree —
 * which is why the provider wraps the router rather than sitting inside
 * it. Inside, the routes would render outside the provider and see
 * nothing.
 *
 * `defaultBook` is what the reader opens with, exactly as before. There
 * is no way to change it yet and that is deliberate: choosing a book
 * needs somewhere to keep the choice, and the honest place is the URL —
 * a decision that belongs with the bookshelf, not ahead of it. Held as
 * state anyway, because that is the difference between "one book" and
 * "the first book", and it is the whole seam.
 */
function App() {
  const [book] = useState(defaultBook);
  return (
    <BookProvider book={book}>
      <RouterProvider router={router} />
    </BookProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
