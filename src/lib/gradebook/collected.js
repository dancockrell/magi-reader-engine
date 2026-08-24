import { parseSubmission, mergeAttempt } from './submission.js';

/**
 * The work a teacher has gathered on this device.
 *
 * This is the path for a room with no Google in it: students hand in to
 * a file, the teacher collects the files and drops them here, and the
 * marking workbook comes out the other end. Where a Sheet is connected
 * the work goes there instead and this stays empty, which is fine —
 * they are two answers to the same question and a school will only ever
 * want one of them.
 *
 * Kept per book, and never thrown away silently: a second attempt
 * replaces the first through `mergeAttempt`, which remembers that there
 * was a first and whether it was better.
 */

export const KEY = 'raven.collected.v1';

const keyFor = (bookId) => `${KEY}.${bookId || 'book'}`;

/** @param {Storage} [store] */
export function loadCollected(bookId, store) {
  try {
    const raw = JSON.parse(
      (store ?? globalThis.localStorage).getItem(keyFor(bookId)) || 'null'
    );
    if (!Array.isArray(raw)) return [];
    return raw.filter((r) => r && typeof r === 'object' && r.payload);
  } catch {
    return [];
  }
}

export function saveCollected(bookId, rows, store) {
  try {
    (store ?? globalThis.localStorage).setItem(keyFor(bookId), JSON.stringify(rows));
    return true;
  } catch {
    return false;
  }
}

export function clearCollected(bookId, store) {
  try {
    (store ?? globalThis.localStorage).removeItem(keyFor(bookId));
    return true;
  } catch {
    return false;
  }
}

/**
 * Take in a pile of files.
 *
 * Reports what it could not read rather than dropping it: a teacher who
 * dragged in twenty-nine files and got twenty-eight rows needs to know
 * which one, and a silent failure here is a student's work missing from
 * a grade with nobody aware of it.
 *
 * @param {any[]} rows                what is already collected
 * @param {{name:string, text:string}[]} files
 * @returns {{rows:any[], added:number, replaced:number, rejected:string[]}}
 */
export function collect(rows, files) {
  let out = [...rows];
  let added = 0;
  let replaced = 0;
  const rejected = [];

  for (const f of files) {
    const parsed = parseSubmission(f.text, f.name);
    if (!parsed) {
      rejected.push(f.name);
      continue;
    }
    const before = out.length;
    out = mergeAttempt(out, parsed);
    if (out.length > before) added += 1;
    else replaced += 1;
  }
  return { rows: out, added, replaced, rejected };
}

/** What a teacher is told about the pile they just dropped in. */
export function summarise({ added, replaced, rejected }) {
  const said = [];
  if (added) said.push(`${added} added`);
  if (replaced) said.push(`${replaced} replaced an earlier attempt`);
  if (rejected.length) {
    said.push(
      `${rejected.length} could not be read (${rejected.slice(0, 3).join(', ')}${
        rejected.length > 3 ? '…' : ''
      })`
    );
  }
  return said.length ? said.join(' · ') : 'Nothing in those files.';
}

/** A filename a teacher can find again on a full Downloads folder. */
export function fileName(bookTitle, rows, ext, now = new Date()) {
  const classes = [...new Set(rows.map((r) => r.cls).filter(Boolean))];
  const which = classes.length === 1 ? classes[0] : `${classes.length} classes`;
  const day = now.toISOString().slice(0, 10);
  return `${bookTitle} — ${which} — ${day}.${ext}`.replace(/[\\/:*?"<>|]/g, '-');
}
