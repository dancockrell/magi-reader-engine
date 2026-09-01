/** @typedef {{who:string,text:string,state?:string,clip?:string|null}} Turn */

export function castOf(book) {
  const members = book?.cast?.members;
  const base =
    members && Object.keys(members).length
      ? members
      : {
          wren: { id: 'wren', name: 'Wren', role: 'guide' },
          prof: { id: 'prof', name: 'Grandpa Ambrose', role: 'expert' },
        };

  const out = { ...base };
  if (out.prof) {
    const old = String(out.prof.name || '')
      .trim()
      .toLowerCase();
    out.prof = {
      ...out.prof,
      name:
        !old || old === 'professor' || old === 'the professor'
          ? 'Grandpa Ambrose'
          : out.prof.name,
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

function clipOr(entry, fallback) {
  return Object.hasOwn(entry || {}, 'clip') ? entry.clip : fallback;
}

/**
 * Short conversation before the literary work.
 *
 * Authored entries may set `clip: null` while replacement voice audio is
 * being produced. The UI then shows the exact text instead of playing an
 * older recording that says something different.
 */
export function preshowRun(book) {
  return (book?.preshow || []).map((entry, index) => ({
    who: speaker(book, entry.who || 'wren').id,
    text: entry.text,
    state: entry.state || '',
    clip: clipOr(entry, `g_pre${index}`),
  }));
}

/** The matching conversation after the final line. */
export function afterwordRun(book) {
  const source = Array.isArray(book?.afterword) ? book.afterword : [];
  return source.map((entry, index) => ({
    who: speaker(book, entry.who || (index % 2 ? 'prof' : 'wren')).id,
    text: entry.text,
    state: entry.state || '',
    clip: clipOr(entry, `g_after${index}`),
  }));
}
