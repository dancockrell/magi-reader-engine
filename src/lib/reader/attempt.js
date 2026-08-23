import { startQuiz, startWriting } from './assessment.js';

/**
 * Keeping a half-finished attempt.
 *
 * A tablet sleeps, a lesson ends, a browser is closed by a child who
 * meant to press something else. None of that should cost a student
 * twenty minutes of work, and none of it should be their problem to
 * explain. So the answers are written down as they are given, and the
 * next visit picks up where they were.
 *
 * Two things this deliberately does not do. It does not store anything
 * that identifies a student, because the device is shared. And it never
 * throws — a locked or full store means the work is not saved, which is
 * a bad day, not a broken app.
 */

export const KEY = 'raven.attempt.v2';

const keyFor = (bookId, pass) => `${KEY}.${bookId || 'book'}.${pass}`;

/** Is this a shape we wrote, rather than whatever else is in the store? */
function usable(v) {
  return (
    !!v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    (v.answers === undefined || (typeof v.answers === 'object' && !Array.isArray(v.answers))) &&
    (v.written === undefined || (typeof v.written === 'object' && !Array.isArray(v.written)))
  );
}

/** @param {Storage} [store] */
export function loadAttempt(bookId, pass, store) {
  try {
    const s = store ?? globalThis.localStorage;
    const raw = JSON.parse(s.getItem(keyFor(bookId, pass)) || 'null');
    return usable(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** @returns {boolean} whether it stuck */
export function saveAttempt(bookId, pass, data, store) {
  try {
    const s = store ?? globalThis.localStorage;
    s.setItem(keyFor(bookId, pass), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearAttempt(bookId, pass, store) {
  try {
    (store ?? globalThis.localStorage).removeItem(keyFor(bookId, pass));
    return true;
  } catch {
    return false;
  }
}

/**
 * Rebuild a quiz from what was stored.
 *
 * The questions come from the book, never from the store: a saved
 * attempt from before an edit must not resurrect a question that has
 * been changed or removed. Only the answers are restored, and only for
 * questions that still exist.
 */
export function restoreQuiz(book, rules, stored) {
  const quiz = startQuiz(book, rules);
  if (!stored?.answers) return quiz;

  const live = new Set(quiz.questions.map((q) => q.id));
  const answers = {};
  for (const [id, a] of Object.entries(stored.answers)) {
    if (live.has(id) && a && typeof a === 'object') answers[id] = a;
  }

  /* Resume at the first question with no answer, so a student is not
     asked again about the ones they have done. */
  const at = quiz.questions.findIndex((q) => !answers[q.id]);
  const resume = at === -1 ? quiz.questions.length : at;

  return {
    ...quiz,
    answers,
    at: resume,
    done: resume >= quiz.questions.length,
    startedAt: Number(stored.startedAt) || quiz.startedAt,
  };
}

export function restoreWriting(book, stored) {
  const w = startWriting(book);
  if (!stored?.written) return w;

  const live = new Set(w.prompts.map((p) => p.id));
  const written = {};
  for (const [id, text] of Object.entries(stored.written)) {
    if (live.has(id) && typeof text === 'string') written[id] = text;
  }
  return { ...w, written, startedAt: Number(stored.startedAt) || w.startedAt };
}

/** What is worth writing down: the answers, and when they started. */
export const snapshotQuiz = (quiz) => ({ answers: quiz.answers, startedAt: quiz.startedAt });
export const snapshotWriting = (w) => ({ written: w.written, startedAt: w.startedAt });
