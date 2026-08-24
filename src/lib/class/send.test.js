import { describe, it, expect } from 'vitest';
import { postSubmission, senderFor } from './send.js';

const API =
  'https://script.google.com/macros/s/AKfycbwABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abc/exec';

/* Enough of a Response for what postSubmission reads off it. Cast,
   because building a whole Response to answer two questions would make
   the test about Response. */
const reply = (body, ok = true) => /** @type {any} */ ({ ok, text: async () => body });

describe('getting one hand-in to the Sheet', () => {
  it('sends it, and says so when the Sheet confirms', async () => {
    const calls = [];
    const r = await postSubmission(
      API,
      { pass: 2 },
      {
        fetch: async (url, init) => (calls.push({ url, init }), reply('{"status":"ok"}')),
      }
    );
    expect(r).toEqual({ ok: true, confirmed: true, why: '' });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(API);
    expect(calls[0].init.method).toBe('POST');
    expect(JSON.parse(calls[0].init.body)).toEqual({ pass: 2 });
  });

  it('sends it as text/plain, or it never leaves the browser', async () => {
    /* a JSON content type makes the browser send a CORS preflight, and
       Apps Script does not answer one — the request fails before it is
       made, on every device, every time */
    let headers = /** @type {any} */ (null);
    await postSubmission(
      API,
      {},
      { fetch: async (u, i) => ((headers = i.headers), reply('{}')) }
    );
    expect(headers['Content-Type']).toMatch(/^text\/plain/);
  });

  it('believes the body, not the status', async () => {
    /* Apps Script answers 200 with the error inside */
    const r = await postSubmission(
      API,
      {},
      { fetch: async () => reply('{"status":"error","message":"no sheet"}') }
    );
    expect(r.ok).toBe(false);
    expect(r.why).toBe('refused');
  });

  it('accepts a reply that is not JSON but did work', async () => {
    const r = await postSubmission(API, {}, { fetch: async () => reply('<html>ok</html>') });
    expect(r.ok).toBe(true);
  });

  it('tries again without CORS when the reply cannot be read', async () => {
    const modes = [];
    const r = await postSubmission(
      API,
      {},
      {
        fetch: async (u, i) => {
          modes.push(i.mode);
          if (i.mode !== 'no-cors') throw new TypeError('Failed to fetch');
          return reply('');
        },
      }
    );
    expect(modes).toEqual([undefined, 'no-cors']);
    /* sent, and unconfirmable by construction — which is why it is
       second and not first */
    expect(r).toEqual({ ok: true, confirmed: false, why: 'opaque' });
  });

  it('reports a real failure rather than claiming it went', async () => {
    const r = await postSubmission(
      API,
      {},
      {
        fetch: async () => {
          throw new TypeError('Failed to fetch');
        },
      }
    );
    expect(r).toEqual({ ok: false, confirmed: false, why: 'offline' });
  });
});

describe('it does not take anybody’s word for the address', () => {
  it('refuses an endpoint that is not an Apps Script deployment', async () => {
    let called = false;
    for (const bad of [
      'https://evil.example/collect',
      'https://script.google.com/macros/s/../../evil/exec',
      '',
      null,
    ]) {
      const r = await postSubmission(
        bad,
        { name: 'Ana' },
        { fetch: async () => ((called = true), reply('{}')) }
      );
      expect(r.ok, String(bad)).toBe(false);
      expect(r.why).toBe('no-endpoint');
    }
    expect(called, 'a class’s names and writing went on the wire').toBe(false);
  });

  it('says so when there is no network at all to use', async () => {
    const r = await postSubmission(API, {}, { fetch: null });
    expect(r.why).toBe('no-network');
  });
});

describe('the shape the outbox wants', () => {
  it('is a payload in and a boolean out', async () => {
    const send = senderFor(API, { fetch: async () => reply('{"status":"ok"}') });
    expect(await send({ pass: 2 })).toBe(true);

    const bad = senderFor('https://evil.example/x', { fetch: async () => reply('{}') });
    expect(await bad({ pass: 2 })).toBe(false);
  });
});
