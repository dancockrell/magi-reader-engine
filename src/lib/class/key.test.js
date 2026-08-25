import { describe, it, expect } from 'vitest';
import {
  toB32,
  fromB32,
  safeApi,
  randomId,
  mintOwner,
  classKey,
  readClassKey,
  loadOwner,
  saveOwner,
  loadApi,
  saveApi,
  isTeacher,
  joinCode,
  readJoin,
} from './key.js';

const GOOD_API =
  'https://script.google.com/macros/s/AKfycbwABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abc/exec';

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

describe('the endpoint a key can carry', () => {
  it('accepts a real Apps Script deployment', () => {
    expect(safeApi(GOOD_API)).toBe(true);
  });

  it('refuses a path walk that lands on the right host', () => {
    /* the attack a tampered key would carry: on script.google.com, and
       pointing at a completely different deployment that anybody can
       publish. An origin check accepts this. */
    expect(safeApi('https://script.google.com/macros/s/../../evil/exec')).toBe(false);
    expect(safeApi('https://script.google.com/macros/s/AAAAAAAAAAAAAAAAAA/../evil/exec')).toBe(
      false
    );
  });

  it('refuses anything with something after /exec', () => {
    expect(safeApi(GOOD_API + '?to=elsewhere')).toBe(false);
    expect(safeApi(GOOD_API + '/../x')).toBe(false);
    expect(safeApi(GOOD_API + '#x')).toBe(false);
  });

  it('refuses another host, another scheme, and nothing at all', () => {
    for (const bad of [
      'https://evil.example/macros/s/AAAAAAAAAAAAAAAAAA/exec',
      'http://script.google.com/macros/s/AAAAAAAAAAAAAAAAAA/exec',
      'https://script.google.com.evil.example/macros/s/AAAAAAAAAAAAAAAAAA/exec',
      'javascript:alert(1)',
      '',
      null,
      undefined,
      {},
    ]) {
      expect(safeApi(bad), String(bad)).toBe(false);
    }
  });

  it('refuses a deployment id too short to be one', () => {
    expect(safeApi('https://script.google.com/macros/s/abc/exec')).toBe(false);
  });
});

describe('the alphabet a person has to copy', () => {
  it('round trips, including a class name that is not English', () => {
    for (const s of ['plain', '1-A 담임', '{"v":1,"id":"abc"}', '🙂']) {
      expect(fromB32(toB32(s))).toBe(s);
    }
  });

  it('has nothing in it that can be confused when read aloud', () => {
    /* Crockford's rule: no I, L, O or U — so nothing looks like 1 or 0,
       and nothing spells anything unfortunate */
    const alphabet = new Set(toB32('the quick brown fox jumped over 0123456789'));
    for (const bad of ['I', 'L', 'O', 'U']) expect(alphabet.has(bad), bad).toBe(false);
  });

  it('does not care about case, which is the whole point', () => {
    const s = toB32('{"v":1,"id":"abcdef"}');
    expect(fromB32(s.toLowerCase())).toBe(fromB32(s));
  });

  it('forgives the mistakes a person makes copying by hand', () => {
    const s = toB32('a class key');
    /* I and L read as 1, O reads as 0 — and spaces and dashes are noise */
    const written = s.replace(/1/g, 'l').replace(/0/g, 'O');
    expect(fromB32(written)).toBe('a class key');
    expect(fromB32(s.replace(/(.{4})/g, '$1 - '))).toBe('a class key');
  });

  it('gives back nothing for something that is not base32 at all', () => {
    expect(fromB32('!!!!')).toBe('');
    expect(fromB32('')).toBe('');
  });
});

describe('minting the identity', () => {
  it('happens once, at setup, with an id nobody can guess', () => {
    const a = mintOwner('1-A');
    const b = mintOwner('1-A');
    expect(a.id).toHaveLength(32);
    expect(a.id).toMatch(/^[0-9a-f]{32}$/);
    expect(a.id).not.toBe(b.id);
    expect(a.cls).toBe('1-A');
    expect(a.at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('still mints without crypto, rather than failing to set up a class', () => {
    let n = 0;
    const id = randomId(16, () => ((n = (n * 9301 + 49297) % 233280), n / 233280));
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('is what makes somebody the teacher', () => {
    expect(isTeacher(mintOwner('1-A'))).toBe(true);
    expect(isTeacher(null)).toBe(false);
    expect(isTeacher({ cls: '1-A' })).toBe(false);
  });
});

describe('the key the teacher writes down', () => {
  it('round trips the identity, the class and the Sheet', () => {
    const owner = mintOwner('1-A');
    const back = readClassKey(classKey(owner, GOOD_API));
    expect(back).toEqual({ id: owner.id, cls: '1-A', api: GOOD_API });
  });

  it('still reads a key issued under the old prefix', () => {
    /* Keys used to start with RAVEN, after a product name that lasted a
       day. One already written on a board has to keep working, so
       readClassKey strips either prefix. */
    const owner = mintOwner('2-B');
    const old = classKey(owner, GOOD_API).replace(/^CLASS-/, 'RAVEN-');

    expect(readClassKey(old)).toEqual({ id: owner.id, cls: '2-B', api: GOOD_API });
    /* and down the paper-and-retype path, where a prefix that is not
       recognised decodes as payload and fails quietly instead */
    expect(readClassKey(' ' + old.toLowerCase().replace(/-/g, ' ') + '\n')?.cls).toBe('2-B');
  });

  it('is grouped in fives, and stays a length a person will copy', () => {
    const key = classKey(mintOwner('1-A'), GOOD_API);
    expect(key.startsWith('CLASS-')).toBe(true);
    /* Not a round number — a bound, so that a change which doubles it
       fails here rather than in a staffroom. Most of it is the Apps
       Script deployment id, which the key has to carry: one that
       restores your identity but not your gradebook has not solved the
       dead-laptop problem. */
    expect(key.length).toBeLessThan(180);
    for (const g of key.replace(/^CLASS-/, '').split('-'))
      expect(g.length).toBeLessThanOrEqual(5);
  });

  it('survives being written on paper and retyped', () => {
    /* the path the key exists for, and the one base64url silently
       failed: wrong case, spaces instead of dashes, an l for a 1 */
    const key = classKey(mintOwner('1-A'), GOOD_API);
    const written = ' ' + key.toLowerCase().replace(/-/g, ' ') + '\n';
    expect(readClassKey(written)?.cls).toBe('1-A');
    expect(readClassKey(written)?.api).toBe(GOOD_API);
  });

  it('works with no Sheet connected yet', () => {
    const owner = mintOwner('');
    const back = readClassKey(classKey(owner));
    expect(back).toEqual({ id: owner.id, cls: '', api: '' });
  });

  it('never carries an endpoint that is not an Apps Script deployment', () => {
    /* it would be refused on the way back in anyway, so carrying it is
       dead weight in something a person has to copy */
    const owner = mintOwner('1-A');
    const back = readClassKey(classKey(owner, 'https://evil.example/collect'));
    expect(back.id).toBe(owner.id);
    expect(back.api).toBe('');
  });

  it('refuses a hand-made key whose deployment id walks the path', () => {
    /* the real attack: a key handed to a teacher that quietly points a
       whole class's names and writing at somebody else's script */
    const forged = 'RAVEN-' + toB32(`1|${'a'.repeat(32)}|../../evil|1-A`);
    expect(readClassKey(forged).api).toBe('');
  });

  it('keeps a class name that has a pipe in it', () => {
    const owner = mintOwner('1-A | period 4');
    expect(readClassKey(classKey(owner)).cls).toBe('1-A | period 4');
  });

  it('is nothing at all for anything that is not a key', () => {
    for (const bad of [
      '',
      '   ',
      'RAVEN-',
      'RAVEN-!!!!!!',
      'hello',
      toB32('2|abc|dep|1-A'), // a key from a version this does not know
      toB32('1|abc|dep'), // truncated
      toB32('1||dep|1-A'), // no identity in it
      toB32('nothing like a key at all'),
    ]) {
      expect(readClassKey(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it('gives nothing for an owner that was never minted', () => {
    expect(classKey(null)).toBe('');
    expect(classKey({ cls: '1-A' })).toBe('');
  });
});

describe('the link the class gets', () => {
  it('points a device at the Sheet', () => {
    const back = readJoin(joinCode(GOOD_API, '1-A'));
    expect(back).toEqual({ api: GOOD_API, cls: '1-A' });
  });

  it('carries no identity at all', () => {
    /* The prototype handed students the class key, so the link a
       teacher writes on the board was also the thing that makes you the
       teacher. Anyone who kept it could open the gradebook. */
    const owner = mintOwner('1-A');
    const code = joinCode(GOOD_API, '1-A');
    expect(code).not.toContain(owner.id);
    expect(readClassKey(code), 'a join code was accepted as a class key').toBeNull();
    expect(Object.keys(readJoin(code))).toEqual(['api', 'cls']);
  });

  it('is not made at all without a real deployment to point at', () => {
    expect(joinCode('https://evil.example/collect', '1-A')).toBe('');
    expect(joinCode('', '1-A')).toBe('');
  });

  it('refuses one that was tampered with', () => {
    expect(readJoin(toB32('J1|../../evil|1-A'))).toBeNull();
    expect(readJoin(toB32('J1||1-A'))).toBeNull();
    expect(readJoin(toB32('1|abc|dep|1-A')), 'a class key was read as a join code').toBeNull();
    for (const bad of ['', 'nonsense!!', toB32('J2|x|y')]) expect(readJoin(bad)).toBeNull();
  });

  it('survives being retyped, like everything else a person copies', () => {
    const code = joinCode(GOOD_API, '1-A');
    expect(readJoin(' ' + code.toLowerCase().replace(/(.{4})/g, '$1 ') + ' ')).toEqual({
      api: GOOD_API,
      cls: '1-A',
    });
  });
});

describe('where it is kept', () => {
  it('round trips through the store', () => {
    const s = fakeStore();
    const owner = mintOwner('1-A');
    expect(saveOwner(owner, s)).toBe(true);
    expect(loadOwner(s)).toEqual(owner);
  });

  it('treats what is in the store as input, not truth', () => {
    const s = fakeStore();
    for (const junk of ['not json', 'null', '[]', '"a string"', '{"cls":"1-A"}', '{"id":""}']) {
      s._map.set('reader.teacher.owner.v1', junk);
      expect(loadOwner(s), junk).toBeNull();
    }
  });

  it('will not store an endpoint that did not pass the check', () => {
    const s = fakeStore();
    expect(saveApi('https://evil.example/collect', s)).toBe(false);
    expect(s._map.size).toBe(0);
    expect(saveApi(GOOD_API, s)).toBe(true);
    expect(loadApi(s)).toBe(GOOD_API);
  });

  it('will not hand back one that was tampered with in the store', () => {
    /* the store is on a device a student also holds */
    const s = fakeStore();
    s._map.set('reader.api.v1', 'https://evil.example/collect');
    expect(loadApi(s)).toBe('');
  });

  it('says so when the device will not save, rather than pretending', () => {
    expect(saveOwner(mintOwner('1-A'), fakeStore('full'))).toBe(false);
    expect(saveApi(GOOD_API, fakeStore('full'))).toBe(false);
  });
});
