import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadAttempt,
  saveAttempt,
  clearAttempt,
  restoreQuiz,
  restoreWriting,
  snapshotQuiz,
  snapshotWriting,
} from './attempt.js';
import { startQuiz, current, answerQuestion, startWriting, write } from './assessment.js';

let book;
beforeAll(() => {
  book = JSON.parse(readFileSync('src/books/magi/book.json', 'utf8'));
});

/**
 * A localStorage that behaves, and one that does not.
 *
 * A whole Storage, not the three methods this happens to call: a partial
 * double is a promise that the code under test will never grow into the
 * rest of the interface, and that promise is not ours to make.
 *
 * @param {'ok'|'full'|'read-throws'} [behaviour]
 * @returns {Storage & {_map: Map<string,string>}}
 */
function fakeStore(behaviour = 'ok') {
  /** @type {Map<string,string>} */
  const map = new Map();
  return {
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    clear: () => map.clear(),
    getItem: (k) => {
      if (behaviour === 'read-throws') throw new Error('SecurityError');
      return map.has(k) ? map.get(k) : null;
    },
    setItem: (k, v) => {
      if (behaviour !== 'ok') throw new Error('QuotaExceededError');
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
    _map: map,
  };
}

describe('a device that will not save', () => {
  it('says so instead of pretending', () => {
    expect(saveAttempt('magi', 2, { answers: {} }, fakeStore('full'))).toBe(false);
  });

  it('does not take the reading down with it', () => {
    expect(loadAttempt('magi', 2, fakeStore('read-throws'))).toBeNull();
    expect(clearAttempt('magi', 2, fakeStore('read-throws'))).toBe(true);
  });
});

describe('what is in the store is input, not truth', () => {
  it('ignores junk left by something else', () => {
    const s = fakeStore();
    for (const junk of ['not json {', '"a string"', '[1,2,3]', 'null', '42']) {
      s._map.set('raven.attempt.v2.magi.2', junk);
      expect(loadAttempt('magi', 2, s)).toBeNull();
    }
  });

  it('ignores an answers field that is not answers', () => {
    const s = fakeStore();
    s._map.set('raven.attempt.v2.magi.2', JSON.stringify({ answers: ['a', 'b'] }));
    expect(loadAttempt('magi', 2, s)).toBeNull();
  });
});

describe('picking a quiz back up', () => {
  it('keeps the answers already given', () => {
    let q = startQuiz(book);
    const first = current(q);
    q = answerQuestion(q, first.correct);
    const second = current(q);
    q = answerQuestion(q, second.correct);

    const back = restoreQuiz(book, {}, snapshotQuiz(q));
    expect(Object.keys(back.answers)).toHaveLength(2);
    expect(back.answers[first.id].correct).toBe(true);
  });

  it('resumes at the next unanswered question, not at the beginning', () => {
    let q = startQuiz(book);
    for (let n = 0; n < 3; n++) q = answerQuestion(q, current(q).correct);
    expect(restoreQuiz(book, {}, snapshotQuiz(q)).at).toBe(3);
  });

  it('keeps the clock running, so the time spent is the real time spent', () => {
    const q = startQuiz(book);
    expect(restoreQuiz(book, {}, snapshotQuiz(q)).startedAt).toBe(q.startedAt);
  });

  it('takes its questions from the book, never from the store', () => {
    /* a saved attempt must not resurrect a question that has been
       edited out of the book since */
    const back = restoreQuiz(
      book,
      {},
      {
        answers: { 'ghost#9': { correct: true }, 'also#gone': { correct: true } },
        questions: [
          { id: 'ghost#9', q: 'a question that no longer exists', opts: [], correct: 0 },
        ],
      }
    );
    expect(back.questions.some((q) => q.id === 'ghost#9')).toBe(false);
    expect(back.answers['ghost#9']).toBeUndefined();
    expect(back.at).toBe(0);
  });

  it('starts fresh when there is nothing stored', () => {
    expect(restoreQuiz(book, {}, null).at).toBe(0);
    expect(restoreQuiz(book, {}, {}).answers).toEqual({});
  });

  it('is finished if every question was answered', () => {
    let q = startQuiz(book);
    while (!q.done) q = answerQuestion(q, current(q).correct);
    expect(restoreQuiz(book, {}, snapshotQuiz(q)).done).toBe(true);
  });
});

describe('picking writing back up', () => {
  it('keeps what was typed', () => {
    let w = startWriting(book);
    w = write(w, 'She sold her hair.');
    const back = restoreWriting(book, snapshotWriting(w));
    expect(back.written[w.prompts[0].id]).toBe('She sold her hair.');
  });

  it('drops anything that is not text, and prompts that are gone', () => {
    const back = restoreWriting(book, { written: { gone: 'x', bad: 12 } });
    expect(back.written).toEqual({});
  });
});

describe('round trip through a real store', () => {
  it('survives being written and read back', () => {
    const s = fakeStore();
    let q = startQuiz(book);
    q = answerQuestion(q, current(q).correct);

    expect(saveAttempt('magi', 2, snapshotQuiz(q), s)).toBe(true);
    const back = restoreQuiz(book, {}, loadAttempt('magi', 2, s));
    expect(back.at).toBe(1);

    clearAttempt('magi', 2, s);
    expect(loadAttempt('magi', 2, s)).toBeNull();
  });

  it('keeps the two readings apart', () => {
    const s = fakeStore();
    saveAttempt('magi', 2, { answers: { a: 1 } }, s);
    saveAttempt('magi', 3, { written: { b: 'x' } }, s);
    expect(loadAttempt('magi', 2, s).answers).toEqual({ a: 1 });
    expect(loadAttempt('magi', 3, s).written).toEqual({ b: 'x' });
  });

  it('keeps two books apart, because this reader is meant to hold more than one', () => {
    const s = fakeStore();
    saveAttempt('magi', 2, { answers: { a: 1 } }, s);
    saveAttempt('other', 2, { answers: { z: 9 } }, s);
    expect(loadAttempt('magi', 2, s).answers).toEqual({ a: 1 });
  });
});
