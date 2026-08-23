import { plainStanza } from '../book/validate.js';

/**
 * Finding a word in a line, and showing it there.
 *
 * The whole vocabulary design rests on one claim: a word means
 * something only where it sits. So every one of these has to agree
 * exactly with the others — if `lineFor` finds a line that `blank`
 * then fails to blank, the question shows the answer.
 */

/** Word-boundary match that tolerates apostrophes and hyphens.
 *  "mark" must not match inside "unremarkable"; "Jim’s" must still
 *  match "Jim’s". */
export function wordRe(w, flags = 'i') {
  const esc = String(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z'’-])(${esc})(?=[^A-Za-z'’-]|$)`, flags);
}

/** Every line of a unit, gloss markup stripped. */
export function linesOf(unit) {
  return (unit?.stanzas || [])
    .flatMap((sz) => plainStanza(String(sz)).split('\n'))
    .map((l) => l.trim())
    .filter(Boolean);
}

/** The first line in the book where this word actually occurs. */
export function lineFor(book, item) {
  const unit = (book?.units || []).find((u) => u.id === item.unit);
  if (!unit) return null;
  const re = wordRe(item.w);
  return linesOf(unit).find((l) => re.test(l)) || null;
}

/** The line with the word wrapped for display. Returns null when the
 *  word is not in the line, rather than silently returning it plain —
 *  a caller that ignores that would render a question with no answer. */
export function markWord(line, w, open = '[', close = ']') {
  const m = wordRe(w).exec(String(line));
  if (!m) return null;
  const start = m.index + m[1].length;
  const end = start + m[2].length;
  return (
    String(line).slice(0, start) +
    open +
    String(line).slice(start, end) +
    close +
    String(line).slice(end)
  );
}

/**
 * The line with the word replaced by a gap.
 *
 * Blanks EVERY occurrence, not just the first. A line that says the
 * word twice would otherwise print the answer next to the gap.
 */
export function blankWord(line, w, gap = '______') {
  const s = String(line);
  const re = wordRe(w, 'gi');
  const out = s.replace(re, (_, pre) => pre + gap);
  return out === s ? null : out;
}

/** Does this line still contain the word after blanking? A cloze that
 *  fails this test hands over the answer. */
export function leaksAnswer(blanked, w) {
  return blanked != null && wordRe(w).test(blanked);
}
