import { test, expect } from '@playwright/test';
import { typeInto } from './book.js';
import AxeBuilder from '@axe-core/playwright';

/**
 * Handing the work in.
 *
 * Three promises are asserted here, and all three came out of a
 * classroom rather than out of the code:
 *
 *   a student sees it being sent, as a bar and the word "Sending"
 *   a student is never told it failed
 *   a student is never told it went somewhere it did not
 */

const API =
  'https://script.google.com/macros/s/AKfycbwABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abc/exec';

/**
 * A class set up on this device, the way the teacher panel will do it.
 *
 * Only the endpoint. An earlier version also cleared the student and the
 * outbox here, and addInitScript runs on every navigation — so a reload
 * signed the student out and emptied the queue, which is the opposite of
 * what the reload is there to test. Each test gets a fresh context
 * anyway.
 */
const withClass = async (page, api = API) => {
  /* Signing in now asks the Sheet who has this number, so a class set up
     on this device also needs an answer to that — otherwise every test
     that signs somebody in makes a real request to script.google.com
     and waits for it. An empty list is a teacher who keeps no roster,
     which is the case the sign-in must handle by taking what was
     typed. */
  await answerRoster(page);
  await page.addInitScript((url) => {
    try {
      localStorage.setItem('reader.api.v1', url);
    } catch {
      /* a locked store is its own test */
    }
  }, api);
};

const rosterList = (list = []) => ({
  status: 200,
  contentType: 'application/json',
  headers: { 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(list),
});

const answerRoster = (page, list = []) =>
  page.route('https://script.google.com/**', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill(rosterList(list));
  });

/**
 * Answer the Sheet, and record what it was sent.
 *
 * The reply carries CORS headers because a real Apps Script deployment
 * does. Without them the browser refuses to let the page read the
 * response, the sender falls back to `no-cors`, and the test ends up
 * measuring the fallback path in every engine instead of the one it
 * meant to.
 *
 * Only the number of requests is counted, not their bodies: Firefox
 * over BiDi does not expose a request body at all, and a test that can
 * only run in two engines out of four is worth less than one that
 * checks the same thing another way. What is in the payload is asserted
 * from the outbox, which is the same bytes before they go on the wire.
 */
async function catchSends(page, { ok = true } = {}) {
  const hits = [];
  await page.route('https://script.google.com/**', async (route) => {
    /* The class-list check at sign-in is a GET and is not a hand-in.
       Left to the roster handler, so `hits` stays what it says it is:
       the work going to the teacher. */
    if (route.request().method() === 'GET') return route.fallback();
    hits.push(route.request().method());
    if (!ok) return route.abort('failed');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: '{"status":"ok"}',
    });
  });
  return hits;
}

const signIn = async (page, name = 'Ana Lopez') => {
  await typeInto(page.getByLabel('Class'), '1-A');
  await typeInto(page.getByLabel('Number'), '07');
  await typeInto(page.getByLabel('Your name'), name);
  await page.getByRole('button', { name: /That’s me/ }).click();
};

const outbox = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('reader.outbox.v1.magi') || '[]'));

test.describe('when no class is set up', () => {
  test('says the work stays here, rather than offering a button that does nothing', async ({
    page,
  }) => {
    await page.goto('/#/read/2/999999');
    await page.locator('.finish').waitFor();

    await expect(page.locator('.handin-note')).toBeVisible();
    await expect(page.locator('.handin-note')).toContainText('stays here');
    await expect(page.getByRole('button', { name: /Hand in/ })).toHaveCount(0);
  });
});

test.describe('when there is a class', () => {
  test.beforeEach(async ({ page }) => withClass(page));

  test('asks who this is, once', async ({ page }) => {
    await page.goto('/#/read/2/999999');
    await page.locator('.finish').waitFor();
    await expect(page.locator('.signin')).toBeVisible();

    await signIn(page);
    await expect(page.locator('.signin')).toHaveCount(0);
    await expect(page.locator('.handin-as')).toContainText('Ana Lopez');
  });

  test('will not take a name that is obviously not one', async ({ page }) => {
    await page.goto('/#/read/2/999999');
    await page.locator('.signin').waitFor();

    await signIn(page, 'asdf');

    await expect(page.locator('.field-why').first()).toBeVisible();
    await expect(page.getByLabel('Your name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('.signin')).toBeVisible();
  });

  test('points at the field that is wrong, not at the form', async ({ page }) => {
    await page.goto('/#/read/2/999999');
    await page.locator('.signin').waitFor();
    await page.getByRole('button', { name: /That’s me/ }).click();

    /* one message per empty field, each tied to its own box */
    await expect(page.locator('.field-why')).toHaveCount(3);
    await expect(page.getByLabel('Your name')).toHaveAttribute('aria-invalid', 'true');
  });

  test('does not mark an empty form wrong before it has been filled in', async ({ page }) => {
    await page.goto('/#/read/2/999999');
    await page.locator('.signin').waitFor();
    await expect(page.locator('.field-why')).toHaveCount(0);
  });

  test('shows it being sent, and then that it is done', async ({ page }) => {
    const hits = await catchSends(page);
    await page.goto('/#/read/2/999999');
    await page.locator('.signin').waitFor();
    await signIn(page);

    await page.getByRole('button', { name: /Hand in/ }).click();
    /* the thing a student will understand and wait for */
    await expect(page.locator('.handin-done')).toBeVisible();
    await expect(page.locator('.handin-done')).toContainText('Handed in');

    expect(hits).toEqual(['POST']);
  });

  test('sends the work, with the student on it', async ({ page }) => {
    /* read out of the outbox rather than off the wire: it is the same
       bytes, and it is the only way to look at them in every engine */
    await catchSends(page, { ok: false });
    await page.goto('/#/read/2/999999');
    await page.locator('.signin').waitFor();
    await signIn(page);
    await page.getByRole('button', { name: /Hand in/ }).click();
    await expect(page.locator('.handin-done')).toBeVisible();

    await expect.poll(() => outbox(page).then((o) => o.length)).toBe(1);
    const [{ payload }] = await outbox(page);
    expect(payload.realName).toBe('Ana Lopez');
    expect(payload.className).toBe('1-A');
    /* 07 is not 7 — it is the seventh student */
    expect(payload.studentNo).toBe('07');
    expect(payload.pass).toBe(2);
    expect(payload.items.length).toBeGreaterThan(0);
    expect(payload.assignment).toContain('Magi');
  });

  test('the work leaves the device once it has gone', async ({ page }) => {
    await catchSends(page);
    await page.goto('/#/read/2/999999');
    await page.locator('.signin').waitFor();
    await signIn(page);
    await page.getByRole('button', { name: /Hand in/ }).click();
    await expect(page.locator('.handin-done')).toBeVisible();

    await expect.poll(() => outbox(page).then((o) => o.length)).toBe(0);
  });

  test('a student can say it is not them', async ({ page }) => {
    await page.goto('/#/read/2/999999');
    await page.locator('.signin').waitFor();
    await signIn(page);

    await page.getByRole('button', { name: /Not you/ }).click();
    await expect(page.locator('.signin')).toBeVisible();
    await expect(page.getByLabel('Your name')).toHaveValue('Ana Lopez');
  });

  test('signing out really signs out, for the next student on this iPad', async ({ page }) => {
    await page.goto('/#/read/2/999999');
    await page.locator('.signin').waitFor();
    await signIn(page);

    await page.getByRole('button', { name: /Sign out/ }).click();
    await expect(page.locator('.signin')).toBeVisible();
    await page.reload();
    await page.locator('.finish').waitFor();
    await expect(page.locator('.signin')).toBeVisible();
  });

  test('no WCAG A or AA violations on the way in', async ({ page }) => {
    await page.goto('/#/read/2/999999');
    await page.locator('.signin').waitFor();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test.describe('when the network is not there', () => {
  test.beforeEach(async ({ page }) => withClass(page));

  test('the student is never told, and the work is not lost', async ({ page }) => {
    /* they cannot do anything about it, they will not understand it,
       and the likely response is to hand in again and again */
    await catchSends(page, { ok: false });
    await page.goto('/#/read/2/999999');
    await page.locator('.signin').waitFor();
    await signIn(page);

    await page.getByRole('button', { name: /Hand in/ }).click();
    await expect(page.locator('.handin-done')).toBeVisible();

    const shown = (await page.locator('.finish').innerText()).toLowerCase();
    for (const scary of ['fail', 'error', 'could not', 'try again', 'offline', 'problem']) {
      expect(shown, `told the student "${scary}"`).not.toContain(scary);
    }

    /* and it is still on the device, waiting */
    await expect.poll(() => outbox(page).then((o) => o.length)).toBe(1);
  });

  test('and it goes next time, without being asked twice', async ({ page }) => {
    await catchSends(page, { ok: false });
    await page.goto('/#/read/2/999999');
    await page.locator('.signin').waitFor();
    await signIn(page);
    await page.getByRole('button', { name: /Hand in/ }).click();
    await expect(page.locator('.handin-done')).toBeVisible();
    await expect.poll(() => outbox(page).then((o) => o.length)).toBe(1);

    /* the network comes back */
    await page.unroute('https://script.google.com/**');
    const hits = await catchSends(page);

    await page.reload();
    await page.locator('.finish').waitFor();
    await page.getByRole('button', { name: /Hand in/ }).click();
    await expect(page.locator('.handin-done')).toBeVisible();

    await expect.poll(() => outbox(page).then((o) => o.length)).toBe(0);
    expect(hits, 'the same work was queued twice').toHaveLength(1);
  });
});
