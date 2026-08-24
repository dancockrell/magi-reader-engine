/**
 * Who is the teacher?
 *
 * The prototype answered this with a passcode first, and the passcode
 * answered it badly — three ways, all found by attacking it rather than
 * reasoning about it:
 *
 *   "I forgot it" reset the lock with no code at all, and left the
 *   gradebook sitting there. A student picks up the teacher's laptop,
 *   clicks it, sets their own passcode, and reads the class.
 *
 *   Four digits fell to a console loop in 36 milliseconds.
 *
 *   It lived on one device. Laptop dies, or the lesson is taught from
 *   the cart instead — the class is simply gone.
 *
 * The right answer was already true: THE TEACHER IS WHOEVER SET THE
 * CLASS UP. Nobody else was there. So setting a class up mints a class
 * key on that device, and holding the class key is what makes you the
 * teacher. A passcode stops being an identity and becomes what it should
 * always have been — a lock on one shared device.
 *
 * Three consequences worth stating plainly:
 *
 *   On the teacher's own device there is nothing to type. Setting the
 *   class up already proved who they are.
 *
 *   The key is written down once and works on any device. Laptop dies,
 *   teacher moves rooms, someone covers the lesson: paste the key and
 *   the gradebook is back.
 *
 *   Resetting destroys the class on this device — key, Sheet link and
 *   collected work together. Someone who resets their way in arrives in
 *   an empty room, which is the point. The way back is the key, not the
 *   reset button.
 *
 * None of this is cryptography. Everything here runs in a page the
 * student is also holding, so a determined student with the developer
 * console can reach the panel — true of any offline app, and the guide
 * says so rather than pretending otherwise. What this stops is the real
 * threat: the next student to pick up the shared iPad.
 */

export const OWNER_KEY = 'raven.teacher.owner.v1';
export const API_KEY = 'raven.api.v1';

/* ------------------------------------------------------------------
   Crockford base32, because a person has to copy this by hand
   ------------------------------------------------------------------

   The prototype used base64url, and base64url is case-sensitive. The
   whole promise of the key is "write it down, type it in on the other
   machine" — and a teacher who writes RAVEN-aB3x on a sticky note and
   types raven-ab3x gets told it is not a class key, with no hint as to
   why. That is a silent failure in the one path the key exists for.

   Crockford's alphabet is built for being read aloud and retyped: no
   I, L, O or U, so nothing is confusable with 1, 0 or each other, and
   case does not matter. It costs about a fifth more characters than
   base64url, which is the right trade for something that lives on
   paper.
   ------------------------------------------------------------------ */

const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** @param {string} s */
export function toB32(s) {
  const bytes = new TextEncoder().encode(String(s));
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

/**
 * @param {string} s
 * @returns {string} '' when it is not base32 at all
 */
export function fromB32(s) {
  /* I and L read as 1, O reads as 0 — Crockford's own rule, and the
     mistakes a person actually makes when copying by hand. */
  const clean = String(s)
    .toUpperCase()
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0')
    .replace(/[^0-9A-Z]/g, '');
  if (!clean) return '';

  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const ch of clean) {
    const n = B32.indexOf(ch);
    if (n < 0) return '';
    value = (value << 5) | n;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes));
  } catch {
    return '';
  }
}

/**
 * A submission endpoint arriving from outside gets checked.
 *
 * Checking the ORIGIN is not enough, and a tampered class key proved it:
 * an origin check accepted
 *
 *   https://script.google.com/macros/s/../../evil/exec
 *
 * which is on the right host and points at a different Apps Script
 * deployment entirely — and anybody can deploy one. A doctored key
 * handed to a teacher would have quietly sent a whole class's names and
 * writing to a stranger's script, with the app reporting "Sent."
 *
 * So the whole shape is matched, not the prefix: a deployment id is
 * base64url, and there is nothing after /exec. No path traversal
 * survives that.
 */
export const API_RE = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{16,120}\/exec$/;

/** @param {unknown} url */
export function safeApi(url) {
  const u = String(url || '');
  if (u.includes('..')) return false;
  return API_RE.test(u);
}

/* ------------------------------------------------------------------
   the owner record, and the key that carries it
   ------------------------------------------------------------------ */

/** @param {number} [bytes] @param {() => number} [rng] testing seam */
export function randomId(bytes = 16, rng) {
  if (!rng && globalThis.crypto?.getRandomValues) {
    const b = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(b);
    return [...b].map((n) => n.toString(16).padStart(2, '0')).join('');
  }
  const pick = rng || Math.random;
  let out = '';
  for (let i = 0; i < bytes * 2; i++) out += '0123456789abcdef'[Math.floor(pick() * 16)];
  return out;
}

/**
 * Mint the identity, at the moment a class is actually set up — a Sheet
 * connected, or a class link generated. That act IS the identity claim,
 * so that is where the key is minted, and nowhere else.
 *
 * @param {string} [cls]
 * @param {{now?: Date, rng?: () => number}} [opts]
 */
export function mintOwner(cls = '', { now = new Date(), rng } = {}) {
  return { id: randomId(16, rng), cls: String(cls || ''), at: now.toISOString().slice(0, 10) };
}

/**
 * What the teacher writes down.
 *
 * It carries the Sheet link too, because a key that restores your
 * identity but not your gradebook has not solved the dead-laptop
 * problem. Every Apps Script link is the same forty-four characters of
 * boilerplate around one id, so only the id travels — that keeps the key
 * short enough to paste into a phone note without wrapping over four
 * lines.
 *
 * @param {{id?:string, cls?:string}|null|undefined} owner
 * @param {string} [apiUrl]
 */
export function classKey(owner, apiUrl = '') {
  if (!owner?.id) return '';

  /* Four fields, pipe-separated, class name last so it may contain
     anything. JSON was the obvious choice and cost fifty characters of
     braces and quotes that a teacher would have had to copy — 217 down
     to 165, which is two lines on a phone rather than four.

     Only the deployment id travels, never a whole URL: a URL that is
     not an Apps Script deployment is refused on the way back in anyway,
     so carrying one is dead weight that makes the key longer. */
  const m = API_RE.test(apiUrl)
    ? /^https:\/\/script\.google\.com\/macros\/s\/([^/]+)\/exec$/.exec(apiUrl)
    : null;

  const record = ['1', owner.id, m ? m[1] : '', owner.cls || ''].join('|');

  /* Groups of five, which is about the span a person can hold in their
     head between glancing at the paper and the keyboard. */
  const body = toB32(record);
  return 'RAVEN-' + body.replace(/(.{5})/g, '$1-').replace(/-$/, '');
}

/**
 * Read a key back. Returns null for anything that is not one — a typo, a
 * truncated paste, a key from a future version, or a doctored one.
 *
 * An endpoint that does not pass `safeApi` is dropped rather than
 * refused outright: the identity in the key may still be genuine, and a
 * teacher whose key was tampered with should get their gradebook back
 * and reconnect the Sheet themselves.
 *
 * @param {string} code
 * @returns {{id:string, cls:string, api:string}|null}
 */
export function readClassKey(code) {
  const trimmed = String(code || '').trim();
  /* Noticed before the separators are stripped, not after: taking the
     dashes out first turns "RAVEN-FCH7C" into "RAVENFCH7C", and then
     the prefix no longer matches and RAVEN decodes as five bytes of
     payload. Which is a wrong key that looks like a wrong key, so it
     failed quietly on exactly the paper-and-retype path this is for. */
  const hadPrefix = /^RAVEN[-\s]/i.test(trimmed) || /^RAVEN$/i.test(trimmed.slice(0, 5));

  let raw = trimmed.replace(/\s+/g, '').replace(/-/g, '');
  if (hadPrefix) raw = raw.replace(/^RAVEN/i, '');
  if (!raw) return null;

  const txt = fromB32(raw);
  if (!txt) return null;

  const parts = txt.split('|');
  if (parts.length < 4) return null;

  const [v, id, deploy] = parts;
  /* the class name is last and keeps any pipes it contained */
  const cls = parts.slice(3).join('|');
  if (v !== '1' || !id) return null;

  const api = deploy ? `https://script.google.com/macros/s/${deploy}/exec` : '';
  return { id, cls, api: safeApi(api) ? api : '' };
}

/* ------------------------------------------------------------------
   the link the class gets, which is NOT the key
   ------------------------------------------------------------------ */

/**
 * What a student opens.
 *
 * It carries where the work goes and what the class is called, and
 * deliberately no identity at all. The prototype handed students the
 * class key, which meant the link a teacher writes on the board — or
 * pins in a chat, or a student forwards — was also the thing that makes
 * you the teacher. Anyone who kept the link could open the gradebook on
 * their own machine.
 *
 * So a join code points a device at a Sheet and nothing more. Losing one
 * costs a class the privacy of where their work is sent; it cannot cost
 * them the gradebook.
 *
 * @param {string} apiUrl
 * @param {string} [cls]
 */
export function joinCode(apiUrl, cls = '') {
  const m = API_RE.test(apiUrl)
    ? /^https:\/\/script\.google\.com\/macros\/s\/([^/]+)\/exec$/.exec(apiUrl)
    : null;
  if (!m) return '';
  return toB32(['J1', m[1], cls || ''].join('|'));
}

/**
 * @param {string} code
 * @returns {{api:string, cls:string}|null}
 */
export function readJoin(code) {
  const raw = String(code || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/-/g, '');
  if (!raw) return null;

  const txt = fromB32(raw);
  if (!txt) return null;

  const parts = txt.split('|');
  if (parts.length < 3 || parts[0] !== 'J1' || !parts[1]) return null;

  const api = `https://script.google.com/macros/s/${parts[1]}/exec`;
  if (!safeApi(api)) return null;
  return { api, cls: parts.slice(2).join('|') };
}

/* ------------------------------------------------------------------
   where it is kept
   ------------------------------------------------------------------ */

/** @param {Storage} [store] */
export function loadOwner(store) {
  try {
    const s = store ?? globalThis.localStorage;
    const v = JSON.parse(s.getItem(OWNER_KEY) || 'null');
    if (!v || typeof v !== 'object' || typeof v.id !== 'string' || !v.id) return null;
    return { id: v.id, cls: typeof v.cls === 'string' ? v.cls : '', at: String(v.at || '') };
  } catch {
    return null;
  }
}

export function saveOwner(owner, store) {
  try {
    (store ?? globalThis.localStorage).setItem(OWNER_KEY, JSON.stringify(owner));
    return true;
  } catch {
    return false;
  }
}

export function loadApi(store) {
  try {
    const u = (store ?? globalThis.localStorage).getItem(API_KEY) || '';
    return safeApi(u) ? u : '';
  } catch {
    return '';
  }
}

export function saveApi(url, store) {
  if (!safeApi(url)) return false;
  try {
    (store ?? globalThis.localStorage).setItem(API_KEY, url);
    return true;
  } catch {
    return false;
  }
}

export const isTeacher = (owner) => !!owner?.id;
