/**
 * What Wren and the Professor say, and when.
 *
 * The book already carries all of it — the preshow, the reactions, the
 * conversations after each part — welded to nothing. This turns that data
 * into turns: one speaker, one line, one recording, in order.
 *
 * A turn names its clip by the book's own convention, which is how the
 * 519 recordings were named:
 *
 *   n_<unit>_<i>            the Professor reading line i
 *   wh_<unit>_<i>           Wren reacting to line i
 *   d_<unit>_<i>            turn i of the conversation after that part
 *   g_pre<i>, g_hello       the preshow, and the greeting
 *   g_pass<n>               what this reading is going to ask of you
 *
 * Every one of those has a cue in the same WebVTT file the reading uses,
 * so speech is highlighted by the media clock exactly as narration is.
 * Nothing here reaches for a second timing mechanism.
 */

/** @typedef {{who:string, text:string, state?:string, clip?:string|null}} Turn */

/** The cast, with a fallback so a book that ships no cast still speaks. */
export function castOf(book) {
  const members = book?.cast?.members;
  if (members && Object.keys(members).length) return members;
  return {
    wren: { id: 'wren', name: 'Wren', role: 'guide' },
    prof: { id: 'prof', name: 'Reader', role: 'reader' },
  };
}

/** @returns {{id:string, name:string, art?:string, blurb?:string}} */
export function speaker(book, who) {
  const members = castOf(book);
  /* the book writes 'w' and 'p' in the conversations and full ids
     everywhere else; both mean the same two people */
  const id = who === 'w' ? 'wren' : who === 'p' ? 'prof' : who;
  return members[id] || { id: String(id || 'wren'), name: '' };
}

/** Wren's reactions to a part, indexed by the line they react to. */
export function reactionsFor(book, unitId) {
  /** @type {Map<number, Turn>} */
  const at = new Map();
  for (const r of book?.wrenReactions?.[unitId] || []) {
    /* Every entry sets her expression; only some give her something to
       say. A reaction with no line is a face, not an interruption. */
    if (!r?.line) continue;
    at.set(Number(r.at), {
      who: 'wren',
      text: r.line,
      state: r.state || '',
      clip: `wh_${unitId}_${r.at}`,
    });
  }
  return at;
}

/** The conversation after a part. */
export function talkFor(book, unitId) {
  return (book?.dialogue?.[unitId] || []).map((t, i) => ({
    who: speaker(book, t.who).id,
    text: t.text,
    state: t.state || '',
    clip: `d_${unitId}_${i}`,
  }));
}

/* ------------------------------------------------------------------
   The one-off runs — said once, and not again
   ------------------------------------------------------------------ */

/** Wren's introduction to the book. @returns {Turn[]} */
export function preshowRun(book) {
  return (book?.preshow || []).map((p, i) => ({
    who: 'wren',
    text: p.text,
    state: p.state || '',
    clip: `g_pre${i}`,
  }));
}

/** The greeting at the door. @returns {Turn[]} */
export function helloRun(book) {
  const text = book?.guideVoice?.hello;
  return text ? [{ who: 'wren', text, state: 'happy', clip: 'g_hello' }] : [];
}

/** What this reading is going to ask of you. @returns {Turn[]} */
export function passIntroRun(book, pass) {
  const text = book?.guideVoice?.passIntro?.[String(pass)];
  return text ? [{ who: 'wren', text, state: 'talk', clip: `g_pass${pass}` }] : [];
}
