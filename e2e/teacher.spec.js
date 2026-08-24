import { test, expect } from '@playwright/test';
import { typeInto } from './book.js';
import AxeBuilder from '@axe-core/playwright';

/**
 * The teacher's side.
 *
 * There is nothing to log in to: setting a class up on a device is what
 * makes you its teacher, because nobody else was there. Everything here
 * follows from that, and the two things that follow most sharply are
 * asserted hardest — the class key is the way back and the reset button
 * is not, and the link the class gets is not the key.
 */

const API =
  'https://script.google.com/macros/s/AKfycbwABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abc/exec';

const setUpClass = async (page, name = '1-A') => {
  await page.goto('/#/class');
  await page.locator('.klass').waitFor();
  await typeInto(page.getByLabel('Class name'), name);
  await page.getByRole('button', { name: 'Set up this class' }).click();
  await expect(page.locator('.keybox').first()).toBeVisible();
};

const connectSheet = async (page, url = API) => {
  await typeInto(page.getByLabel('Apps Script web app link'), url);
  await page.getByRole('button', { name: 'Connect' }).click();
};

const stored = (page, key) => page.evaluate((k) => localStorage.getItem(k), key);

test.describe('setting a class up', () => {
  test('is the thing that makes you its teacher', async ({ page }) => {
    await page.goto('/#/class');
    await expect(page.getByRole('button', { name: 'Set up this class' })).toBeVisible();
    /* nothing to log in to */
    await expect(page.locator('input[type="password"]')).toHaveCount(0);

    await setUpClass(page);
    await expect(page.locator('.klass-which')).toHaveText('1-A');
  });

  test('gives a class key that says it is the way back', async ({ page }) => {
    await setUpClass(page);
    const key = await page.locator('.keybox').first().textContent();
    expect(key.startsWith('RAVEN-')).toBe(true);

    const said = (await page.locator('.klass').innerText()).toLowerCase();
    expect(said).toContain('write this down');
    expect(said, 'never says the reset button is a way back').toContain(
      'the reset button is not'
    );
  });

  test('survives a reload, because a lesson is not one page load', async ({ page }) => {
    await setUpClass(page);
    const key = await page.locator('.keybox').first().textContent();
    await page.reload();
    await expect(page.locator('.keybox').first()).toHaveText(key);
  });
});

test.describe('the class key is the way to another device', () => {
  test('pastes back in and restores the class and the Sheet', async ({ page, context }) => {
    await setUpClass(page);
    await connectSheet(page);
    await expect(page.locator('.klass-note.ok').first()).toBeVisible();
    const key = await page.locator('.keybox').first().textContent();

    /* a different device: a context with none of this on it */
    const other = await context.browser().newPage();
    await other.goto(page.url().replace(/#.*/, '') + '#/class');
    await other.locator('.klass').waitFor();
    await expect(other.getByRole('button', { name: 'Set up this class' })).toBeVisible();

    await typeInto(other.getByLabel('Class key'), key);
    await other.getByRole('button', { name: 'Use this key' }).click();

    await expect(other.locator('.klass-which')).toHaveText('1-A');
    /* and the gradebook came with it, which is the whole point */
    await expect(other.locator('.klass-note.ok').first()).toContainText('Connected');
    await other.close();
  });

  test('says so plainly when what was pasted is not a key', async ({ page }) => {
    await page.goto('/#/class');
    await typeInto(page.getByLabel('Class key'), 'RAVEN-not-a-real-key');
    await page.getByRole('button', { name: 'Use this key' }).click();

    await expect(page.locator('.klass-said')).toContainText('does not look like a class key');
    await expect(page.getByRole('button', { name: 'Set up this class' })).toBeVisible();
  });
});

test.describe('connecting the Sheet', () => {
  test.beforeEach(async ({ page }) => setUpClass(page));

  test('takes a real deployment link', async ({ page }) => {
    await connectSheet(page);
    await expect(page.locator('.klass-note.ok').first()).toContainText('Connected');
    expect(await stored(page, 'raven.api.v1')).toBe(API);
  });

  test('refuses one that is not, and says which part is wrong', async ({ page }) => {
    /* the usual cause is pasting the editor URL rather than the
       deployment URL, and "invalid link" does not help anyone find that */
    await connectSheet(page, 'https://script.google.com/home/projects/abc/edit');
    await expect(page.locator('.klass-said')).toContainText('/exec');
    expect(await stored(page, 'raven.api.v1')).toBeNull();
  });

  test('refuses a link that walks the path to somebody else’s script', async ({ page }) => {
    /* on the right host, pointing at a deployment anybody can publish */
    await connectSheet(page, 'https://script.google.com/macros/s/../../evil/exec');
    expect(await stored(page, 'raven.api.v1')).toBeNull();
  });

  test('refuses another host outright', async ({ page }) => {
    await connectSheet(page, 'https://evil.example/collect');
    expect(await stored(page, 'raven.api.v1')).toBeNull();
  });
});

test.describe('the link the class gets', () => {
  test('is not the class key, and cannot be used as one', async ({ page, context }) => {
    await setUpClass(page);
    await connectSheet(page);

    const key = await page.locator('.keybox').first().textContent();
    const link = await page.locator('.keybox.small').last().textContent();
    expect(link).toContain('#/?join=');
    expect(link, 'the class key was in the student link').not.toContain(
      key.replace('RAVEN-', '').slice(0, 20)
    );

    /* a student opens it: they get the Sheet, and nothing else */
    const student = await context.browser().newPage();
    await student.goto(link);
    await student.locator('main').waitFor();

    expect(await stored(student, 'raven.api.v1')).toBe(API);
    expect(
      await stored(student, 'raven.teacher.owner.v1'),
      'the link made a teacher'
    ).toBeNull();

    await student.goto(link.replace(/#.*/, '') + '#/class');
    await expect(student.getByRole('button', { name: 'Set up this class' })).toBeVisible();
    await student.close();
  });

  test('is taken out of the address bar once it has been used', async ({ page, context }) => {
    await setUpClass(page);
    await connectSheet(page);
    const link = await page.locator('.keybox.small').last().textContent();

    const student = await context.browser().newPage();
    await student.goto(link);
    await student.locator('main').waitFor();
    await expect.poll(() => student.url()).not.toContain('join=');
    /* and it still took effect */
    expect(await stored(student, 'raven.api.v1')).toBe(API);
    await student.close();
  });
});

test.describe('starting over', () => {
  test.beforeEach(async ({ page }) => setUpClass(page));

  test('will not happen by accident', async ({ page }) => {
    const wipe = page.getByRole('button', { name: /Delete everything/ });
    await expect(wipe).toBeDisabled();

    await typeInto(page.getByLabel('Type DELETE to confirm'), 'delete please');
    await expect(wipe).toBeDisabled();

    await typeInto(page.getByLabel('Type DELETE to confirm'), 'DELETE');
    await expect(wipe).toBeEnabled();
  });

  test('takes the class with it, so nobody resets their way in', async ({ page }) => {
    /* somebody who resets their way past this arrives in an empty room,
       which is the point */
    await connectSheet(page);
    await typeInto(page.getByLabel('Type DELETE to confirm'), 'DELETE');
    await page.getByRole('button', { name: /Delete everything/ }).click();

    await expect(page.getByRole('button', { name: 'Set up this class' })).toBeVisible();
    expect(await stored(page, 'raven.teacher.owner.v1')).toBeNull();
    expect(await stored(page, 'raven.api.v1')).toBeNull();
    expect(await stored(page, 'raven.student.v1')).toBeNull();
  });
});

test.describe('what is waiting to be sent', () => {
  test('says nothing is, when nothing is', async ({ page }) => {
    await setUpClass(page);
    await expect(page.locator('.card').last()).toBeVisible();
    await expect(page.locator('.klass')).toContainText('Nothing is waiting');
  });

  test('counts what a student handed in while the network was down', async ({ page }) => {
    await setUpClass(page);
    await connectSheet(page);
    await page.route('https://script.google.com/**', (route) => route.abort('failed'));

    await page.goto('/#/read/2/999999');
    await page.locator('.signin').waitFor();
    await typeInto(page.getByLabel('Class'), '1-A');
    await typeInto(page.getByLabel('Number'), '07');
    await typeInto(page.getByLabel('Your name'), 'Ana Lopez');
    await page.getByRole('button', { name: /That’s me/ }).click();
    await page.getByRole('button', { name: /Hand in/ }).click();
    await expect(page.locator('.handin-done')).toBeVisible();

    await page.goto('/#/class');
    await expect(page.locator('.klass')).toContainText('1 piece of work');
    await expect(page.locator('.klass')).toContainText('not reached the Sheet yet');
  });
});

test.describe('the teacher’s side is accessible', () => {
  test('no WCAG A or AA violations before setup', async ({ page }) => {
    await page.goto('/#/class');
    await page.locator('.klass').waitFor();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('and none after it', async ({ page }) => {
    await setUpClass(page);
    await connectSheet(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
