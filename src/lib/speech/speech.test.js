import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import {
  castOf,
  speaker,
  reactionsFor,
  talkFor,
  preshowRun,
  helloRun,
  passIntroRun,
} from './script.js';
import {
  createSpeech,
  speak,
  speaking,
  next,
  back,
  close,
  forget,
  isLast,
  wasHeard,
  progressOf,
} from './queue.js';
import { loadHeard, saveHeard, clearHeard } from './heard.js';
import { trackFor } from '../reader/track.js';

let book;
let clips;
beforeAll(() => {
  book = JSON.parse(readFileSync('src/books/magi/book.json', 'utf8'));
  clips = new Set(
    readdirSync('public/magi-audio')
      .filter((f) => f.endsWith('.mp3'))
      .map((f) => f.replace(/\.mp3$/, ''))
  );
});

describe('the cast', () => {
  it('is two people with names and faces', () => {
    const members = castOf(book);
    expect(Object.keys(members).sort()).toEqual(['prof', 'wren']);
    for (const m of Object.values(members)) {
      expect(m.name).toBeTruthy();
      expect(m.art, `${m.name} has no picture`).toMatch(/^art\/.+\.(webp|png|jpe?g)$/);
    }
  });

  it('answers to the short names the conversations are written in', () => {
    expect(speaker(book, 'w').id).toBe('wren');
    expect(speaker(book, 'p').id).toBe('prof');
    expect(speaker(book, 'wren').name).toBe('Wren');
  });

  it('still speaks for a book that ships no cast', () => {
    expect(Object.keys(castOf({})).length).toBeGreaterThan(0);
    expect(speaker({}, 'w').id).toBe('wren');
  });
});

describe('what they say', () => {
  it('gives Wren a reaction only where the book gave her a line', () => {
    let faces = 0;
    let lines = 0;
    for (const [unitId, list] of Object.entries(book.wrenReactions)) {
      faces += list.length;
      lines += reactionsFor(book, unitId).size;
    }
    expect(lines).toBe(15);
    expect(lines, 'a reaction with no line is a face, not an interruption').toBeLessThan(faces);
  });

  it('has a conversation for every part of the story', () => {
    for (const u of book.units) expect(talkFor(book, u.id).length, u.id).toBeGreaterThan(0);
  });

  it('names both people in a conversation, never a raw w or p', () => {
    const who = new Set(book.units.flatMap((u) => talkFor(book, u.id).map((t) => t.who)));
    expect([...who].sort()).toEqual(['prof', 'wren']);
  });

  it('has a preshow, a greeting and an introduction to each reading', () => {
    expect(preshowRun(book)).toHaveLength(6);
    expect(helloRun(book)).toHaveLength(1);
    for (const pass of [1, 2, 3]) expect(passIntroRun(book, pass)).toHaveLength(1);
  });

  it('gives nothing back for a book that has none of it', () => {
    expect(preshowRun({})).toEqual([]);
    expect(helloRun({})).toEqual([]);
    expect(passIntroRun({}, 1)).toEqual([]);
    expect(talkFor({}, 's1')).toEqual([]);
    expect(reactionsFor({}, 's1').size).toBe(0);
  });
});

describe('every spoken line has its recording', () => {
  /* A line whose clip is not there is silent, and silence is the one
     failure nobody reports — a student assumes the sound is off. */
  const named = () => {
    const out = [];
    for (const u of book.units) {
      for (const t of reactionsFor(book, u.id).values()) out.push(t);
      out.push(...talkFor(book, u.id));
    }
    out.push(...preshowRun(book), ...helloRun(book));
    for (const p of [1, 2, 3]) out.push(...passIntroRun(book, p));
    return out;
  };

  it('names a clip that exists on disk', () => {
    const missing = named()
      .filter((t) => !clips.has(t.clip))
      .map((t) => t.clip);
    expect(missing).toEqual([]);
  });

  it('names a clip that has cues, so the words light up', () => {
    const vtt = readFileSync('public/cues/magi.vtt', 'utf8').split(/\r?\n/);
    const ids = new Set();
    for (let i = 1; i < vtt.length; i++) {
      if (vtt[i].includes('-->') && vtt[i - 1].trim()) ids.add(vtt[i - 1].trim());
    }
    expect(named().filter((t) => !ids.has(t.clip))).toEqual([]);
  });
});

/* Read inside the tests, never in a describe body: a describe body runs
   at collection time, before beforeAll, so `book` is still undefined
   there and every run comes back empty — which reads as the queue being
   broken rather than the fixture being early. */
const hello = () => helloRun(book);
const pre = () => preshowRun(book);

describe('one queue, one owner', () => {
  it('says nothing until somebody claims it', () => {
    expect(speaking(createSpeech())).toBeNull();
  });

  it('lets at most one person speak — there is no state for two', () => {
    let s = speak(createSpeech(), 'hello', hello());
    expect(speaking(s)).not.toBeNull();

    /* the shape of the old bug: a second caller arriving mid-speech */
    s = speak(s, 'preshow', pre());
    const talking = speaking(s);
    expect(talking).not.toBeNull();
    expect(Array.isArray(talking)).toBe(false);
    expect(s.key, 'the newer claim owns the queue').toBe('preshow');
    expect(s.turns).toEqual(pre());
  });

  it('walks its turns in order and then closes', () => {
    const turns = pre();
    let s = speak(createSpeech(), 'preshow', turns);
    for (let n = 0; n < turns.length; n++) {
      expect(speaking(s).text).toBe(turns[n].text);
      expect(progressOf(s)).toEqual({ at: n + 1, of: turns.length });
      expect(isLast(s)).toBe(n === turns.length - 1);
      s = next(s);
    }
    expect(s.open).toBe(false);
    expect(speaking(s)).toBeNull();
  });

  it('goes back a turn, but not off the front', () => {
    const turns = pre();
    let s = speak(createSpeech(), 'preshow', turns);
    s = next(s);
    expect(speaking(back(s)).text).toBe(turns[0].text);
    expect(back(back(s)).at).toBe(0);
  });

  it('ignores an empty claim rather than opening on nothing', () => {
    const s = createSpeech();
    expect(speak(s, 'nope', [])).toBe(s);
    expect(speak(s, '', hello())).toBe(s);
  });
});

describe('dismissed stays dismissed', () => {
  it('does not say hello twice', () => {
    let s = speak(createSpeech(), 'hello', hello());
    s = close(s);
    expect(wasHeard(s, 'hello')).toBe(true);

    const again = speak(s, 'hello', hello());
    expect(again.open, 'the greeting came back').toBe(false);
    expect(speaking(again)).toBeNull();
  });

  it('counts sitting through it as having heard it', () => {
    let s = speak(createSpeech(), 'hello', hello());
    s = next(s); // one turn, so this reaches the end
    expect(wasHeard(s, 'hello')).toBe(true);
    expect(speak(s, 'hello', hello()).open).toBe(false);
  });

  it('does not restart what is already open', () => {
    let s = speak(createSpeech(), 'preshow', pre());
    s = next(s);
    s = next(s);
    expect(speak(s, 'preshow', pre()).at, 'jumped back to the start').toBe(2);
  });

  it('plays it again when asked outright', () => {
    let s = close(speak(createSpeech(), 'hello', hello()));
    s = speak(s, 'hello', hello(), { again: true });
    expect(s.open).toBe(true);
  });

  it('can forget everything, for the next person to use the device', () => {
    const s = forget(close(speak(createSpeech(), 'hello', hello())));
    expect(s.heard).toEqual([]);
    expect(speak(s, 'hello', hello()).open).toBe(true);
  });

  it('starts from what was heard on the last visit', () => {
    expect(speak(createSpeech(['hello']), 'hello', hello()).open).toBe(false);
  });
});

describe('remembering it between visits', () => {
  function fakeStore(behaviour = 'ok') {
    const map = new Map();
    return {
      get length() {
        return map.size;
      },
      key: (i) => [...map.keys()][i] ?? null,
      clear: () => map.clear(),
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => {
        if (behaviour !== 'ok') throw new Error('QuotaExceededError');
        map.set(k, v);
      },
      removeItem: (k) => {
        map.delete(k);
      },
      _map: map,
    };
  }

  it('survives a round trip', () => {
    const s = fakeStore();
    expect(saveHeard('magi', ['hello', 'preshow'], s)).toBe(true);
    expect(loadHeard('magi', s)).toEqual(['hello', 'preshow']);
    clearHeard('magi', s);
    expect(loadHeard('magi', s)).toEqual([]);
  });

  it('says so when the device will not save, rather than pretending', () => {
    expect(saveHeard('magi', ['hello'], fakeStore('full'))).toBe(false);
  });

  it('treats what is in the store as input, not truth', () => {
    const s = fakeStore();
    for (const junk of ['not json', '{"a":1}', '"hello"', 'null']) {
      s._map.set('raven.heard.v1.magi', junk);
      expect(loadHeard('magi', s)).toEqual([]);
    }
    s._map.set('raven.heard.v1.magi', JSON.stringify(['hello', 7, null, 'preshow']));
    expect(loadHeard('magi', s)).toEqual(['hello', 'preshow']);
  });

  it('greets a reader properly when they open a different book', () => {
    const s = fakeStore();
    saveHeard('magi', ['hello'], s);
    expect(loadHeard('other', s)).toEqual([]);
  });
});

describe('speech in the reading', () => {
  it('puts the two of them in the first reading and nowhere else', () => {
    const said = (pass) => trackFor(book, pass).filter((s) => s.kind === 'say');
    expect(said(1).length).toBe(15 + 58);
    /* readings 2 and 3 have their own task: a question is hard enough to
       answer without someone talking over the passage it is about */
    expect(said(2)).toHaveLength(0);
    expect(said(3)).toHaveLength(0);
  });

  it('never puts two speakers on one stop', () => {
    for (const stop of trackFor(book, 1)) {
      if (stop.kind !== 'say') continue;
      expect(typeof stop.turn.who).toBe('string');
      expect(stop.turn.text).toBeTruthy();
    }
  });

  it('has Wren react to the line she is reacting to, right after it', () => {
    const t = trackFor(book, 1);
    for (let i = 0; i < t.length; i++) {
      if (t[i].kind !== 'say' || !/^wh_/.test(t[i].turn.clip || '')) continue;
      const before = t[i - 1];
      expect(before.kind).toBe('line');
      expect(t[i].turn.clip).toBe(`wh_${before.unit}_${before.i}`);
    }
  });

  it('keeps the conversations about the author page and the aftermath', () => {
    /* Ten turns that hang off units which are not read segments. The
       first draft dropped them on the floor, which is exactly the sort
       of loss nobody notices — the reading still works, and a tenth of
       what they say is simply gone. */
    const t = trackFor(book, 1);
    for (const id of ['ohenry', 'impact']) {
      const turns = t.filter((s) => s.kind === 'say' && s.unit === id);
      expect(turns.length, id).toBe(book.dialogue[id].length);
    }
  });

  it('holds the conversation after the part, not during it', () => {
    const t = trackFor(book, 1);
    for (const stop of t) {
      if (stop.kind !== 'say' || !/^d_/.test(stop.turn.clip || '')) continue;
      const lines = t.filter((s) => s.kind === 'line' && s.unit === stop.unit);
      /* the author page and the note on the story's impact are talked
         about but never read aloud; those conversations come after the
         whole story rather than after a part of it */
      if (!lines.length) continue;
      expect(lines[lines.length - 1].at).toBeLessThan(stop.at);
    }
  });

  it('leaves reading 1 as one line at a time, plus the talking', () => {
    const t = trackFor(book, 1);
    expect(t.filter((s) => s.kind === 'line')).toHaveLength(244);
    /* and one more stop at the end, which is the ending itself */
    expect(t).toHaveLength(244 + 15 + 58 + 1);
    expect(t[t.length - 1].kind).toBe('end');
  });
});
