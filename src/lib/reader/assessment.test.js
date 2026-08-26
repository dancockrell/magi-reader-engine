import { describe, it, expect } from 'vitest';
import book from '../../books/fixture/index.js';
import {
  questionsOf,
  promptsOf,
  startQuiz,
  current,
  answerQuestion,
  skipQuestion,
  quizScore,
  startWriting,
  write,
  moveWriting,
  writingReport,
  buildSubmission,
} from './assessment.js';
import { gradeWritten, segments, words, looksForeign } from './grader.js';
import { parseSubmission, autoColumns } from '../gradebook/submission.js';

/* The engine's own fixture book. Whether the shipping pack has enough
   questions to be a real assessment is a fact about that pack, and
   `extracted.test.js` checks it. What is checked here is that the engine
   finds every question a pack carries, whatever pack it is handed. */

describe('the questions in the book', () => {
  it('finds every question the book carries, including the recaps', () => {
    /* Counted back off the raw teaching layer rather than written down,
       because the failure this guards is questionsOf skipping a shape —
       a recap, or a part that is taught but not read aloud. */
    const expected = Object.values(book.teaching).reduce(
      (n, t) => n + (t.mc?.length || 0) + (t.recap ? 1 : 0),
      0
    );
    const qs = questionsOf(book);
    expect(qs).toHaveLength(expected);
    expect(expected, 'a book with nothing in it would pass too').toBeGreaterThan(10);
    expect(qs.some((q) => q.kind === 'recap')).toBe(true);

    const prompts = promptsOf(book);
    expect(prompts).toHaveLength(Object.values(book.teaching).filter((t) => t.sa?.q).length);
    expect(prompts.length).toBeGreaterThan(1);
  });

  it('asks about material that is taught but never read aloud', () => {
    /* The background pages are not units. Losing their questions is
       silent: the reading still works and the marks quietly do not add
       up. */
    const asked = new Set(questionsOf(book).map((q) => q.unit));
    for (const id of Object.keys(book.info)) expect(asked.has(id), id).toBe(true);
  });

  it('gives every question a unique id', () => {
    const ids = questionsOf(book).map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps them in reading order', () => {
    const unitOrder = book.units.map((u) => u.id);
    const seen = questionsOf(book)
      .map((q) => q.unit)
      .filter((u, i, a) => a.indexOf(u) === i)
      .filter((u) => unitOrder.includes(u));
    expect(seen).toEqual(unitOrder.filter((u) => seen.includes(u)));
  });
});

describe('the quiz', () => {
  it('marks a right answer and moves on', () => {
    let q = startQuiz(book);
    const first = current(q);
    q = answerQuestion(q, first.correct);
    expect(q.at).toBe(1);
    expect(quizScore(q).right).toBe(1);
  });

  it('marks a wrong answer wrong when there is no retry', () => {
    let q = startQuiz(book, { retry: false });
    const first = current(q);
    q = answerQuestion(q, (first.correct + 1) % first.opts.length);
    expect(quizScore(q).right).toBe(0);
    expect(q.at).toBe(1);
  });

  describe('hints and one retry', () => {
    it('offers the question again instead of marking it', () => {
      let q = startQuiz(book, { retry: true });
      const first = current(q);
      q = answerQuestion(q, (first.correct + 1) % first.opts.length);

      expect(q.retrying).toBe(true);
      expect(q.at).toBe(0);
      expect(current(q).id).toBe(first.id);
      expect(quizScore(q).answered).toBe(0);
    });

    it('records the second answer, and that it was a second answer', () => {
      let q = startQuiz(book, { retry: true });
      const first = current(q);
      q = answerQuestion(q, (first.correct + 1) % first.opts.length);
      q = answerQuestion(q, first.correct);

      const a = q.answers[first.id];
      expect(a.correct).toBe(true);
      expect(a.retried, 'a teacher should see it took two goes').toBe(true);
      expect(q.at).toBe(1);
    });

    it('gives one more try per question, not one per quiz', () => {
      let q = startQuiz(book, { retry: true });
      const a = current(q);
      q = answerQuestion(q, (a.correct + 1) % a.opts.length);
      q = answerQuestion(q, a.correct);

      const b = current(q);
      q = answerQuestion(q, (b.correct + 1) % b.opts.length);
      expect(q.retrying, 'the second question gets its own retry').toBe(true);
    });
  });

  it('leaves a skipped question unanswered rather than marking it wrong', () => {
    let q = startQuiz(book);
    const first = current(q);
    q = skipQuestion(q);
    expect(q.answers[first.id]).toBeUndefined();
    expect(quizScore(q).answered).toBe(0);
    expect(quizScore(q).asked).toBeGreaterThan(0);
  });

  it('finishes, and cannot be answered past the end', () => {
    let q = startQuiz(book);
    let guard = 0;
    while (!q.done && guard++ < 500) q = answerQuestion(q, current(q).correct);
    expect(q.done).toBe(true);
    const after = answerQuestion(q, 0);
    expect(after).toBe(q);
  });

  it('scores a perfect run at 100', () => {
    let q = startQuiz(book);
    while (!q.done) q = answerQuestion(q, current(q).correct);
    expect(quizScore(q).percent).toBe(100);
  });
});

describe('the writing', () => {
  it('keeps what is typed, per prompt', () => {
    let w = startWriting(book);
    const first = w.prompts[0];
    w = write(w, 'The stair was dark and cold.');
    expect(w.written[first.id]).toBe('The stair was dark and cold.');

    w = moveWriting(w, 1);
    w = write(w, 'Something else.');
    expect(w.written[first.id], 'the first answer is still there').toBe(
      'The stair was dark and cold.'
    );
  });

  it('does not run off either end', () => {
    let w = startWriting(book);
    w = moveWriting(w, -5);
    expect(w.at).toBe(0);
    w = moveWriting(w, 9999);
    expect(w.at).toBe(w.prompts.length - 1);
  });

  it('reports on every prompt, answered or not', () => {
    const w = startWriting(book);
    const report = writingReport(w);
    expect(report).toHaveLength(w.prompts.length);
    expect(report[0].grade.wordCount).toBe(0);
  });
});

describe('what the grader does with an answer', () => {
  const spec = {
    core: [['hair', 'tresses'], 'sold'],
    support: ['twenty dollars'],
    minWords: 8,
  };

  it('finds an idea however the student spelled it', () => {
    const a = gradeWritten('She sold her hair for money because she loved him.', spec);
    const b = gradeWritten('She sold her tresses for money because she loved him.', spec);
    expect(a.coreHit).toEqual(['hair', 'sold']);
    expect(b.coreHit).toEqual(['hair', 'sold']);
  });

  it('accepts the endings students actually write', () => {
    expect(gradeWritten('she is selling and it sold', { core: ['sell'] }).coreHit).toEqual([
      'sell',
    ]);
  });

  it('does not count a longer, different word', () => {
    /* "sell" must not match "seller" as if it were the same idea */
    expect(gradeWritten('the seller was kind', { core: ['sell'] }).coreHit).toEqual([]);
  });

  it('bands a full answer high and an empty one low', () => {
    expect(
      gradeWritten('She sold her hair for twenty dollars to buy him a chain.', spec).band
    ).toBe('high');
    expect(gradeWritten('', spec).band).toBe('low');
  });

  it('says an answer is too short rather than guessing at it', () => {
    expect(gradeWritten('hair', spec).tooShort).toBe(true);
  });

  describe('an opinion question keeps its promise', () => {
    const opinion = { core: ['love', 'gift'], minWords: 10, opinion: true };

    it('does not punish a student for answering in their own words', () => {
      const g = gradeWritten(
        'I think they were silly but it shows how much they cared about each other really.',
        opinion
      );
      expect(g.band).not.toBe('low');
    });

    it('rewards touching any of the ideas, not all of them', () => {
      const one = gradeWritten(
        'It is about love and how people show it when they have nothing at all.',
        opinion
      );
      expect(one.band).toBe('high');
    });
  });

  describe('an answer in another language', () => {
    it('is reported as foreign, not as weak', () => {
      /* norm() deletes non-Latin text, so this would otherwise band "low"
         as though the student had written nothing */
      const g = gradeWritten('그녀는 사랑 때문에 머리카락을 팔았습니다.', spec);
      expect(g.foreign).toBe(true);
      expect(g.band).toBe('foreign');
    });

    it('does not mistake an English answer with one accent for foreign', () => {
      expect(looksForeign('She sold her hair — naïvely, perhaps, but for love.')).toBe(false);
    });
  });

  it('counts words the way a person would', () => {
    expect(words('  She   sold her hair.  ')).toHaveLength(4);
    expect(words('')).toHaveLength(0);
  });
});

describe('highlighting the matched terms', () => {
  it('splits the answer around what matched', () => {
    const segs = segments('She sold her hair today', ['sold', 'hair']);
    expect(segs.filter((s) => s.hit).map((s) => s.text)).toEqual(['sold', 'hair']);
    expect(segs.map((s) => s.text).join('')).toBe('She sold her hair today');
  });

  it('never nests overlapping synonyms', () => {
    const segs = segments('the shadows moved', ['shadow', 'shadows']);
    expect(segs.filter((s) => s.hit)).toHaveLength(1);
    expect(segs.map((s) => s.text).join('')).toBe('the shadows moved');
  });

  it('returns the text unchanged when nothing matched', () => {
    expect(segments('nothing here', ['absent'])).toEqual([
      { text: 'nothing here', hit: false },
    ]);
  });

  it('never loses or invents a character', () => {
    const text = 'She sold her hair, and her tresses were gone.';
    for (const terms of [[], ['hair'], ['hair', 'tresses', 'sold']]) {
      expect(
        segments(text, terms)
          .map((s) => s.text)
          .join('')
      ).toBe(text);
    }
  });
});

describe('what is handed in', () => {
  const student = { cls: '1-A', no: '01', name: 'Ana Lopez', nick: 'Ana' };

  it('a quiz submission satisfies the gradebook contract', () => {
    let quiz = startQuiz(book);
    while (!quiz.done) quiz = answerQuestion(quiz, current(quiz).correct);

    const payload = buildSubmission({ book, pass: 2, student, quiz });
    const row = parseSubmission(payload);

    expect(row).not.toBeNull();
    expect(row.name).toBe('Ana Lopez');
    expect(row.scoreNum).toBe(quiz.questions.length);
    expect(row.totalNum).toBe(quiz.questions.length);
    expect(row.percentNum).toBe(100);
  });

  it('a written submission carries no automatic score, so nothing is counted twice', () => {
    /* the defect that capped perfect written work at 67% */
    let w = startWriting(book);
    w = write(w, 'She lit it because nobody else was going to light it that winter.');

    const payload = buildSubmission({ book, pass: 3, student, writing: w });
    expect(payload.score).toBeNull();
    expect(autoColumns(payload)).toEqual({ score: '', outOf: '', percent: '' });

    const row = parseSubmission(payload);
    expect(row.scoreNum).toBe('');
    expect(row.totalNum).toBe('');
  });

  it('carries the actual writing, so a teacher can read it', () => {
    let w = startWriting(book);
    w = write(w, 'Because she had nothing else to give.');
    const payload = buildSubmission({ book, pass: 3, student, writing: w });
    const written = payload.items.filter((i) => i.answer);
    expect(written.length).toBeGreaterThan(0);
    expect(written[0].answer).toBe('Because she had nothing else to give.');
  });

  it('records a retry, so a teacher can see it took two goes', () => {
    let quiz = startQuiz(book, { retry: true });
    const first = current(quiz);
    quiz = answerQuestion(quiz, (first.correct + 1) % first.opts.length);
    quiz = answerQuestion(quiz, first.correct);
    while (!quiz.done) quiz = answerQuestion(quiz, current(quiz).correct);

    const payload = buildSubmission({ book, pass: 2, student, quiz });
    expect(payload.items.filter((i) => i.retried)).toHaveLength(1);
    expect(parseSubmission(payload).retried).toBe(1);
  });

  it('reports an unanswered question as unanswered, not as wrong', () => {
    let quiz = startQuiz(book);
    quiz = skipQuestion(quiz);
    while (!quiz.done) quiz = answerQuestion(quiz, current(quiz).correct);

    const payload = buildSubmission({ book, pass: 2, student, quiz });
    const skipped = payload.items.find((i) => i.chosenIndex === -1);
    expect(skipped).toBeDefined();
    expect(skipped.isCorrect).toBe(false);
    expect(skipped.chosenText).toBe('');
  });

  it('gives nothing back for a reading that asks nothing', () => {
    expect(buildSubmission({ book, pass: 1 })).toBeNull();
  });
});
