import { lineFor, blankWord, markWord, leaksAnswer } from './text.js';

/**
 * What kind of question to ask, and how to build it.
 *
 * Pure: given an item, the other live items and the book, it returns a
 * question object. Nothing here touches the DOM, so every rule can be
 * checked against the whole real word list at once — which is how the
 * substitution ambiguity below was found rather than shipped.
 */

export const KINDS = [
  'recognise',
  'produce',
  'context',
  'truefalse',
  'odd',
  'spell',
  'swap',
  'match',
];

const lc = (s) => String(s ?? '').toLowerCase();

/** Deterministic shuffle, so a question can be reproduced in a test. */
export function shuffle(list, rng = Math.random) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function swapFor(ctx, item) {
  return ctx.swaps?.[lc(item.w)] || null;
}

export function actOf(ctx, unitId) {
  return (ctx.book?.units || []).find((u) => u.id === unitId)?.act || null;
}

/**
 * Odd-one-out needs three words sharing a division of the story and one
 * from elsewhere. A single scene rarely yields three, so it widens to
 * the act; when neither works the kind is simply not offered.
 */
export function oddSet(ctx, item, pool, rng = Math.random) {
  if (!item.unit) return null;
  const levels = [
    { of: (x) => x.unit, val: item.unit, label: 'part' },
    { of: (x) => actOf(ctx, x.unit), val: actOf(ctx, item.unit), label: 'act' },
  ];
  for (const lvl of levels) {
    if (!lvl.val) continue;
    const same = pool.filter((x) => lvl.of(x) === lvl.val);
    const other = pool.filter((x) => lvl.of(x) && lvl.of(x) !== lvl.val);
    if (same.length >= 3 && other.length)
      return {
        same: shuffle(same, rng).slice(0, 3),
        odd: shuffle(other, rng)[0],
        label: lvl.label,
      };
  }
  return null;
}

export function kindsFor(ctx, item, live) {
  /* First meeting: show what it means. Asking someone to produce a word
     they have never seen is a guess, not a question. */
  if ((item.asked ?? 0) < 1 && !(item.hits ?? 0)) return ['recognise'];

  const kinds = ['recognise', 'produce', 'truefalse'];
  const line = lineFor(ctx.book, item);
  if (line && blankWord(line, item.w)) kinds.push('context');
  if (live.length >= 3) kinds.push('match');
  if (/^[A-Za-z][A-Za-z'’-]{2,13}$/.test(item.w)) kinds.push('spell');
  if (swapFor(ctx, item) && line) kinds.push('swap');
  if (oddSet(ctx, item, ctx.all || live)) kinds.push('odd');
  return kinds;
}

export function pickKind(ctx, item, live, lastKind, rng = Math.random) {
  let kinds = kindsFor(ctx, item, live);
  if (kinds.length > 1 && lastKind) {
    const others = kinds.filter((k) => k !== lastKind);
    if (others.length) kinds = others;
  }
  return kinds[Math.floor(rng() * kinds.length)];
}

/**
 * Distractors that cannot accidentally be right.
 *
 * For substitution this matters most: "craved" and "coveted" swap for
 * each other, so neither may be a wrong answer for the other. Without
 * this the question has two right answers and punishes the student who
 * knows both words.
 */
export function distractorsFor(ctx, item, kind, count, rng = Math.random) {
  const target = lc(item.w);
  const fits = lc(swapFor(ctx, item));
  const pool = (ctx.all || []).filter((g) => {
    const gw = lc(g.w);
    if (gw === target) return false;
    if (lc(g.d) === lc(item.d)) return false;
    if (kind === 'swap') {
      if (gw === fits) return false;
      if (lc(ctx.swaps?.[gw]) === target || lc(ctx.swaps?.[gw]) === fits) return false;
      if (lc(ctx.swaps?.[target]) === gw) return false;
    }
    return true;
  });
  return shuffle(pool, rng).slice(0, count);
}

function options(correct, wrongs, rng) {
  return shuffle([{ t: correct, ok: true }].concat(wrongs.map((t) => ({ t, ok: false }))), rng);
}

export function buildQuestion(ctx, kind, item, live, rng = Math.random) {
  const line = lineFor(ctx.book, item);
  const wrong = distractorsFor(ctx, item, kind, 3, rng);

  switch (kind) {
    case 'recognise':
      return {
        kind,
        item,
        prompt: item.w,
        sub: 'From the part you have read',
        options: options(
          item.d,
          wrong.map((g) => g.d),
          rng
        ),
      };

    case 'produce':
      return {
        kind,
        item,
        prompt: item.d,
        sub: 'Which word means this?',
        options: options(
          item.w,
          wrong.map((g) => g.w),
          rng
        ),
      };

    case 'context': {
      const blanked = blankWord(line, item.w);
      return {
        kind,
        item,
        prompt: blanked,
        sub: 'Which word fits here?',
        options: options(
          item.w,
          wrong.map((g) => g.w),
          rng
        ),
      };
    }

    case 'spell':
      return {
        kind,
        item,
        prompt: blankWord(line, item.w) ?? item.d,
        sub: 'Type the missing word',
        hint: item.d,
        firstLetter: item.w.charAt(0),
        answer: item.w,
        options: [],
      };

    case 'swap': {
      const fits = swapFor(ctx, item);
      return {
        kind,
        item,
        prompt: markWord(line, item.w),
        sub: 'Which word could take its place?',
        options: options(
          fits,
          wrong.map((g) => g.w),
          rng
        ),
      };
    }

    case 'truefalse': {
      const claimTrue = rng() < 0.5 || !wrong.length;
      const claim = claimTrue ? item.d : wrong[0].d;
      const isTrue = claim === item.d;
      return {
        kind,
        item,
        prompt: `${item.w} means: ${claim}`,
        sub: 'True or false?',
        options: [
          { t: 'True', ok: isTrue },
          { t: 'False', ok: !isTrue },
        ],
      };
    }

    case 'odd': {
      const set = oddSet(ctx, item, ctx.all || live, rng);
      if (!set) return buildQuestion(ctx, 'recognise', item, live, rng);
      return {
        kind,
        item: set.odd,
        set,
        prompt: `Which word is not from the same ${set.label}?`,
        sub: `Three of these come from one ${set.label}`,
        options: shuffle(
          set.same.concat([set.odd]).map((x) => ({ t: x.w, ok: x === set.odd })),
          rng
        ),
      };
    }

    case 'match': {
      const picks = shuffle(live, rng).slice(0, 3);
      return {
        kind,
        items: picks,
        sub: 'Tap a word, then its meaning',
        words: picks.map((p) => p.w),
        meanings: shuffle(picks, rng).map((p) => ({ t: p.d, w: p.w })),
        options: [],
      };
    }

    default:
      throw new Error(`unknown question kind: ${kind}`);
  }
}

/** Does this question give itself away? Used as an assertion, not a filter. */
export function selfBetraying(q) {
  if (!q?.prompt) return false;
  if (q.kind === 'context' || q.kind === 'spell') {
    return leaksAnswer(q.prompt, q.item.w);
  }
  if (q.kind === 'produce' || q.kind === 'swap') {
    const answer = q.options.find((o) => o.ok)?.t;
    return answer ? leaksAnswer(q.prompt, answer) : false;
  }
  return false;
}
