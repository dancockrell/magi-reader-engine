import { pickKind, buildQuestion, shuffle } from './kinds.js';

/**
 * A practice session, as pure state transitions.
 *
 * The React version of this first computed the next question inside a
 * useMemo, which meant calling setState and mutating a word's `asked`
 * count during render. Both look harmless and both are wrong: useMemo is
 * allowed to run more than once for the same inputs — StrictMode does it
 * deliberately, and React may discard a memo under memory pressure — so
 * the counter over-counts, and setState during render is not permitted
 * at all. It is the kind of thing that works until a React upgrade.
 *
 * So no component decides anything. Each function here takes a session
 * and returns a new one, which makes the whole progression testable
 * without rendering, and leaves the component with nothing to get wrong.
 */

/** Two right answers in a row retires a word. */
export const RETIRE_AT = 2;

const copy = (item) => ({ ...item });

export function createSession(ctx, { size = 10, rng = Math.random } = {}) {
  const queue = shuffle(ctx.all || [], rng)
    .slice(0, size)
    .map(copy);
  return advance(
    ctx,
    {
      queue,
      lastKind: null,
      right: 0,
      wrong: 0,
      asked: 0,
      question: null,
      awaitingNext: false,
      done: queue.length === 0,
    },
    rng
  );
}

export function liveWords(session) {
  return session.queue.filter((i) => i.hits < RETIRE_AT);
}

/** Build the next question. Never called during render. */
export function advance(ctx, session, rng = Math.random) {
  const live = liveWords(session);
  if (!live.length) {
    return { ...session, question: null, awaitingNext: false, done: true };
  }
  const item = live[0];
  const kind = pickKind(ctx, item, live, session.lastKind, rng);

  /* the counter belongs to the transition, not to the render */
  const queue = session.queue.map((i) =>
    i.w === item.w ? { ...i, asked: (i.asked || 0) + 1 } : i
  );
  const asked = queue.find((i) => i.w === item.w);

  return {
    ...session,
    queue,
    lastKind: kind,
    question: buildQuestion(ctx, kind, asked, live, rng),
    awaitingNext: false,
    done: false,
  };
}

/**
 * Record an answer.
 *
 * A word answered wrongly goes to the BACK of the queue rather than
 * being dropped, and its streak resets — the point of the trainer is
 * that a word you missed comes round again in the same sitting.
 */
export function answer(session, ok) {
  if (!session.question || session.awaitingNext) return session;

  /* For odd-one-out the item under test is the intruder, not the word
     the session was walking towards. */
  const target = session.question.item?.w;
  let queue = session.queue.map((i) => {
    if (i.w !== target) return i;
    return ok ? { ...i, hits: (i.hits || 0) + 1 } : { ...i, hits: 0 };
  });

  if (!ok) {
    const moved = queue.find((i) => i.w === target);
    if (moved) queue = queue.filter((i) => i.w !== target).concat([moved]);
  }

  return {
    ...session,
    queue,
    right: session.right + (ok ? 1 : 0),
    wrong: session.wrong + (ok ? 0 : 1),
    asked: session.asked + 1,
    awaitingNext: true,
  };
}

/** What the progress line should say. */
export function progressOf(session) {
  const live = liveWords(session).length;
  return {
    label: `${live} to go`,
    score: session.wrong
      ? `${session.right} right · ${session.wrong} to revisit`
      : `${session.right} right`,
  };
}
