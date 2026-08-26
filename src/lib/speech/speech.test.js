import { describe, it, expect } from 'vitest';
import book from '../../books/fixture/index.js';
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
import { beatsOfBook } from '../reader/beats.js';

/**
 * Who speaks, when, and one at a time — against the engine's own
 * fixture book.
 *
 * Whether a pack's spoken lines all have recordings behind them is a
 * fact about that pack; it is checked in `books/magi/pack.test.js`.
 */

/** Every reaction the book gives a line to, across the whole book. */
const spokenReactions = () =>
  Object.values(book.wrenReactions)
    .flat()
    .filter((r) => r.line).length;

/** Every turn of conversation in the book. */
const dialogueTurns = () => Object.values(book.dialogue).flat().length;

describe('the cast', () => {
  it('is the people the pack names, with names and faces', () => {
    const members = castOf(book);
    expect(Object.keys(members)).toEqual(Object.keys(book.cast.members));
    expect(Object.keys(members).length).toBeGreaterThan(1);
    for (const m of Object.values(members)) {
      expect(m.name).toBeTruthy();
      expect(m.art, `${m.name} has no picture`).toMatch(/^art\/.+\.(webp|png|jpe?g)$/);
    }
  });

  it('answers to the short names the conversations are written in', () => {
    /* The book writes 'w' and 'p' in its conversations and full ids
       everywhere else. The names come from the pack — this pack calls
       them Pip and Marlow — so a second title renames them for free. */
    expect(speaker(book, 'w').id).toBe('wren');
    expect(speaker(book, 'p').id).toBe('prof');
    expect(speaker(book, 'wren').name).toBe(book.cast.members.wren.name);
    expect(speaker(book, 'p').name).toBe(book.cast.members.prof.name);
  });

  it('still speaks for a book that ships no cast', () => {
    expect(Object.keys(castOf({})).length).toBeGreaterThan(0);
    expect(speaker({}, 'w').id).toBe('wren');
  });
});

describe('what they say', () => {
  it('gives the guide a reaction only where the book gave her a line', () => {
    let faces = 0;
    let lines = 0;
    for (const [unitId, list] of Object.entries(book.wrenReactions)) {
      faces += list.length;
      lines += reactionsFor(book, unitId).size;
    }
    expect(lines).toBe(spokenReactions());
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
    expect(preshowRun(book)).toHaveLength(book.preshow.length);
    expect(book.preshow.length).toBeGreaterThan(1);
    expect(helloRun(book)).toHaveLength(1);
    for (const pass of [1, 2, 3]) expect(passIntroRun(book, pass)).toHaveLength(1);
  });

  it('gives nothing back for a book that has none of it', () => {
    expect(preshowRun({})).toEqual([]);
    expect(helloRun({})).toEqual([]);
    expect(passIntroRun({}, 1)).toEqual([]);
    expect(talkFor({}, 'p1')).toEqual([]);
    expect(reactionsFor({}, 'p1').size).toBe(0);
  });
});

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
    expect(saveHeard('fixture', ['hello', 'preshow'], s)).toBe(true);
    expect(loadHeard('fixture', s)).toEqual(['hello', 'preshow']);
    clearHeard('fixture', s);
    expect(loadHeard('fixture', s)).toEqual([]);
  });

  it('says so when the device will not save, rather than pretending', () => {
    expect(saveHeard('fixture', ['hello'], fakeStore('full'))).toBe(false);
  });

  it('treats what is in the store as input, not truth', () => {
    const s = fakeStore();
    for (const junk of ['not json', '{"a":1}', '"hello"', 'null']) {
      s._map.set('reader.heard.v1.fixture', junk);
      expect(loadHeard('fixture', s)).toEqual([]);
    }
    s._map.set('reader.heard.v1.fixture', JSON.stringify(['hello', 7, null, 'preshow']));
    expect(loadHeard('fixture', s)).toEqual(['hello', 'preshow']);
  });

  it('greets a reader properly when they open a different book', () => {
    const s = fakeStore();
    saveHeard('fixture', ['hello'], s);
    expect(loadHeard('other', s)).toEqual([]);
  });
});

describe('speech in the reading', () => {
  it('puts the two of them in the first reading and nowhere else', () => {
    /* Counted back off the raw book rather than written down: the
       failure to catch is the track dropping turns, and a number copied
       from the track would move with the bug. */
    const said = (pass) => trackFor(book, pass).filter((s) => s.kind === 'say');
    expect(said(1)).toHaveLength(spokenReactions() + dialogueTurns());
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

  it('has the guide react to the line she is reacting to, right after it', () => {
    const t = trackFor(book, 1);
    for (let i = 0; i < t.length; i++) {
      if (t[i].kind !== 'say' || !/^wh_/.test(t[i].turn.clip || '')) continue;
      const before = t[i - 1];
      expect(before.kind).toBe('line');
      expect(t[i].turn.clip).toBe(`wh_${before.unit}_${before.i}`);
    }
  });

  it('keeps the conversations about the material that is never read aloud', () => {
    /* Turns that hang off units which are not read segments. The first
       draft dropped them on the floor, which is exactly the sort of loss
       nobody notices — the reading still works, and a slice of what they
       say is simply gone. */
    const t = trackFor(book, 1);
    for (const id of Object.keys(book.info)) {
      const turns = t.filter((s) => s.kind === 'say' && s.unit === id);
      expect(turns.length, id).toBe(book.dialogue[id].length);
    }
  });

  it('holds the conversation after the part, not during it', () => {
    const t = trackFor(book, 1);
    for (const stop of t) {
      if (stop.kind !== 'say' || !/^d_/.test(stop.turn.clip || '')) continue;
      const lines = t.filter((s) => s.kind === 'line' && s.unit === stop.unit);
      /* the background pages are talked about but never read aloud;
         those conversations come after the whole story rather than
         after a part of it */
      if (!lines.length) continue;
      expect(lines[lines.length - 1].at).toBeLessThan(stop.at);
    }
  });

  it('leaves reading 1 as one line at a time, plus the talking', () => {
    const t = trackFor(book, 1);
    const lines = beatsOfBook(book).length;
    expect(t.filter((s) => s.kind === 'line')).toHaveLength(lines);
    /* and one more stop at the end, which is the ending itself */
    expect(t).toHaveLength(lines + spokenReactions() + dialogueTurns() + 1);
    expect(t[t.length - 1].kind).toBe('end');
  });
});
