/** @typedef {{who:string, text:string, state?:string, clip?:string|null}} Turn */

/** The house cast. Packs can replace portraits and other metadata, but
 * the reader presents the older expert as Wren's grandfather Ambrose. */
export function castOf(book) {
  const members = book?.cast?.members;
  const base = members && Object.keys(members).length
    ? members
    : {
        wren: { id: 'wren', name: 'Wren', role: 'guide' },
        prof: { id: 'prof', name: 'Grandpa Ambrose', role: 'expert' },
      };

  const out = { ...base };
  if (out.prof) {
    const old = String(out.prof.name || '').trim().toLowerCase();
    out.prof = {
      ...out.prof,
      name: !old || old === 'professor' || old === 'the professor' ? 'Grandpa Ambrose' : out.prof.name,
      role: 'expert',
    };
  }
  return out;
}

export function speaker(book, who) {
  const members = castOf(book);
  const id = who === 'w' ? 'wren' : who === 'p' || who === 'ambrose' ? 'prof' : who;
  return members[id] || { id: String(id || 'wren'), name: '' };
}

/* ------------------------------------------------------------------
   Legacy helpers. They are no longer inserted into the solo story track,
   but remain readable while old book data is migrated.
   ------------------------------------------------------------------ */

export function reactionsFor(book, unitId) {
  /** @type {Map<number, Turn>} */
  const at = new Map();
  for (const r of book?.wrenReactions?.[unitId] || []) {
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

export function talkFor(book, unitId) {
  return (book?.dialogue?.[unitId] || []).map((t, i) => ({
    who: speaker(book, t.who).id,
    text: t.text,
    state: t.state || '',
    clip: `d_${unitId}_${i}`,
  }));
}

/* ------------------------------------------------------------------
   Framing conversations. These are the only guide conversations the
   solo product puts in the normal reading journey.
   ------------------------------------------------------------------ */

/** Before the work. Old packs default these entries to Wren; new packs
 * may set `who: 'prof'` / `who: 'ambrose'` for a real conversation. */
export function preshowRun(book) {
  return (book?.preshow || []).map((p, i) => ({
    who: speaker(book, p.who || 'wren').id,
    text: p.text,
    state: p.state || '',
    clip: p.clip || `g_pre${i}`,
  }));
}

/** After the final line. New packs should author `afterword` explicitly.
 * While the existing titles are migrated, an old `dialogue.impact`
 * conversation is treated as an afterword rather than interrupting the
 * story. That preserves useful expert material but puts it where readers
 * actually wanted commentary. */
export function afterwordRun(book) {
  const source = Array.isArray(book?.afterword) && book.afterword.length
    ? book.afterword
    : book?.dialogue?.impact || [];

  return source.map((p, i) => ({
    who: speaker(book, p.who || (i % 2 ? 'prof' : 'wren')).id,
    text: p.text,
    state: p.state || '',
    clip: p.clip || (book?.afterword ? `g_after${i}` : `d_impact_${i}`),
  }));
}

export function helloRun(book) {
  const text = book?.guideVoice?.hello;
  return text ? [{ who: 'wren', text, state: 'happy', clip: 'g_hello' }] : [];
}

/** Kept for compatibility with old data tooling; the solo UI does not
 * present reading passes anymore. */
export function passIntroRun(book, pass) {
  const text = book?.guideVoice?.passIntro?.[String(pass)];
  return text ? [{ who: 'wren', text, state: 'talk', clip: `g_pass${pass}` }] : [];
}
