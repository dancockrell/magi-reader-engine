import { describe, it, expect } from 'vitest';
import {
  cleanName,
  cleanNumber,
  looksLikeJunk,
  normaliseStudent,
  problemsWith,
  canSignIn,
  loadStudent,
  saveStudent,
  forgetStudent,
  label,
  MAX_NAME,
} from './student.js';
import { queue, queueKey, flush, waiting, loadOutbox, saveOutbox, LIMIT } from './outbox.js';

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

const ANA = { cls: '1-A', no: '07', name: 'Ana Lopez', nick: 'Ana' };

describe('a name, cleaned at the door', () => {
  it('collapses the spacing a phone keyboard leaves behind', () => {
    expect(cleanName('  Ana   Lopez ')).toBe('Ana Lopez');
  });

  it('takes out what is invisible', () => {
    /* these look fine on screen and are wrong in a filename, a CSV, and
       a teacher's search box */
    expect(cleanName('Ana​Lopez')).toBe('AnaLopez');
    expect(cleanName('Ana Lopez')).toBe('Ana Lopez');
    expect(cleanName('﻿Ana')).toBe('Ana');
    expect(cleanName('‮Ana')).toBe('Ana');
  });

  it('keeps a name that is not written in English', () => {
    expect(cleanName('김민수')).toBe('김민수');
    expect(cleanName('Николай')).toBe('Николай');
    expect(cleanName('สมชาย')).toBe('สมชาย');
  });

  it('is bounded, so one column cannot eat the sheet', () => {
    expect(cleanName('x'.repeat(200))).toHaveLength(MAX_NAME);
  });

  it('survives nothing at all', () => {
    for (const v of [null, undefined, 0, {}]) expect(typeof cleanName(v)).toBe('string');
  });
});

describe('a student number', () => {
  it('keeps its leading zero, because 07 is not 7', () => {
    expect(cleanNumber('07')).toBe('07');
  });

  it('keeps the dash some schools use', () => {
    expect(cleanNumber('1-07')).toBe('1-07');
  });

  it('drops what is not part of a number', () => {
    expect(cleanNumber(' 0 7 !! ')).toBe('07');
  });
});

describe('obviously not a name', () => {
  it('catches the back row', () => {
    for (const junk of ['a', 'aaaa', '1111', 'asdf', 'test', 'N/A', '....', '   ']) {
      expect(looksLikeJunk(junk), junk).toBe(true);
    }
  });

  it('does not catch a real name in any alphabet', () => {
    for (const real of [
      'Ana Lopez',
      '김민수',
      'สมชาย',
      'Николай',
      '田中',
      "O'Brien",
      'Nguyễn',
    ]) {
      expect(looksLikeJunk(real), real).toBe(false);
    }
  });
});

describe('signing in', () => {
  it('takes four fields and cleans all of them', () => {
    const s = normaliseStudent({
      cls: ' 1-A ',
      no: ' 07 ',
      name: ' Ana  Lopez ',
      nick: ' Ana ',
    });
    expect(s).toEqual(ANA);
  });

  it('does not make anybody invent a nickname', () => {
    expect(normaliseStudent({ ...ANA, nick: '' }).nick).toBe('Ana Lopez');
  });

  it('says what is missing, field by field', () => {
    const p = problemsWith({ cls: '', no: '', name: '' });
    expect(Object.keys(p).sort()).toEqual(['cls', 'name', 'no']);
    for (const msg of Object.values(p)) expect(msg).toMatch(/\?|\./);
  });

  it('asks for a real name rather than accepting asdf', () => {
    expect(problemsWith({ ...ANA, name: 'asdf' }).name).toBeTruthy();
  });

  it('wants a digit in the number', () => {
    expect(problemsWith({ ...ANA, no: 'abc' }).no).toBeTruthy();
    expect(problemsWith({ ...ANA, no: '07' }).no).toBeUndefined();
  });

  it('lets a complete one through', () => {
    expect(canSignIn(ANA)).toBe(true);
  });

  it('reads as a person, for a header or a filename', () => {
    expect(label(ANA)).toBe('1-A · 07 · Ana Lopez');
    expect(label(null)).toBe('');
  });
});

describe('remembering who is signed in', () => {
  it('round trips', () => {
    const s = fakeStore();
    expect(saveStudent(ANA, s)).toBe(true);
    expect(loadStudent(s)).toEqual(ANA);
  });

  it('signing out really signs out', () => {
    /* on a shared device this is the only thing between one student's
       work and the next student's name on it */
    const s = fakeStore();
    saveStudent(ANA, s);
    forgetStudent(s);
    expect(loadStudent(s)).toBeNull();
  });

  it('refuses a half-written record left by something else', () => {
    const s = fakeStore();
    for (const junk of ['not json', 'null', '[]', '{"cls":"1-A"}', '{"name":"asdf"}']) {
      s._map.set('reader.student.v1', junk);
      expect(loadStudent(s), junk).toBeNull();
    }
  });

  it('does not take the app down when the device will not save', () => {
    expect(saveStudent(ANA, fakeStore('full'))).toBe(false);
  });
});

/* ------------------------------------------------------------------ */

const payload = (pass, who = ANA) => ({
  className: who.cls,
  studentNo: who.no,
  realName: who.name,
  pass,
  items: [],
});

describe('work waiting to reach the teacher', () => {
  it('queues a hand-in', () => {
    const q = queue([], payload(2));
    expect(q).toHaveLength(1);
    expect(q[0].tries).toBe(0);
  });

  it('replaces rather than duplicating when the same work is sent again', () => {
    /* a student who presses the button again because nothing visibly
       happened must not produce two rows for a teacher to reconcile */
    let q = queue([], payload(2));
    q = queue(q, { ...payload(2), items: [1] });
    expect(q).toHaveLength(1);
    expect(q[0].payload.items).toEqual([1]);
  });

  it('keeps two readings from the same student apart', () => {
    let q = queue([], payload(2));
    q = queue(q, payload(3));
    expect(q).toHaveLength(2);
  });

  it('keeps two students apart', () => {
    let q = queue([], payload(2));
    q = queue(q, payload(2, { ...ANA, no: '08', name: 'Ben Ana' }));
    expect(q).toHaveLength(2);
    expect(queueKey(payload(2))).not.toBe(queueKey(payload(2, { ...ANA, no: '08' })));
  });

  it('does not grow without limit on a shared device', () => {
    let q = [];
    for (let n = 0; n < LIMIT + 20; n++) q = queue(q, payload(2, { ...ANA, no: String(n) }));
    expect(q).toHaveLength(LIMIT);
  });
});

describe('sending what is waiting', () => {
  const three = () => [payload(1), payload(2), payload(3)].reduce((q, p) => queue(q, p), []);

  it('empties the queue when the network is there', async () => {
    const seen = [];
    const r = await flush(three(), async (p) => (seen.push(p.pass), true));
    expect(r.sent).toBe(3);
    expect(r.items).toEqual([]);
    expect(seen).toEqual([1, 2, 3]);
  });

  it('goes one at a time, not all at once', async () => {
    /* thirty tablets firing six requests each is what made the network
       bad in the first place */
    let inFlight = 0;
    let most = 0;
    await flush(three(), async () => {
      inFlight += 1;
      most = Math.max(most, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return true;
    });
    expect(most).toBe(1);
  });

  it('stops at the first failure and keeps the rest', async () => {
    let n = 0;
    const r = await flush(three(), async () => ++n < 2);
    expect(r.sent).toBe(1);
    expect(r.items).toHaveLength(2);
    expect(n, 'did not keep hammering a network that just failed').toBe(2);
  });

  it('counts the attempt, so a stuck one can be told from a slow minute', async () => {
    let q = three();
    for (let n = 0; n < 3; n++) q = (await flush(q, async () => false)).items;
    expect(q[0].tries).toBe(3);
    expect(waiting(q).stuck).toBe(1);
  });

  it('treats a thrown request as a failure rather than losing the work', async () => {
    const r = await flush(three(), async () => {
      throw new Error('offline');
    });
    expect(r.sent).toBe(0);
    expect(r.items).toHaveLength(3);
  });

  it('says nothing is waiting when nothing is', () => {
    expect(waiting([])).toEqual({ count: 0, oldest: null, stuck: 0 });
  });

  it('tells a teacher how many and how long', () => {
    const q = [
      { id: 'a', at: 1000, tries: 0, payload: {} },
      { id: 'b', at: 500, tries: 0, payload: {} },
    ];
    expect(waiting(q)).toMatchObject({ count: 2, oldest: 500, stuck: 0 });
  });
});

describe('the outbox on the device', () => {
  it('round trips', () => {
    const s = fakeStore();
    const q = queue([], payload(2));
    expect(saveOutbox('magi', q, s)).toBe(true);
    expect(loadOutbox('magi', s)).toHaveLength(1);
  });

  it('ignores anything that is not a queue', () => {
    const s = fakeStore();
    for (const junk of ['not json', '{}', 'null', '[1,2,3]', '[{"id":1}]']) {
      s._map.set('reader.outbox.v1.magi', junk);
      expect(loadOutbox('magi', s), junk).toEqual([]);
    }
  });

  it('keeps books apart', () => {
    const s = fakeStore();
    saveOutbox('magi', queue([], payload(2)), s);
    expect(loadOutbox('other', s)).toEqual([]);
  });
});
