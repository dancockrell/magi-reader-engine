/**
 * Who is handing this in.
 *
 * Four fields, and every one of them ends up in a gradebook a teacher
 * has to read down at speed: class, number, real name, and what they
 * like to be called. Getting them clean at the door is much cheaper than
 * getting them clean out of thirty rows afterwards.
 *
 * The number is a string and stays one. "07" is not 7 — it is the
 * seventh student, and a spreadsheet that helpfully drops the zero has
 * renamed a child.
 */

export const KEY = 'raven.student.v1';

/** As long as a name gets to be. Longer than any real one, short enough
 *  that a column stays readable. */
export const MAX_NAME = 40;

/**
 * What goes into the header, the payload and the filename: printable,
 * bounded, and none of the invisible characters that make a name look
 * fine on screen and wrong everywhere else.
 *
 * @param {unknown} text
 */
export function cleanName(text) {
  return (
    String(text ?? '')
      /* Control characters, the zero-width family, the bidi overrides,
         and the variation selectors. Written as escapes on purpose:
         every one of these is invisible, and a class of literal
         invisible characters is a line nobody can review.

         The two rules disabled below are both warning about exactly
         what this is for: control characters in a class is the point,
         and "misleading character class" is the variation selectors,
         which combine — which is why they are being removed. */
      // eslint-disable-next-line no-control-regex, no-misleading-character-class
      .replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\ufe0e\ufe0f\ufeff]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_NAME)
  );
}

/** The student number: digits and the dashes some schools use, nothing
 *  else, and the leading zeros kept. */
export function cleanNumber(text) {
  return String(text ?? '')
    .replace(/[^\dA-Za-z-]/g, '')
    .trim()
    .slice(0, 12);
}

/**
 * Is this obviously not a name?
 *
 * Not a spell-check — a filter for the back row. It has to say yes to a
 * Thai, Japanese, Korean or Russian name, because this reader ships in
 * ten languages and those are real names; "has no letters in any
 * alphabet at all" is the test that gets that right.
 *
 * @param {unknown} text
 */
export function looksLikeJunk(text) {
  const t = String(text ?? '').trim();
  if (t.length < 2) return true;
  /* aaaa, 1111, .... */
  if (/^(.)\1+$/u.test(t.replace(/\s/g, ''))) return true;
  if (/^(asdf|qwer|zxcv|test|abc|xyz|none|n\/?a|nil|null|undefined)$/i.test(t)) return true;
  /* no letters at all, in any alphabet */
  if (!/\p{L}/u.test(t)) return true;
  return false;
}

/**
 * @typedef {object} Student
 * @property {string} cls
 * @property {string} no
 * @property {string} name
 * @property {string} nick
 */

/** @returns {Student} */
export function normaliseStudent(input) {
  const nick = cleanName(input?.nick);
  const name = cleanName(input?.name);
  return {
    cls: cleanName(input?.cls),
    no: cleanNumber(input?.no),
    name,
    /* Nobody has to invent a nickname. Left empty it is their name, which
       is what a teacher would call them anyway. */
    nick: nick || name,
  };
}

/**
 * What is wrong with it, in words a student can act on.
 *
 * Returned per field rather than as one message, so the form can point
 * at the box rather than making them guess which of four it means.
 *
 * @param {Partial<Student>} input
 * @returns {Partial<Record<keyof Student, string>>}
 */
export function problemsWith(input) {
  const s = normaliseStudent(input);
  /** @type {Partial<Record<keyof Student, string>>} */
  const out = {};

  if (!s.cls) out.cls = 'Which class are you in?';
  if (!s.no) out.no = 'What is your number?';
  else if (!/\d/.test(s.no)) out.no = 'Your number should have a digit in it.';

  if (!s.name) out.name = 'What is your name?';
  else if (looksLikeJunk(s.name)) out.name = 'Please put your real name here.';

  return out;
}

export const canSignIn = (input) => Object.keys(problemsWith(input)).length === 0;

/* ------------------------------------------------------------------
   where it is kept
   ------------------------------------------------------------------ */

/** @param {Storage} [store] @returns {Student|null} */
export function loadStudent(store) {
  try {
    const raw = JSON.parse((store ?? globalThis.localStorage).getItem(KEY) || 'null');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const s = normaliseStudent(raw);
    return canSignIn(s) ? s : null;
  } catch {
    return null;
  }
}

export function saveStudent(student, store) {
  try {
    (store ?? globalThis.localStorage).setItem(KEY, JSON.stringify(normaliseStudent(student)));
    return true;
  } catch {
    return false;
  }
}

/**
 * Sign out.
 *
 * On a shared device this is the only thing standing between one
 * student's work and the next student's name on it, so it is a real
 * control and not a debug affordance.
 */
export function forgetStudent(store) {
  try {
    (store ?? globalThis.localStorage).removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}

/** How a teacher would refer to them, and how a file is named. */
export const label = (s) => (s ? [s.cls, s.no, s.name].filter(Boolean).join(' · ') : '');
