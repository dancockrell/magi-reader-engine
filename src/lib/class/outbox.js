/**
 * Work that has not reached the teacher yet.
 *
 * A classroom is thirty tablets on one access point, and the moment
 * every one of them hands in is the moment the network is worst. So a
 * hand-in is written down first and sent afterwards, and if the send
 * fails it stays written down and goes next time.
 *
 * What this deliberately does NOT do is tell the student about it. That
 * decision came from the classroom rather than from the code: a child
 * who is told "your work did not go through" cannot do anything about
 * it, will not understand it, and will either panic or — worse — hand
 * in again and again. They see it being sent, and then they see it
 * done. The retry is ours, quietly.
 *
 * A teacher, who can act on it, is told exactly how many are waiting.
 */

export const KEY = 'reader.outbox.v1';

/** Enough for a lesson's worth of work from one device, and small
 *  enough that localStorage will not refuse it. */
export const LIMIT = 40;

const keyFor = (bookId) => `${KEY}.${bookId || 'book'}`;

/** @param {Storage} [store] @returns {{id:string, at:number, tries:number, payload:any}[]} */
export function loadOutbox(bookId, store) {
  try {
    const raw = JSON.parse(
      (store ?? globalThis.localStorage).getItem(keyFor(bookId)) || 'null'
    );
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (e) => e && typeof e === 'object' && e.payload && typeof e.id === 'string'
    );
  } catch {
    return [];
  }
}

/** @returns {boolean} whether it stuck */
export function saveOutbox(bookId, items, store) {
  try {
    (store ?? globalThis.localStorage).setItem(
      keyFor(bookId),
      JSON.stringify(items.slice(-LIMIT))
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Put a hand-in in the queue.
 *
 * Keyed by student, reading and book, so handing the same reading in
 * twice replaces rather than queues twice — a student who presses the
 * button again because nothing visibly happened should not produce two
 * rows for a teacher to reconcile.
 */
export function queueKey(payload) {
  return [payload?.className, payload?.studentNo, payload?.realName, payload?.pass]
    .map((p) => String(p ?? ''))
    .join('|');
}

/**
 * @param {{id:string,at:number,tries:number,payload:any}[]} items
 * @param {any} payload
 * @param {{now?: number}} [opts]
 */
export function queue(items, payload, { now = Date.now() } = {}) {
  const id = queueKey(payload);
  const without = items.filter((e) => e.id !== id);
  return [...without, { id, at: now, tries: 0, payload }].slice(-LIMIT);
}

/** It reached the teacher. Take it out. */
export function drop(items, id) {
  return items.filter((e) => e.id !== id);
}

/** It did not. Count the attempt, so a teacher can see one that is stuck. */
export function missed(items, id) {
  return items.map((e) => (e.id === id ? { ...e, tries: e.tries + 1 } : e));
}

/**
 * Send everything waiting, oldest first.
 *
 * Sequential rather than parallel: thirty tablets that all fire six
 * requests at once is the thing that made the network bad in the first
 * place. Stops at the first failure and keeps the rest for next time —
 * if one send failed, the next one is very likely to as well, and
 * hammering it helps nobody.
 *
 * @param {{id:string,at:number,tries:number,payload:any}[]} items
 * @param {(payload:any) => Promise<boolean>} send
 * @returns {Promise<{items:any[], sent:number, failed:number}>}
 */
export async function flush(items, send) {
  let rest = [...items];
  let sent = 0;

  for (const entry of items) {
    let ok = false;
    try {
      ok = await send(entry.payload);
    } catch {
      ok = false;
    }
    if (!ok) {
      rest = missed(rest, entry.id);
      return { items: rest, sent, failed: rest.length };
    }
    rest = drop(rest, entry.id);
    sent += 1;
  }
  return { items: rest, sent, failed: 0 };
}

/** What a teacher is told: a count, and the oldest one waiting. */
export function waiting(items) {
  if (!items.length) return { count: 0, oldest: null, stuck: 0 };
  const oldest = items.reduce((a, b) => (a.at <= b.at ? a : b));
  return {
    count: items.length,
    oldest: oldest.at,
    /* tried several times and still here — that is a broken Sheet link,
       not a bad minute of wifi, and it needs a person */
    stuck: items.filter((e) => e.tries >= 3).length,
  };
}
