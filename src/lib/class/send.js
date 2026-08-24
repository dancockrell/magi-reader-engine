import { safeApi } from './key.js';

/**
 * Getting one hand-in to the teacher's Sheet.
 *
 * `text/plain` on purpose. A JSON content type makes the browser send a
 * CORS preflight, and Apps Script does not answer one — the request
 * fails before it is made, on every device, every time. Apps Script
 * reads the body itself, so the content type is a formality that costs
 * the whole feature if it is the honest one.
 *
 * If the reply is unreadable the send is tried once more with
 * `no-cors`. That mode hides the response, so success cannot be
 * confirmed — which is exactly why it is second and not first. It is
 * still better than dropping work: Apps Script did receive it.
 */

export const TIMEOUT_MS = 12_000;

/**
 * @param {string} api
 * @param {any} payload
 * @param {{fetch?: typeof globalThis.fetch, timeout?: number,
 *          signal?: AbortSignal}} [opts]
 * @returns {Promise<{ok: boolean, confirmed: boolean, why: string}>}
 */
export async function postSubmission(api, payload, opts = {}) {
  /* `?? ` and not `||`: passing null explicitly means "there is no
     network here", and falling back to the global one in that case
     would put a real request on the wire from a test that asked for
     none. */
  const doFetch = opts.fetch !== undefined ? opts.fetch : globalThis.fetch;
  const timeout = opts.timeout ?? TIMEOUT_MS;

  /* Checked here as well as where it is stored. This is the function
     that actually puts a class's names and writing on the wire, so it
     does not take anybody's word for the address. */
  if (!safeApi(api)) return { ok: false, confirmed: false, why: 'no-endpoint' };
  if (!doFetch) return { ok: false, confirmed: false, why: 'no-network' };

  const body = JSON.stringify(payload);
  const headers = { 'Content-Type': 'text/plain;charset=utf-8' };

  const withTimeout = async (init) => {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), timeout) : null;
    try {
      return await doFetch(api, { ...init, signal: opts.signal ?? ctl?.signal });
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  try {
    const res = await withTimeout({ method: 'POST', redirect: 'follow', headers, body });
    const text = await res.text();
    /* Apps Script answers 200 with an error in the body, so the status
       alone does not mean it worked. */
    let ok = res.ok;
    try {
      const j = JSON.parse(text);
      if (j && j.status === 'error') ok = false;
    } catch {
      /* not JSON — a redirect page or a login wall. Take the status. */
    }
    return ok
      ? { ok: true, confirmed: true, why: '' }
      : { ok: false, confirmed: true, why: 'refused' };
  } catch {
    /* The reply could not be read. Try once more in the mode that does
       not need to read it. */
  }

  try {
    await withTimeout({ method: 'POST', mode: 'no-cors', headers, body });
    /* Sent, and unconfirmable by construction. */
    return { ok: true, confirmed: false, why: 'opaque' };
  } catch {
    return { ok: false, confirmed: false, why: 'offline' };
  }
}

/**
 * A sender bound to one endpoint, in the shape the outbox wants:
 * a payload in, a boolean out.
 *
 * @param {string} api
 * @param {Parameters<typeof postSubmission>[2]} [opts]
 */
export const senderFor = (api, opts) => async (payload) =>
  (await postSubmission(api, payload, opts)).ok;
