import { describe, it, expect } from 'vitest';
import { castOf, speaker, preshowRun, afterwordRun } from './script.js';
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

const book = {
  cast: {
    members: {
      wren: { id: 'wren', name: 'Wren', role: 'guide', art: 'art/wren.webp' },
      prof: { id: 'prof', name: 'Professor', role: 'expert', art: 'art/ambrose.webp' },
    },
  },
  preshow: [
    { who: 'wren', text: 'I brought the book.', state: 'happy', clip: null },
    { who: 'prof', text: 'Then let the book speak.', state: 'warm', clip: null },
  ],
  afterword: [
    { who: 'wren', text: 'That ending landed.', state: 'thinking', clip: null },
    { who: 'ambrose', text: 'Now we may look at how it was built.', state: 'warm', clip: null },
  ],
};

const pre = () => preshowRun(book);
const after = () => afterwordRun(book);

describe('the framing cast', () => {
  it('uses the pack’s people while normalising the old Professor name', () => {
    const members = castOf(book);
    expect(members.wren.name).toBe('Wren');
    expect(members.prof.name).toBe('Grandpa Ambrose');
    expect(members.prof.role).toBe('expert');
  });

  it('keeps the old short aliases so migrated packs do not need rewriting', () => {
    expect(speaker(book, 'w').id).toBe('wren');
    expect(speaker(book, 'p').id).toBe('prof');
    expect(speaker(book, 'ambrose').id).toBe('prof');
  });

  it('has safe defaults for a pack with no cast', () => {
    expect(speaker({}, 'w').name).toBe('Wren');
    expect(speaker({}, 'p').name).toBe('Grandpa Ambrose');
  });
});

describe('before and after the work', () => {
  it('maps the preshow exactly and respects explicit text-only turns', () => {
    expect(pre()).toHaveLength(2);
    expect(pre().map((turn) => turn.who)).toEqual(['wren', 'prof']);
    expect(pre().every((turn) => turn.clip === null)).toBe(true);
  });

  it('maps the afterword exactly and resolves Ambrose aliases', () => {
    expect(after()).toHaveLength(2);
    expect(after().map((turn) => turn.who)).toEqual(['wren', 'prof']);
    expect(after().every((turn) => turn.clip === null)).toBe(true);
  });

  it('returns no framing for a book that authored none', () => {
    expect(preshowRun({})).toEqual([]);
    expect(afterwordRun({})).toEqual([]);
  });

  it('assigns predictable clip ids when a pack does not specify them', () => {
    const spoken = {
      preshow: [{ who: 'wren', text: 'Before' }],
      afterword: [{ who: 'prof', text: 'After' }],
    };
    expect(preshowRun(spoken)[0].clip).toBe('g_pre0');
    expect(afterwordRun(spoken)[0].clip).toBe('g_after0');
  });
});

describe('one framing queue, one owner', () => {
  it('says nothing until something claims the queue', () => {
    expect(speaking(createSpeech())).toBeNull();
  });

  it('never has two simultaneous speakers', () => {
    let state = speak(createSpeech(), 'before', pre());
    expect(speaking(state)).not.toBeNull();

    state = speak(state, 'after', after());
    expect(Array.isArray(speaking(state))).toBe(false);
    expect(state.key).toBe('after');
    expect(state.turns).toEqual(after());
  });

  it('walks turns in order and closes at the end', () => {
    const turns = pre();
    let state = speak(createSpeech(), 'before', turns);
    for (let index = 0; index < turns.length; index++) {
      expect(speaking(state).text).toBe(turns[index].text);
      expect(progressOf(state)).toEqual({ at: index + 1, of: turns.length });
      expect(isLast(state)).toBe(index === turns.length - 1);
      state = next(state);
    }
    expect(state.open).toBe(false);
    expect(speaking(state)).toBeNull();
  });

  it('goes back without running off the front', () => {
    let state = next(speak(createSpeech(), 'before', pre()));
    expect(speaking(back(state)).text).toBe(pre()[0].text);
    expect(back(back(state)).at).toBe(0);
  });

  it('ignores empty claims', () => {
    const state = createSpeech();
    expect(speak(state, 'empty', [])).toBe(state);
    expect(speak(state, '', pre())).toBe(state);
  });
});

describe('dismissed framing stays dismissed', () => {
  it('does not immediately reopen something the reader closed', () => {
    let state = close(speak(createSpeech(), 'before', pre()));
    expect(wasHeard(state, 'before')).toBe(true);
    expect(speak(state, 'before', pre()).open).toBe(false);
  });

  it('counts reaching the end as heard', () => {
    let state = speak(createSpeech(), 'before', pre());
    while (state.open) state = next(state);
    expect(wasHeard(state, 'before')).toBe(true);
  });

  it('does not restart an already-open conversation', () => {
    let state = next(speak(createSpeech(), 'before', pre()));
    expect(speak(state, 'before', pre()).at).toBe(1);
  });

  it('can replay when explicitly asked', () => {
    let state = close(speak(createSpeech(), 'before', pre()));
    state = speak(state, 'before', pre(), { again: true });
    expect(state.open).toBe(true);
  });

  it('can forget framing history', () => {
    const state = forget(close(speak(createSpeech(), 'before', pre())));
    expect(state.heard).toEqual([]);
    expect(speak(state, 'before', pre()).open).toBe(true);
  });
});

describe('remembering framing between visits', () => {
  function fakeStore(behaviour = 'ok') {
    const map = new Map();
    return {
      get length() {
        return map.size;
      },
      key: (index) => [...map.keys()][index] ?? null,
      clear: () => map.clear(),
      getItem: (key) => (map.has(key) ? map.get(key) : null),
      setItem: (key, value) => {
        if (behaviour !== 'ok') throw new Error('QuotaExceededError');
        map.set(key, value);
      },
      removeItem: (key) => map.delete(key),
      _map: map,
    };
  }

  it('survives a round trip and can be cleared', () => {
    const store = fakeStore();
    expect(saveHeard('fixture', ['before', 'after'], store)).toBe(true);
    expect(loadHeard('fixture', store)).toEqual(['before', 'after']);
    clearHeard('fixture', store);
    expect(loadHeard('fixture', store)).toEqual([]);
  });

  it('reports when the device refuses storage', () => {
    expect(saveHeard('fixture', ['before'], fakeStore('full'))).toBe(false);
  });

  it('treats stored data as untrusted input', () => {
    const store = fakeStore();
    for (const junk of ['not json', '{"a":1}', '"hello"', 'null']) {
      store._map.set('reader.heard.v1.fixture', junk);
      expect(loadHeard('fixture', store)).toEqual([]);
    }
    store._map.set('reader.heard.v1.fixture', JSON.stringify(['before', 7, null, 'after']));
    expect(loadHeard('fixture', store)).toEqual(['before', 'after']);
  });

  it('keeps each book’s framing history separate', () => {
    const store = fakeStore();
    saveHeard('fixture', ['before'], store);
    expect(loadHeard('other', store)).toEqual([]);
  });
});
