/**
 * The book package contract.
 *
 * This exists so that content can be GENERATED — by a local model, by a
 * script, by a person in a hurry — without any of it being trusted. The
 * reader is meant to carry many books; the bottleneck is not the engine
 * but the per-book content: scene text, glossary, definitions,
 * substitutions, questions, translations.
 *
 * A generator that is cheap and occasionally wrong is only useful if
 * something downstream is strict and always right. This is that thing.
 * Every check below is a mistake a plausible generator actually makes:
 * glossing a word that is not in the text, leaving the inline markup
 * unbalanced, pointing `correct` at an option that does not exist,
 * offering a substitution that is the word itself.
 */

export const INLINE_GLOSS = /\{([^|{}]*)\|([^{}]*)\}/g;

function fail(errors, path, message) {
  errors.push({ path, message });
}

/** The `{word|meaning}` markup, parsed out of one stanza. */
export function inlineGlosses(stanza) {
  const out = [];
  let m;
  const re = new RegExp(INLINE_GLOSS.source, 'g');
  while ((m = re.exec(String(stanza)))) out.push({ w: m[1], d: m[2] });
  return out;
}

/** Plain text of a stanza, with the gloss markup removed. */
export function plainStanza(stanza) {
  return String(stanza).replace(new RegExp(INLINE_GLOSS.source, 'g'), '$1');
}

/**
 * Where a word begins and ends, for every part of the reader that has to
 * find one in a line. The trainer imports this rather than keeping its
 * own copy, because a second copy is a rule that can drift: validation
 * would accept a book whose words the trainer could not then locate.
 *
 * Apostrophes and hyphens are not boundaries, so a glossed word may
 * contain them — `o'er` and `lamp-light` are single words, and `mark`
 * must not match inside `unremarkable`.
 *
 * The possessive is the exception, and it is why this exists. A poem
 * says "my bosom's core" and "a demon's that is dreaming", and a
 * boundary rule that treats the apostrophe as part of the word decides
 * that "bosom" is glossed but never appears. Two of _The Raven_'s
 * glosses were reported as defects on exactly that mistake, and Magi is
 * full of "Jim's" and "Della's" that no gloss could ever have reached.
 *
 * So a trailing `'s` (or a bare `'` after a plural) is allowed to follow
 * the word — and only that. An elision is left alone: `o'er` still does
 * not contain `o`, because `'e` is neither of those two shapes.
 *
 * Group 2 is the word itself and group 3 the possessive tail, so a
 * caller can highlight `[bosom]'s` and blank `______'s` rather than
 * swallowing the ending.
 */
export function wordRe(w, flags = 'i') {
  const esc = String(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z'’-])(${esc})(['’]s|['’])?(?=[^A-Za-z'’-]|$)`, flags);
}

export function validateUnit(unit, index, seenIds, errors) {
  const at = `units[${index}]`;

  for (const field of ['id', 'title']) {
    if (!unit?.[field]) fail(errors, `${at}.${field}`, `missing ${field}`);
  }
  if (unit?.id) {
    if (seenIds.has(unit.id)) fail(errors, `${at}.id`, `duplicate id "${unit.id}"`);
    seenIds.add(unit.id);
  }

  const stanzas = unit?.stanzas || [];
  if (!stanzas.length) fail(errors, `${at}.stanzas`, 'a unit with no text cannot be read');

  /* Unbalanced braces are the classic generated-content failure: the
     reader would render "{hair" as literal text on screen. */
  stanzas.forEach((sz, i) => {
    const s = String(sz);
    const opens = (s.match(/\{/g) || []).length;
    const closes = (s.match(/\}/g) || []).length;
    if (opens !== closes)
      fail(
        errors,
        `${at}.stanzas[${i}]`,
        `unbalanced gloss braces (${opens} open, ${closes} close)`
      );
    for (const g of inlineGlosses(sz)) {
      if (!g.w.trim()) fail(errors, `${at}.stanzas[${i}]`, 'gloss with an empty word');
      if (!g.d.trim()) fail(errors, `${at}.stanzas[${i}]`, `gloss "${g.w}" has no meaning`);
    }
  });

  /* Every glossary entry must actually occur in this unit's text, or the
     vocabulary trainer will ask about a word the student never met and
     cannot show it in its line. */
  const body = stanzas.map(plainStanza).join('\n');
  for (const [i, entry] of (unit?.gloss || []).entries()) {
    const [w, d] = Array.isArray(entry) ? entry : [entry?.w, entry?.d];
    if (!w) {
      fail(errors, `${at}.gloss[${i}]`, 'entry with no word');
      continue;
    }
    if (!d) fail(errors, `${at}.gloss[${i}]`, `"${w}" has no meaning`);
    if (!wordRe(w).test(body))
      fail(errors, `${at}.gloss[${i}]`, `"${w}" is glossed but does not appear in the text`);
  }

  /* Multiple choice: the answer has to be one of the options. */
  for (const [i, q] of (unit?.mc || []).entries()) {
    const qAt = `${at}.mc[${i}]`;
    if (!q?.q) fail(errors, qAt, 'question with no text');
    const opts = q?.opts || [];
    if (opts.length < 2) fail(errors, `${qAt}.opts`, 'needs at least two options');
    if (new Set(opts).size !== opts.length) fail(errors, `${qAt}.opts`, 'duplicate options');
    if (!Number.isInteger(q?.correct) || q.correct < 0 || q.correct >= opts.length)
      fail(
        errors,
        `${qAt}.correct`,
        `correct index ${q?.correct} is not one of ${opts.length} options`
      );
  }
}

/**
 * Substitutions are validated against the glossary they claim to serve.
 * A substitution equal to its own word teaches nothing; one that points
 * at a word whose recorded substitution points back creates a question
 * with two right answers.
 */
export function validateSwaps(swaps, glossWords, errors) {
  const lc = (s) => String(s || '').toLowerCase();
  const known = new Set(glossWords.map(lc));
  for (const [word, sub] of Object.entries(swaps || {})) {
    const at = `swaps.${word}`;
    if (!sub) {
      fail(errors, at, 'empty substitution');
      continue;
    }
    if (lc(sub) === lc(word)) fail(errors, at, 'substitution is the word itself');
    if (!known.has(lc(word))) fail(errors, at, `"${word}" is not in any unit's glossary`);
    if (/\s{2,}/.test(sub)) fail(errors, at, 'substitution has stray whitespace');
  }
}

/**
 * Every unit id in the book, including the info panels.
 *
 * `units` is the story; `info` holds the author study and the afterword.
 * Both are read, both are taught, both are translated — the teaching
 * layer has fourteen entries for twelve story units and two info ones —
 * so anything checking "is this a real unit" has to look at both.
 */
export function allUnitIds(book) {
  return new Set([
    ...(book?.units || []).map((u) => u?.id).filter(Boolean),
    ...Object.keys(book?.info || {}),
  ]);
}

/**
 * The teaching layer: what a student is asked, and what they write.
 *
 * These questions are the assessment. A `correct` index pointing at no
 * option, or a prompt with no question, is not a cosmetic fault — it is
 * a mark a student cannot earn, discovered in front of a class.
 */
export function validateTeaching(teaching, unitIds, errors) {
  const known = unitIds instanceof Set ? unitIds : new Set(unitIds);
  for (const [unitId, entry] of Object.entries(teaching || {})) {
    const at = `teaching.${unitId}`;
    if (!known.has(unitId)) {
      fail(errors, at, `teaches a unit that does not exist`);
      continue;
    }

    for (const [i, q] of (entry?.mc || []).entries()) {
      const qAt = `${at}.mc[${i}]`;
      if (!q?.q) fail(errors, qAt, 'question with no text');
      const opts = q?.opts || [];
      if (opts.length < 2) fail(errors, `${qAt}.opts`, 'needs at least two options');
      if (new Set(opts).size !== opts.length) fail(errors, `${qAt}.opts`, 'duplicate options');
      if (!Number.isInteger(q?.correct) || q.correct < 0 || q.correct >= opts.length)
        fail(
          errors,
          `${qAt}.correct`,
          `answer ${q?.correct} is not one of ${opts.length} options`
        );
    }

    const sa = entry?.sa;
    if (sa) {
      if (!sa.q) fail(errors, `${at}.sa`, 'a written prompt with no question');
      /* the grader needs something to look for, or every answer scores nil */
      const keys = (sa.core || []).concat(sa.support || []);
      if (!keys.length) fail(errors, `${at}.sa`, 'nothing for the grader to look for');
    }

    /**
     * A recap is marked exactly like a multiple-choice question —
     * `assessment.js` compares `choice === q.correct` for both — and
     * until now it was validated far more loosely than one. It checked
     * that a question and some options existed and stopped there, so a
     * recap answering option 7 of 4, or offering a single option, or
     * carrying no `correct` at all, passed the contract and reached a
     * class as a question nobody could get right.
     *
     * Same marking, same checks.
     */
    const recap = entry?.recap;
    if (recap) {
      if (!recap.q) fail(errors, `${at}.recap`, 'a recap with no question');
      const opts = recap.opts || [];
      if (opts.length < 2)
        fail(errors, `${at}.recap.opts`, 'a recap needs at least two options');
      if (new Set(opts).size !== opts.length)
        fail(errors, `${at}.recap.opts`, 'duplicate options');
      if (!Number.isInteger(recap.correct) || recap.correct < 0 || recap.correct >= opts.length)
        fail(
          errors,
          `${at}.recap.correct`,
          `correct index ${recap.correct} is not one of ${opts.length} options`
        );
    }
  }
}

/**
 * Translations must cover what the reader offers.
 *
 * Checked in this direction on purpose. The word list carries far more
 * languages than the picker shows — zh, vi, id, pt, fr, ru and others —
 * and that is a feature, not a fault: the data is ready for languages
 * not yet exposed. What would be a fault is offering a language in the
 * picker that the words have no translations for, because a student
 * chooses it and sees nothing.
 */
export function validateTranslations(book, errors) {
  const offered = (book?.languages || []).map((l) => (typeof l === 'string' ? l : l?.code));
  const unitIds = allUnitIds(book);

  for (const unitId of Object.keys(book?.lineTranslations || {})) {
    if (!unitIds.has(unitId))
      fail(errors, `lineTranslations.${unitId}`, 'translates a unit that does not exist');
  }

  const words = Object.entries(book?.wordTranslations || {});
  for (const code of offered) {
    if (!code) continue;
    const covered = words.filter(([, byLang]) => byLang?.[code]).length;
    if (words.length && covered === 0)
      fail(
        errors,
        `languages.${code}`,
        'offered to students but no word is translated into it'
      );
  }
}

export function validateBook(book) {
  const errors = [];
  const warnings = [];
  if (!book?.meta?.title) fail(errors, 'meta.title', 'a book needs a title');
  const units = book?.units || [];
  if (!units.length) fail(errors, 'units', 'a book needs at least one unit');

  const seenIds = new Set();
  units.forEach((u, i) => validateUnit(u, i, seenIds, errors));
  validateTeaching(book?.teaching, allUnitIds(book), errors);
  validateTranslations(book, errors);

  /* A word defined two ways is a WARNING, not a rejection.

     It was a rejection, on the reasoning that two glosses make the
     trainer's distractors ambiguous. That reasoning is sound and the
     remedy was not: English words mean more than one thing, and poetry
     leans on it. Poe writes "to still the beating of my heart" and then
     "Let my heart be still a moment" — a verb and an adjective, four
     stanzas apart, and both glosses are right. A contract that calls
     that a defect is telling a book to teach the language less well
     than the language deserves.

     So the reading keeps both, where the surrounding line settles which
     is meant, and the trainer declines to quiz the word at all, because
     out of its line there is no single right answer. The warning stays
     because the other cause of a double definition — a generator that
     glossed the same word inconsistently by accident — is real, and is
     something a person should look at. */
  const meanings = new Map();
  const ambiguous = new Set();
  const glossWords = [];
  units.forEach((u, i) => {
    const entries = (u?.gloss || []).map((e) => (Array.isArray(e) ? e : [e?.w, e?.d]));
    for (const sz of u?.stanzas || []) {
      for (const g of inlineGlosses(sz)) entries.push([g.w, g.d]);
    }
    for (const [w, d] of entries) {
      if (!w) continue;
      glossWords.push(w);
      const key = String(w).toLowerCase();
      if (meanings.has(key) && meanings.get(key).d !== d) {
        ambiguous.add(key);
        fail(
          warnings,
          `units[${i}].gloss`,
          `"${w}" is defined twice with different meanings ("${meanings.get(key).d}" / "${d}") — ` +
            `it will be glossed in the reading but not asked in the trainer`
        );
      } else if (!meanings.has(key)) {
        meanings.set(key, { d, unit: u?.id });
      }
    }
  });

  validateSwaps(book?.swaps, glossWords, errors);
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    /* Words the trainer can actually ask about — the ambiguous ones are
       readable but not quizzable, and counting them here would promise
       questions that never get built. */
    wordCount: meanings.size - ambiguous.size,
  };
}
