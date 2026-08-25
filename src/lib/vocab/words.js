import { inlineGlosses } from '../book/validate.js';

/**
 * Every word the trainer may ask about, once, in reading order.
 *
 * A book glosses words in two places — a unit's `gloss` list and the
 * `{word|meaning}` markup inside its stanzas — and the trainer should
 * not care which. This flattens both into one list of items.
 *
 * It lived in main.jsx, where two test files each kept their own copy of
 * it to build a context with. Three copies of "what counts as a word"
 * meant the tests could agree with each other and disagree with the app,
 * which is the shape of a bug that no test can catch.
 *
 * A word defined two different ways is left OUT. The reading still shows
 * both glosses, each in the line that settles which one is meant; but
 * "what does _still_ mean?" has two right answers, and the trainer has
 * no line to lean on when it asks. Dropping it is the honest move — the
 * previous behaviour kept whichever gloss happened to come first and
 * said nothing, so a student could be marked wrong for giving the
 * meaning their own stanza had taught them.
 */
export function wordsOf(book) {
  const seen = new Map();
  const ambiguous = new Set();

  for (const unit of book?.units || []) {
    const entries = (unit?.gloss || []).map((e) =>
      Array.isArray(e) ? { w: e[0], d: e[1] } : e
    );
    for (const sz of unit?.stanzas || []) entries.push(...inlineGlosses(sz));

    for (const e of entries) {
      if (!e?.w) continue;
      const key = String(e.w).toLowerCase();
      const already = seen.get(key);
      if (!already) seen.set(key, { w: e.w, d: e.d, unit: unit.id, hits: 0, asked: 0 });
      else if (already.d !== e.d) ambiguous.add(key);
    }
  }

  for (const key of ambiguous) seen.delete(key);
  return [...seen.values()];
}
