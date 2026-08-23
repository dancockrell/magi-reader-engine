/**
 * WebVTT, instead of a private timing format.
 *
 * The reader currently ships `timings.js`: 177 KB of
 * `{clipId: [{t, w}, …]}` describing when each word is spoken, plus a
 * hand-written loop that walks it against `audio.currentTime` to light
 * the word being said. Every part of that is a standard that already
 * exists.
 *
 * WebVTT expresses word timing directly, with inline cue timestamps —
 * the "karaoke" form:
 *
 *     00:00:00.100 --> 00:00:02.000
 *     <00:00:00.100>One <00:00:00.477>dollar <00:00:00.816>and
 *
 * What that buys, none of which we have to write or debug:
 *
 *   - the browser does the timing, via TextTrack and `cuechange`, at the
 *     media clock rather than on a requestAnimationFrame loop that stops
 *     in a backgrounded tab
 *   - a translation is a second <track srclang="…">, not a parallel
 *     data structure kept in step by hand
 *   - the files open in Aegisub, Subtitle Edit, or any captioning tool,
 *     so a teacher or translator can fix a timing without touching code
 *   - Whisper emits this format directly, which is what makes the next
 *     book's timings a GPU job rather than an authoring job
 *   - screen readers and the OS caption settings understand it
 *
 * We still draw the subtitle ourselves — `::cue` cannot do the layout
 * this reader wants — but by listening to the track rather than by
 * reimplementing the clock.
 */

/** `123456` ms → `00:02:03.456`, which is the only format VTT accepts. */
export function stamp(ms) {
  const total = Math.max(0, Math.round(Number(ms) || 0));
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  const f = total % 1000;
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(f, 3)}`;
}

/** `00:02:03.456` → `123456`. Tolerates the `mm:ss.fff` short form. */
export function unstamp(text) {
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})\.(\d{1,3})$/.exec(String(text).trim());
  if (!m) return null;
  const [, h, mm, ss, fff] = m;
  return (
    Number(h || 0) * 3_600_000 +
    Number(mm) * 60_000 +
    Number(ss) * 1000 +
    Number(fff.padEnd(3, '0'))
  );
}

/** VTT forbids `-->` inside cue text and treats a blank line as a cue
 *  break, so both are neutralised rather than allowed to split a cue. */
export function escapeCueText(text) {
  return String(text)
    .replace(/-->/g, '→')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{2,}/g, '\n');
}

/**
 * One clip's word timings as a WebVTT cue with inline timestamps.
 *
 * The input is typed loosely on purpose: this is the boundary where
 * generated timing data arrives — from Whisper, from a hand edit, from
 * an older build — and entries missing a time are dropped rather than
 * written out as a corrupt cue.
 *
 * @param {Array<{t?:number,w?:string}>|null|undefined} words
 * @param {object} [opts]
 * @param {number} [opts.endMs]   when the clip finishes; defaults to a
 *                                beat past the last word
 * @param {string} [opts.id]      cue identifier
 * @returns {string}
 */
export function cueFor(words, { endMs, id } = {}) {
  const list = (words || []).filter((x) => x && typeof x.t === 'number');
  if (!list.length) return '';
  const start = list[0].t;
  const last = list[list.length - 1];
  const end = endMs ?? last.t + Math.max(400, String(last.w || '').length * 60);

  /* The first word carries the cue's own start time, so it is not
     repeated inline — a duplicate timestamp there is legal but makes
     the file harder for a person to read. */
  const body = list.map((x, i) => (i === 0 ? x.w : `<${stamp(x.t)}>${x.w}`)).join(' ');

  return `${id ? id + '\n' : ''}${stamp(start)} --> ${stamp(end)}\n${escapeCueText(body)}\n`;
}

/**
 * A whole WebVTT file for one clip.
 * @param {Array<{t?:number,w?:string}>|null|undefined} words
 * @param {object} [opts]
 * @returns {string}
 */
export function toVtt(words, opts = {}) {
  const cue = cueFor(words, opts);
  return `WEBVTT\n\n${cue}`;
}

/**
 * Read the word timings back out of a VTT cue.
 *
 * Used to check a conversion round-trips, and to drive the highlight
 * from a cue the browser has already parsed.
 *
 * @param {string} vtt
 * @returns {{t:number,w:string}[]}
 */
export function wordsFromVtt(vtt) {
  const text = String(vtt);
  const m =
    /(\d{1,2}:)?\d{1,2}:\d{1,2}\.\d{1,3}\s*-->\s*((\d{1,2}:)?\d{1,2}:\d{1,2}\.\d{1,3})/.exec(
      text
    );
  if (!m) return [];
  const startMs = unstamp(m[0].split('-->')[0].trim());
  const body =
    text
      .slice(m.index + m[0].length)
      .replace(/^\n/, '')
      .split(/\n\s*\n/)[0] || '';

  const out = [];
  /* first token has no inline stamp — it inherits the cue start */
  const parts = body.split(/<((?:\d{1,2}:)?\d{1,2}:\d{1,2}\.\d{1,3})>/);
  const head = parts[0].trim();
  if (head) out.push({ t: startMs, w: head });
  for (let i = 1; i < parts.length; i += 2) {
    const w = (parts[i + 1] || '').trim();
    if (w) out.push({ t: unstamp(parts[i]), w });
  }
  return out;
}

/**
 * Which word is being spoken at this moment.
 *
 * A binary search rather than a scan: a long clip has hundreds of words
 * and this is asked on every timeupdate.
 *
 * @param {{t:number,w:string}[]} words
 * @param {number} ms
 * @returns {number} index, or -1 before the first word
 */
export function wordAt(words, ms) {
  const list = words || [];
  let lo = 0;
  let hi = list.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].t <= ms) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}
