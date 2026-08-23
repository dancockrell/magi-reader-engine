import { gradeWritten } from './grader.js';

/**
 * The two readings that ask for something back.
 *
 * Reading 2 is the quiz; Reading 3 is the writing. Both are pure state
 * here, so a whole student attempt can be played through in a test
 * without rendering anything — which is the only way to check that what
 * comes out the far end is what the gradebook expects.
 */

/** Every question in the book, in reading order. */
export function questionsOf(book) {
  const order = [...(book?.units || []).map((u) => u.id), ...Object.keys(book?.info || {})];
  const seen = new Set();
  const out = [];
  for (const unitId of order) {
    if (seen.has(unitId)) continue;
    seen.add(unitId);
    const t = book?.teaching?.[unitId];
    if (!t) continue;
    (t.mc || []).forEach((q, i) => {
      out.push({ kind: 'mc', id: `${unitId}#${i}`, unit: unitId, ...q });
    });
    if (t.recap) {
      out.push({ kind: 'recap', id: `${unitId}#recap`, unit: unitId, ...t.recap });
    }
  }
  return out;
}

/** Every written prompt in the book, in reading order. */
export function promptsOf(book) {
  const order = [...(book?.units || []).map((u) => u.id), ...Object.keys(book?.info || {})];
  const out = [];
  for (const unitId of order) {
    const sa = book?.teaching?.[unitId]?.sa;
    if (sa?.q) out.push({ id: unitId, unit: unitId, ...sa });
  }
  return out;
}

/* ------------------------------------------------------------------
   Reading 2 — the quiz
   ------------------------------------------------------------------ */

/**
 * @param {object} book
 * @param {{retry?: boolean}} [rules] the teacher's choice: a hint and one
 *   more try on a first wrong answer
 */
export function startQuiz(book, rules = {}) {
  return {
    questions: questionsOf(book),
    at: 0,
    answers: {},
    /* a second chance is offered once per question, not once per quiz */
    retrying: false,
    retry: !!rules.retry,
    startedAt: Date.now(),
    done: false,
  };
}

export const current = (quiz) => quiz.questions[quiz.at] || null;

/**
 * Answer the question in front of the student.
 *
 * A wrong first answer under "hints and one retry" does not record a
 * mark yet — it hands back a hint and the same question. The retry is
 * remembered on the answer so the gradebook can tell a first-time
 * correct answer from a second-time one, which is a real difference a
 * teacher should be able to see.
 */
export function answerQuestion(quiz, choice) {
  const q = current(quiz);
  if (!q || quiz.done) return quiz;

  const correct = choice === q.correct;

  if (!correct && quiz.retry && !quiz.retrying) {
    return { ...quiz, retrying: true };
  }

  const answers = {
    ...quiz.answers,
    [q.id]: {
      id: q.id,
      unit: q.unit,
      kind: q.kind,
      question: q.q,
      choice,
      chosenText: q.opts?.[choice] ?? '',
      correct,
      correctIndex: q.correct,
      correctText: q.opts?.[q.correct] ?? '',
      retried: quiz.retrying,
    },
  };

  const at = quiz.at + 1;
  return { ...quiz, answers, retrying: false, at, done: at >= quiz.questions.length };
}

/** Skip forward without answering — the question is left unanswered
 *  rather than silently marked wrong. */
export function skipQuestion(quiz) {
  if (quiz.done) return quiz;
  const at = quiz.at + 1;
  return { ...quiz, retrying: false, at, done: at >= quiz.questions.length };
}

export function quizScore(quiz) {
  const asked = quiz.questions.length;
  const answered = Object.values(quiz.answers);
  const right = answered.filter((a) => a.correct).length;
  return {
    right,
    asked,
    answered: answered.length,
    retried: answered.filter((a) => a.retried).length,
    percent: asked ? Math.round((right / asked) * 100) : 0,
  };
}

/* ------------------------------------------------------------------
   Reading 3 — the writing
   ------------------------------------------------------------------ */

export function startWriting(book) {
  return { prompts: promptsOf(book), at: 0, written: {}, startedAt: Date.now(), done: false };
}

export const currentPrompt = (w) => w.prompts[w.at] || null;

/** Keep what has been typed, without judging it yet. */
export function write(w, text) {
  const p = currentPrompt(w);
  if (!p) return w;
  return { ...w, written: { ...w.written, [p.id]: String(text ?? '') } };
}

export function moveWriting(w, delta) {
  const at = Math.max(0, Math.min(w.prompts.length - 1, w.at + delta));
  return { ...w, at, done: false };
}

export function finishWriting(w) {
  return { ...w, done: true };
}

/** What the grader made of each answer. */
export function writingReport(w) {
  return w.prompts.map((p) => ({
    id: p.id,
    unit: p.unit,
    question: p.q,
    answer: w.written[p.id] || '',
    grade: gradeWritten(w.written[p.id] || '', p),
  }));
}

/* ------------------------------------------------------------------
   What gets handed in
   ------------------------------------------------------------------ */

/**
 * Build the submission.
 *
 * The shape is not ours to choose: `parseSubmission` in the gradebook
 * already defines it, and it is what decides whether a mark lands in the
 * right column. In particular `score` is null for written work — the
 * questions there are marked by a person, and recording an "out of" for
 * them made the same questions count twice, so full marks came out at
 * 67%.
 *
 * @param {object} args
 */
export function buildSubmission({
  book,
  pass,
  student = {},
  quiz = null,
  writing = null,
  now = Date.now(),
}) {
  const minutes = (started) => (started ? Math.round((now - started) / 60000) : 0);

  if (pass === 2 && quiz) {
    const s = quizScore(quiz);
    return {
      assignment: `${book.meta.title} — Reading 2 Quiz`,
      pass: 2,
      className: student.cls || '',
      studentNo: student.no || '',
      realName: student.name || student.nick || '',
      nickname: student.nick || '',
      score: s.right,
      totalItems: s.asked,
      percent: s.percent,
      minutesSpent: minutes(quiz.startedAt),
      submittedAt: new Date(now).toISOString(),
      items: quiz.questions.map((q) => {
        const a = quiz.answers[q.id];
        return {
          kind: 'mc',
          id: q.id,
          segment: q.unit,
          question: q.q,
          chosenIndex: a ? a.choice : -1,
          chosenText: a ? a.chosenText : '',
          correctIndex: q.correct,
          correctText: q.opts?.[q.correct] ?? '',
          isCorrect: !!a?.correct,
          retried: !!a?.retried,
        };
      }),
    };
  }

  if (pass === 3 && writing) {
    const report = writingReport(writing);
    return {
      assignment: `${book.meta.title} — Reading 3 Written`,
      pass: 3,
      className: student.cls || '',
      studentNo: student.no || '',
      realName: student.name || student.nick || '',
      nickname: student.nick || '',
      /* marked by a person: no automatic score, and therefore no out of */
      score: null,
      totalItems: report.length,
      percent: null,
      minutesSpent: minutes(writing.startedAt),
      submittedAt: new Date(now).toISOString(),
      items: report.map((r) => ({
        kind: 'written',
        id: r.id,
        segment: r.unit,
        question: r.question,
        answer: r.answer,
        wordCount: r.grade.wordCount,
        keywordsHit: r.grade.coreHit.concat(r.grade.supportHit),
        coverage: r.grade.percent,
        band: r.grade.band,
      })),
    };
  }

  return null;
}
