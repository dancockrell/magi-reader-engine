import { safeApi } from './key.js';
import { cleanName, cleanNumber } from './student.js';

/**
 * Is this number already on the teacher's list?
 *
 * A class of thirty will produce three students called Kevin, one who
 * types "aaaa", one who taps a friend's name for a laugh, and one who
 * joins twenty minutes late. A number solves most of that, and a
 * confirmation step solves the rest — so the only thing this asks is
 * "who is number seven in 1-A", and the only thing it does with the
 * answer is offer it back to the student to accept or refuse.
 *
 * THE RULE THAT MATTERS MORE THAN THE FEATURE:
 *
 *   No roster configured is the same situation as no network. There is
 *   nothing to check against, so take their details rather than telling
 *   thirty students in a row that they do not exist.
 *
 * Unconfigured, offline, slow, a body that is not JSON, an HTTP error,
 * a class with no roster row: every one of them ends the same way, with
 * the student signing in as whatever they typed. This is a convenience
 * that catches typos and duplicate names. It is not an authorisation
 * gate, and a student must always be able to hand work in.
 *
 * That is why the outcome is a small closed set rather than a name or
 * null: the caller has to say what it does with each one, and a new
 * failure mode cannot quietly arrive wearing the same clothes as a
 * refusal.
 */

/** Six seconds, as the prototype had it. Long enough for school wifi on
 *  a bad morning, short enough that nobody thinks the app has died. */
export const TIMEOUT_MS = 6_000;

/**
 * @typedef {'found'|'not-found'|'unconfigured'|'offline'|'slow'|'malformed'} Outcome
 *
 * found        the class list has a student with this number
 * not-found    a list came back, and nobody on it has this number
 * unconfigured no endpoint, or a list with nobody in it — there is
 *              simply nothing to check against
 * offline      the request could not be made, or the server refused it
 * slow         no answer inside the timeout
 * malformed    an answer arrived and it was not a class list
 */

/**
 * @typedef {object} RosterMatch
 * @property {string} no
 * @property {string} name
 * @property {string} nick
 */

/**
 * @typedef {object} RosterAnswer
 * @property {Outcome} outcome
 * @property {RosterMatch|null} match
 */

/** @param {Outcome} outcome @returns {RosterAnswer} */
const nobody = (outcome) => ({ outcome, match: null });

/**
 * The one question the form asks of an answer: is there a name here to
 * put in front of the student?
 *
 * Everything else — every failure, and a list that simply does not have
 * them on it — is false, and false means "carry on with what they
 * typed". There is deliberately no `blocked` or `refused` to check,
 * because there is no outcome that refuses anybody.
 *
 * @param {RosterAnswer|null|undefined} answer
 */
export const hasMatch = (answer) => answer?.outcome === 'found' && !!answer.match;

/**
 * Two student numbers that mean the same student.
 *
 * "07" is not 7 — it is the seventh student, and it stays a string
 * everywhere else in this app for exactly that reason. But a teacher
 * whose spreadsheet dropped the zero has still written down the same
 * child, so the comparison forgives the zeros that the storage does
 * not. Case too: some schools number students 7A, 7a.
 *
 * @param {unknown} a @param {unknown} b
 */
export function sameNumber(a, b) {
  const norm = (v) =>
    cleanNumber(v)
      .toLowerCase()
      .replace(/^0+(?=.)/, '');
  const x = norm(a);
  const y = norm(b);
  return !!x && x === y;
}

/**
 * Find one student in a class list.
 *
 * Pure, so the interesting half of this file needs no network at all to
 * test. Rows are what the Sheet's Roster tab produces:
 * `{ studentNo, nickname, realName }`.
 *
 * @param {unknown} list
 * @param {unknown} no
 * @returns {RosterMatch|null}
 */
export function matchIn(list, no) {
  if (!Array.isArray(list)) return null;
  for (const row of list) {
    if (!row || typeof row !== 'object') continue;
    if (!sameNumber(row.studentNo, no)) continue;
    /* The real name is what a gradebook is read down; the nickname is
       what a teacher says out loud. Either may be the only one filled
       in, and neither is allowed to arrive empty. */
    const name = cleanName(row.realName) || cleanName(row.nickname);
    const nick = cleanName(row.nickname) || name;
    if (!name) continue;
    return { no: cleanNumber(row.studentNo) || cleanNumber(no), name, nick };
  }
  return null;
}

/**
 * Where the class list lives.
 *
 * `page=roster`, which is the route the backend in this repository
 * actually serves and the one the prototype's Apps Script served too.
 * The prototype's client asked for `page=lookup`, a route no deployment
 * has ever answered — it would have failed on every device and fallen
 * through to "take their details", which is why nobody noticed.
 *
 * @param {string} api @param {string} cls
 */
export function rosterUrl(api, cls) {
  const join = api.includes('?') ? '&' : '?';
  return `${api}${join}page=roster&class=${encodeURIComponent(cls || '')}`;
}

/**
 * Read whatever came back.
 *
 * Two shapes are understood, because two backends exist: a class list
 * (what `page=roster` returns), and the prototype's single-student
 * `{ found: true, ... }`. Anything else is malformed rather than
 * empty — "I could not read this" and "there is nobody here" lead to
 * the same place for the student, but they are different bugs for
 * whoever has to fix one.
 *
 * @param {unknown} body @param {unknown} no @returns {RosterAnswer}
 */
export function readAnswer(body, no) {
  if (Array.isArray(body)) {
    /* An empty list is a teacher who keeps no roster, or a class that
       is not on it. Nothing to check against — same as unconfigured. */
    if (!body.length) return nobody('unconfigured');
    const match = matchIn(body, no);
    return match ? { outcome: 'found', match } : nobody('not-found');
  }

  if (body && typeof body === 'object') {
    const one = /** @type {any} */ (body);
    if (one.found === false) return nobody('not-found');
    if (one.found === true) {
      const match = matchIn([{ studentNo: one.studentNo ?? no, ...one }], no);
      return match ? { outcome: 'found', match } : nobody('malformed');
    }
  }

  return nobody('malformed');
}

/**
 * Ask the class list who this is.
 *
 * The fetch and the clock are both injected, so every failure path
 * below is a test rather than a story about one. Nothing here throws:
 * the caller gets an outcome whatever happens, because the caller's
 * only correct response to a failure is to carry on.
 *
 * @param {string} api
 * @param {{cls?: string, no?: string}} who
 * @param {{fetch?: typeof globalThis.fetch|null, timeout?: number,
 *          timers?: {set: (fn: () => void, ms: number) => any,
 *                    clear: (handle: any) => void}}} [opts]
 * @returns {Promise<RosterAnswer>}
 */
export async function lookupStudent(api, who, opts = {}) {
  /* `!== undefined` and not `||`: passing null explicitly means "there
     is no network here", and falling back to the global one would put a
     real request on the wire from a test that asked for none. */
  const doFetch = opts.fetch !== undefined ? opts.fetch : globalThis.fetch;
  const timeout = opts.timeout ?? TIMEOUT_MS;
  const timers = opts.timers ?? {
    set: (fn, ms) => setTimeout(fn, ms),
    clear: (h) => clearTimeout(h),
  };

  const no = cleanNumber(who?.no);
  const cls = cleanName(who?.cls);

  /* Nothing to ask, or nowhere to ask it. Checked here as well as at
     the call site: this is the function that puts a class name on the
     wire, so it does not take anybody's word for the address. */
  if (!safeApi(api) || !no) return nobody('unconfigured');
  if (!doFetch) return nobody('offline');

  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  let handle = null;
  let timedOut = false;

  /* Raced rather than relied on: a fetch that ignores its abort signal
     would otherwise hang the sign-in button for as long as it liked,
     and the student is standing there. The timeout is the promise, so
     the answer arrives at six seconds whatever the network does. */
  const deadline = new Promise((resolve) => {
    handle = timers.set(() => {
      timedOut = true;
      try {
        ctl?.abort();
      } catch {
        /* an abort that fails changes nothing: the race is already lost
           and the answer below is 'slow' either way */
      }
      resolve(nobody('slow'));
    }, timeout);
  });

  const ask = (async () => {
    try {
      const res = await doFetch(rosterUrl(api, cls), { signal: ctl?.signal });
      /* An HTTP error is a roster we could not reach. It is not a
         student who does not exist, and must never read as one. */
      if (res && res.ok === false) return nobody('offline');
      const text = await res.text();
      try {
        return readAnswer(JSON.parse(text), no);
      } catch {
        /* A login wall, a redirect page, an Apps Script stack trace:
           HTML where a class list should be. */
        return nobody('malformed');
      }
    } catch {
      /* Including our own abort, which the race has already answered. */
      return timedOut ? nobody('slow') : nobody('offline');
    }
  })();

  try {
    return await Promise.race([ask, deadline]);
  } finally {
    timers.clear(handle);
  }
}
