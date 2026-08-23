import { test, expect } from '@playwright/test';
import { at } from './book.js';
import AxeBuilder from '@axe-core/playwright';

/**
 * Navigation that behaves the way people already expect.
 *
 * This is the actual argument for the rebuild, and it is not styling. In
 * the legacy reader the Back button leaves the app, nothing has a URL, a
 * teacher cannot link to a screen, and a hand-rolled overlay let the
 * arrow keys drive the reading behind it. Every one of those is checked
 * here.
 */

/**
 * Drive history the way the browser's own button does.
 *
 * page.goBack() waits for a `load` event, and a hash change never fires
 * one — Chromium and WebKit resolve anyway, Firefox over BiDi waits the
 * full timeout. Calling history.back() and then asserting on what is on
 * screen tests the same thing and behaves the same in every engine.
 */
const back = (page) => page.evaluate(() => history.back());
const forward = (page) => page.evaluate(() => history.forward());

test.describe('the Back button', () => {
  test('goes back one screen instead of leaving', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Watch/ }).click();
    await expect(page.locator('.scene')).toBeVisible();

    await back(page);
    await expect(page.getByRole('heading', { name: 'The Gift of the Magi' })).toBeVisible();

    await forward(page);
    await expect(page.locator('.scene')).toBeVisible();
  });

  test('walks back through the reading a beat at a time', async ({ page }) => {
    await page.goto('/#/read/1/0');
    await page.locator('.scene').waitFor();
    await page.getByRole('button', { name: 'Next ›' }).click();
    await page.getByRole('button', { name: 'Next ›' }).click();
    await expect(page.locator('.count')).toHaveText(at(3));

    await back(page);
    await expect(page.locator('.count')).toHaveText(at(2));
  });
});

test.describe('every screen has a URL', () => {
  test('a beat can be linked to and survives a reload', async ({ page }) => {
    await page.goto('/#/read/1/42');
    /* waits on the transport rather than on .scene: a stop is a line, or
       somebody talking, or a question, and only the first of those is a
       .scene — a link has to land whichever it is */
    await page.locator('.transport').waitFor();
    await expect(page.locator('.count')).toHaveText(at(43));

    await page.reload();
    await page.locator('.transport').waitFor();
    await expect(page.locator('.count')).toHaveText(at(43));
  });

  test('a nonsense position is corrected rather than blanking the page', async ({ page }) => {
    /* a stale saved index used to throw before anything was drawn */
    for (const bad of ['9999', '-4', 'banana']) {
      await page.goto(`/#/read/1/${bad}`);
      await page.locator('.transport').waitFor();
      await expect(page.locator('.count')).toBeVisible();
    }
  });

  test('an unknown route lands on the gate rather than nothing', async ({ page }) => {
    await page.goto('/#/nowhere');
    await expect(page.getByRole('heading', { name: 'The Gift of the Magi' })).toBeVisible();
  });

  test('the doors lead somewhere and say where they are', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Vocabulary' }).click();
    await expect(page).toHaveURL(/#\/practise$/);
    await expect(page.locator('.opt').first()).toBeVisible();
  });
});

test.describe('overlays', () => {
  test('open as a real modal and close on Escape', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();

    const dialog = page.locator('dialog.overlay[open]');
    await expect(dialog).toBeVisible();
    /* the platform's own modal, not a div pretending */
    expect(await dialog.evaluate((d) => d.tagName)).toBe('DIALOG');

    await page.keyboard.press('Escape');
    await expect(page.locator('dialog.overlay[open]')).toHaveCount(0);
  });

  test('keep the keyboard inside, so the reading behind cannot be driven', async ({
    page,
  }, testInfo) => {
    test.skip(
      ['tablet', 'phone'].includes(testInfo.project.name),
      'touch profile: no keyboard to press'
    );
    /* the exact legacy defect: arrow keys reached the reading through an
       open guide, because "is a modal open" was a hand-kept list */
    await page.goto('/#/read/1/5');
    await page.locator('.scene').waitFor();
    await expect(page.locator('.count')).toHaveText(at(6));

    /* focus the page first, so this proves the dialog blocks the keys
       rather than that nothing was listening in the first place.
       Aimed at the label: the middle of .where is now the button that
       opens the storyboard, and opening one modal to test another one
       proves nothing. */
    await page.locator('.where .pass').click();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.locator('dialog.overlay[open]')).toBeVisible();

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');

    await expect(page.locator('.count')).toHaveText(at(6));
  });

  test('focus lands inside the dialog, not on the page behind', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    const inside = await page.evaluate(() => {
      const d = document.querySelector('dialog.overlay[open]');
      return !!d && d.contains(document.activeElement);
    });
    expect(inside).toBe(true);
  });

  test('leaving the screen closes it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Language' }).click();
    await expect(page.locator('dialog.overlay[open]')).toBeVisible();
    await page.goto('/#/practise');
    await expect(page.locator('dialog.overlay[open]')).toHaveCount(0);
  });
});

test.describe('settings do something and are remembered', () => {
  test('larger text and higher contrast apply, and survive a reload', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByLabel('Larger text').check();
    await page.getByLabel('Higher contrast').check();

    await expect(page.locator('html')).toHaveClass(/bigtext/);
    await expect(page.locator('html')).toHaveClass(/hicontrast/);

    await page.reload();
    await expect(page.locator('html')).toHaveClass(/bigtext/);
  });

  test('a language can be chosen', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Language' }).click();
    await page.getByRole('button', { name: /Korean/ }).click();
    await expect(page.getByRole('button', { name: /Korean/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});

test.describe('accessibility of the new screens', () => {
  for (const [name, url] of [
    ['the gate', '/'],
    ['a reading', '/#/read/1/3'],
    ['vocabulary', '/#/practise'],
  ]) {
    test(`no WCAG A or AA violations on ${name}`, async ({ page }) => {
      await page.goto(url);
      await page.locator('main').waitFor();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
  }

  test('and none with a dialog open', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.locator('dialog.overlay[open]').waitFor();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
