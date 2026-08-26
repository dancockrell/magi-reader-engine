import { describe, it, expect } from 'vitest';
import {
  lookupStudent,
  readAnswer,
  matchIn,
  sameNumber,
  hasMatch,
  rosterUrl,
  TIMEOUT_MS,
} from './roster.js';
import { canSignIn } from './student.js';

/**
 * Most of this file is failure paths, and that is the point.
 *
 * The roster is a convenience. Every test below that breaks something
 * asserts the same two things afterwards: the form was not handed a
 * name it should not have been handed, and the student can still sign
 * in with what they typed. If a change ever makes one of those fail,
 * the feature has become a lock on the classroom door and should be
 * taken out rather than fixed.
 */

const API =
  'https://script.google.com/macros/s/AKfycbwABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abc/exec';

/** What a student typed at the door. Valid on its own, with no roster
 *  anywhere in the world. */
const TYPED = { cls: '1-A', no: '07', name: 'Ana Lopez', nick: 'Ana' };

const ROSTER = [
  { studentNo: '06', nickname: 'Kev', realName: 'Kevin Park' },
  { studentNo: '07', nickname: 'Ana', realName: 'Ana Lopez' },
  { studentNo: '08', nickname: 'Kevin', realName: 'Kevin Choi' },
];

/** Enough of a Response for what the lookup reads off one. */
const reply = (body, ok = true) => /** @type {any} */ ({ ok, text: async () => body });

/** A clock the test drives by hand, so a six-second timeout costs no
 *  seconds and cannot flake. */
function handClock() {
  const pending = [];
  return {
    timers: {
      set: (fn) => (pending.push(fn), pending.length),
      clear: () => {},
    },
    tick: () => pending.splice(0).forEach((fn) => fn()),
    waiting: () => pending.length,
  };
}

/** The promise to check after anything goes wrong. */
function stillLetsThemIn(answer) {
  expect(hasMatch(answer), 'a failed lookup offered a name').toBe(false);
  expect(answer.match).toBe(null);
  expect(canSignIn(TYPED), 'a failed lookup blocked a student').toBe(true);
}

describe('a lookup that cannot complete never blocks sign-in', () => {
  it('does not call anything when no class is set up on this device', async () => {
    /* No roster configured is the same situation as no network: there
       is nothing to check against, so take their details rather than
       telling thirty students in a row that they do not exist. */
    let called = false;
    const answer = await lookupStudent('', TYPED, {
      fetch: async () => ((called = true), reply('[]')),
    });
    expect(answer.outcome).toBe('unconfigured');
    expect(called, 'a class name went on the wire with nowhere to send it').toBe(false);
    stillLetsThemIn(answer);
  });

  it('refuses an endpoint that is not an Apps Script deployment', async () => {
    /* Same check as the sender makes, for the same reason: a doctored
       class key would otherwise send a class name to a stranger. */
    let called = false;
    for (const bad of [
      'https://evil.example/roster',
      'https://script.google.com/macros/s/../../evil/exec',
      null,
    ]) {
      const answer = await lookupStudent(bad, TYPED, {
        fetch: async () => ((called = true), reply('[]')),
      });
      expect(answer.outcome, String(bad)).toBe('unconfigured');
      stillLetsThemIn(answer);
    }
    expect(called).toBe(false);
  });

  it('carries on when the network rejects the request', async () => {
    const answer = await lookupStudent(API, TYPED, {
      fetch: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    expect(answer.outcome).toBe('offline');
    stillLetsThemIn(answer);
  });

  it('carries on when there is no network to use at all', async () => {
    const answer = await lookupStudent(API, TYPED, { fetch: null });
    expect(answer.outcome).toBe('offline');
    stillLetsThemIn(answer);
  });

  it('carries on when the server answers with an error', async () => {
    /* An HTTP error is a roster we could not reach. Reading it as "this
       student does not exist" would be the same wrong answer for the
       whole class at once. */
    const answer = await lookupStudent(API, TYPED, {
      fetch: async () => reply('<html>Sorry, unable to open the file</html>', false),
    });
    expect(answer.outcome).toBe('offline');
    stillLetsThemIn(answer);
  });

  it('gives up waiting rather than holding the door shut', async () => {
    const clock = handClock();
    /* A fetch that never settles, and never will. Without the race this
       is a sign-in button that stays disabled for the rest of the
       lesson. */
    const pending = lookupStudent(API, TYPED, {
      fetch: () => new Promise(() => {}),
      timers: clock.timers,
    });
    expect(clock.waiting()).toBe(1);
    clock.tick();
    const answer = await pending;
    expect(answer.outcome).toBe('slow');
    stillLetsThemIn(answer);
  });

  it('waits the six seconds the prototype waited, and no longer', async () => {
    let asked = 0;
    await lookupStudent(API, TYPED, {
      fetch: () => new Promise(() => {}),
      timers: {
        set: (fn, ms) => ((asked = ms), fn(), 1),
        clear: () => {},
      },
    });
    expect(asked).toBe(TIMEOUT_MS);
    expect(TIMEOUT_MS).toBe(6000);
  });

  it('carries on when the body is not JSON', async () => {
    /* Apps Script answers a lost deployment with an HTML login wall,
       which parses as nothing at all. */
    const answer = await lookupStudent(API, TYPED, {
      fetch: async () => reply('<!doctype html><title>Sign in</title>'),
    });
    expect(answer.outcome).toBe('malformed');
    stillLetsThemIn(answer);
  });

  it('carries on when the JSON is not a class list', async () => {
    for (const body of ['null', '42', '"ok"', '{"status":"ok"}']) {
      const answer = await lookupStudent(API, TYPED, { fetch: async () => reply(body) });
      expect(answer.outcome, body).toBe('malformed');
      stillLetsThemIn(answer);
    }
  });

  it('treats a class with no roster row as nothing to check against', async () => {
    /* A teacher who keeps no Roster tab gets an empty list, and so does
       a class that is not on the one they keep. Neither is a student
       who does not exist. */
    const answer = await lookupStudent(API, TYPED, { fetch: async () => reply('[]') });
    expect(answer.outcome).toBe('unconfigured');
    stillLetsThemIn(answer);
  });

  it('says not-found when a real list simply does not have them', async () => {
    /* The one honest negative, and it still offers no name and stops
       nobody: a student who joined this morning is not on last term's
       list, and their work is not worth less for it. */
    const answer = await lookupStudent(
      API,
      { cls: '1-A', no: '31' },
      {
        fetch: async () => reply(JSON.stringify(ROSTER)),
      }
    );
    expect(answer.outcome).toBe('not-found');
    stillLetsThemIn(answer);
  });

  it('says not-found when the backend answers found:false', async () => {
    const answer = await lookupStudent(API, TYPED, {
      fetch: async () => reply('{"found":false}'),
    });
    expect(answer.outcome).toBe('not-found');
    stillLetsThemIn(answer);
  });
});

describe('when the class list does know who this is', () => {
  it('brings back the name and the nickname on the row', async () => {
    const calls = [];
    const answer = await lookupStudent(API, TYPED, {
      fetch: async (url) => (calls.push(url), reply(JSON.stringify(ROSTER))),
    });
    expect(answer.outcome).toBe('found');
    expect(hasMatch(answer)).toBe(true);
    expect(answer.match).toEqual({ no: '07', name: 'Ana Lopez', nick: 'Ana' });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('page=roster');
    expect(calls[0]).toContain('class=1-A');
  });

  it('understands the single-student answer the prototype expected', async () => {
    const answer = await lookupStudent(API, TYPED, {
      fetch: async () =>
        reply('{"found":true,"studentNo":"07","nickname":"Ana","realName":"Ana Lopez"}'),
    });
    expect(answer.outcome).toBe('found');
    expect(answer.match?.name).toBe('Ana Lopez');
  });

  it('cleans the name it was handed, exactly as a typed one is cleaned', async () => {
    /* The roster is a spreadsheet a human maintains, so it arrives with
       trailing spaces and the occasional invisible character pasted in
       from somewhere else. It goes in the same gradebook column. */
    const answer = await lookupStudent(API, TYPED, {
      fetch: async () =>
        reply(JSON.stringify([{ studentNo: '07', realName: '  Ana​   Lopez ' }])),
    });
    expect(answer.match?.name).toBe('Ana Lopez');
  });
});

describe('finding one student in a list', () => {
  it('forgives a leading zero the spreadsheet ate', () => {
    /* "07" is not 7 in storage — it is the seventh student, and the
       zero stays. But a teacher whose Sheet dropped it has written down
       the same child. */
    expect(sameNumber('07', '7')).toBe(true);
    expect(sameNumber('7', '07')).toBe(true);
    expect(sameNumber('7a', '7A')).toBe(true);
    expect(sameNumber('7', '17')).toBe(false);
    expect(sameNumber('', '')).toBe(false);
    expect(sameNumber('0', '00')).toBe(true);
  });

  it('takes the nickname for the name when that is all the row has', () => {
    expect(matchIn([{ studentNo: '3', nickname: 'Boo' }], '3')).toEqual({
      no: '3',
      name: 'Boo',
      nick: 'Boo',
    });
  });

  it('skips a row with a number and no person on it', () => {
    expect(matchIn([{ studentNo: '3' }, { studentNo: '3', realName: 'Mai' }], '3')?.name).toBe(
      'Mai'
    );
  });

  it('does not fall over on rubbish in the list', () => {
    expect(matchIn([null, 'x', 7, { studentNo: '9', realName: 'Yuki' }], '9')?.name).toBe(
      'Yuki'
    );
    expect(matchIn(null, '9')).toBe(null);
    expect(matchIn([], '9')).toBe(null);
  });
});

describe('the question the form asks of an answer', () => {
  it('is true for a match and false for every other outcome', () => {
    /* Written as one test on purpose: there is no third state. A new
       outcome added later is a name to offer or it is not, and it can
       never be a refusal. */
    expect(hasMatch(readAnswer(ROSTER, '07'))).toBe(true);
    for (const body of [[], ['junk'], { found: false }, null, 42]) {
      expect(hasMatch(readAnswer(body, '07')), JSON.stringify(body)).toBe(false);
    }
    expect(hasMatch(null)).toBe(false);
    expect(hasMatch(undefined)).toBe(false);
  });
});

describe('where the class list is asked for', () => {
  it('asks the route the backend actually serves', () => {
    /* The prototype's client asked for page=lookup, which no
       deployment has ever answered — it failed on every device and fell
       through to "take their details", which is why nobody noticed. */
    expect(rosterUrl(API, '1-A')).toBe(`${API}?page=roster&class=1-A`);
  });

  it('escapes a class name a teacher actually typed', () => {
    expect(rosterUrl(API, '3학년 2반')).toContain(encodeURIComponent('3학년 2반'));
    expect(rosterUrl(`${API}?v=2`, 'x')).toContain('&page=roster');
  });
});
