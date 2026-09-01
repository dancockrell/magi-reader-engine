/** @typedef {{who:string, text:string, state?:string, clip?:string|null}} Turn */

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

function clipOr(entry, fallback) {
  return Object.hasOwn(entry || {}, 'clip') ? entry.clip : fallback;
}

/** Before the work. New framing may deliberately set `clip: null` while
 * its rewritten audio is still being produced; Speaker then presents the
 * words without pretending an older recording matches them. */
export function preshowRun(book) {
  return (book?.preshow || []).map((p, i) => ({
    who: speaker(book, p.who || 'wren').id,
    text: p.text,
    state: p.state || '',
    clip: clipOr(p, `g_pre${i}`),
  }));
}

export function afterwordRun(book) {
  const source = Array.isArray(book?.afterword) && book.afterword.length
    ? book.afterword
    : book?.dialogue?.impact || [];

  const authored = Array.isArray(book?.afterword) && book.afterword.length;
  return source.map((p, i) => ({
    who: speaker(book, p.who || (i % 2 ? 'prof' : 'wren')).id,
    text: p.text,
    state: p.state || '',
    clip: clipOr(p, authored ? `g_after${i}` : `d_impact_${i}`),
  }));
}

export function helloRun(book) {
  const text = book?.guideVoice?.hello;
  return text ? [{ who: 'wren', text, state: 'happy', clip: 'g_hello' }] : [];
}

export function passIntroRun(book, pass) {
  const text = book?.guideVoice?.passIntro?.[String(pass)];
  return text ? [{ who: 'wren', text, state: 'talk', clip: `g_pass${pass}` }] : [];
}
