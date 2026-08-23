/**
 * Reading a student's writing, well enough to be useful and no further.
 *
 * This does not mark the work. It looks for the ideas the prompt asked
 * for and reports what it found, so a teacher opening thirty answers can
 * see at a glance which ones to read closely. The highlighting is a
 * hint; a person reads the writing.
 *
 * Ported from the shipping reader, which is the specification. Three of
 * its behaviours are load-bearing and easy to lose in a rewrite, so each
 * has a test naming it:
 *
 *   an opinion question keeps its promise — there is no wrong answer
 *   an answer in another language is not a weak answer
 *   a synonym counts, and every synonym present is reported
 */

export const BANDS = { high: 0.67, mid: 0.34 };

/** Words, counted the way a person would count them. */
export function words(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Lowercased, punctuation flattened, padded so `\s` boundaries work. */
export function norm(text) {
  return (
    ' ' +
    String(text || '')
      .toLowerCase()
      .replace(/[‘’]/g, "'")
      .replace(/[^a-z0-9\s']/g, ' ')
      .replace(/\s+/g, ' ') +
    ' '
  );
}

/**
 * A term, with the endings a student actually writes.
 *
 * Not a stemmer: a stemmer would match "sell" to "seller" and call it a
 * hit. This accepts the inflections of the same word and nothing more.
 */
export function termRe(term) {
  const t = String(term)
    .toLowerCase()
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|\\s)${t}(s|es|ed|ing|d|ly|ies)?(?=\\s|$)`, 'i');
}

/** Which spellings of an idea are present. An entry may be a list of
 *  synonyms; all that appear are reported, not just the first. */
export function hits(normalised, entry) {
  const list = Array.isArray(entry) ? entry : [entry];
  const found = list.filter((t) => termRe(t).test(normalised));
  return found.length ? found : null;
}

/** How an idea is named in a report: the first spelling. */
export const label = (entry) => (Array.isArray(entry) ? entry[0] : entry);

/**
 * Is this answer written in another language?
 *
 * norm() deletes everything outside the Latin alphabet, so a Korean
 * sentence arrives as an empty string and would be banded "low" — as if
 * the student had written nothing at all. They wrote plenty; it is not
 * in English. That is a different thing and the teacher should be told
 * which one it is.
 */
export function looksForeign(text) {
  const letters = String(text || '').match(/[A-Za-z가-힯぀-ヿ一-鿿฀-๿]/g) || [];
  const nonLatin = letters.filter((ch) => !/[A-Za-z]/.test(ch)).length;
  return letters.length > 3 && nonLatin / letters.length > 0.5;
}

/**
 * @param {string} text
 * @param {{core?:any[], support?:any[], phrases?:string[], minWords?:number, opinion?:boolean}} spec
 */
export function gradeWritten(text, spec = {}) {
  const n = norm(text);
  const core = spec.core || [];
  const support = spec.support || [];
  const phrases = spec.phrases || [];

  const coreHit = [];
  const coreMissed = [];
  const matched = [];

  for (const e of core) {
    const m = hits(n, e);
    if (m) {
      coreHit.push(label(e));
      matched.push(...m);
    } else coreMissed.push(label(e));
  }

  const supportHit = [];
  for (const e of support) {
    const m = hits(n, e);
    if (m) {
      supportHit.push(label(e));
      matched.push(...m);
    }
  }

  const phraseHit = [];
  for (const p of phrases) {
    if (n.includes(String(p).toLowerCase())) {
      phraseHit.push(p);
      matched.push(p);
    }
  }

  const wc = words(text).length;
  const foreign = looksForeign(text);
  const minWords = spec.minWords || 0;

  let coverage;
  if (spec.opinion) {
    /* An opinion question promised there is no wrong answer, and the
       marking has to keep that promise. Length shows effort; touching
       ANY of the idea groups shows the answer is grounded. Requiring all
       of them punished exactly the student who answered in their own
       words, which is what was asked for. */
    const grounded = coreHit.length > 0 || supportHit.length > 0 || phraseHit.length > 0;
    coverage = Math.min(1, (wc >= (minWords || 1) * 0.6 ? 0.5 : 0) + (grounded ? 0.5 : 0.17));
  } else {
    coverage = core.length ? coreHit.length / core.length : wc >= (minWords || 1) ? 1 : 0;
    coverage = Math.min(
      1,
      coverage + (supportHit.length ? 0.05 : 0) + (phraseHit.length ? 0.08 : 0)
    );
  }

  let band = coverage >= BANDS.high ? 'high' : coverage >= BANDS.mid ? 'mid' : 'low';
  if (wc < minWords * 0.6) band = 'low';
  if (foreign) band = 'foreign';

  return {
    wordCount: wc,
    tooShort: wc < minWords,
    coreTotal: core.length,
    coreHit,
    coreMissed,
    supportHit,
    phraseHit,
    matchedTerms: matched,
    coverage: Math.round(coverage * 100) / 100,
    percent: Math.round(coverage * 100),
    band,
    foreign,
    opinion: !!spec.opinion,
  };
}

/**
 * The answer split around the terms that matched, for highlighting.
 *
 * Returns segments rather than markup: the caller renders them as React
 * children, so a student's own writing can never become HTML. Longest
 * term first, so overlapping synonyms ("shadow", "shadows") cannot nest.
 *
 * @returns {{text:string, hit:boolean}[]}
 */
export function segments(text, terms) {
  const src = String(text || '');
  const list = [...new Set((terms || []).map(String))]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  if (!list.length || !src) return [{ text: src, hit: false }];

  const escaped = list.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(
    `(^|[^A-Za-z])(${escaped.join('|')})(s|es|ed|ing|d|ly|ies)?(?![A-Za-z])`,
    'gi'
  );

  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    const start = m.index + m[1].length;
    const end = start + m[2].length + (m[3] ? m[3].length : 0);
    if (start > last) out.push({ text: src.slice(last, start), hit: false });
    out.push({ text: src.slice(start, end), hit: true });
    last = end;
    if (re.lastIndex === m.index) re.lastIndex++;
  }
  if (last < src.length) out.push({ text: src.slice(last), hit: false });
  return out.length ? out : [{ text: src, hit: false }];
}
