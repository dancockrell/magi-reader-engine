import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/* A first visit. Everything else in the suite starts as a returning
   reader — see HEARD in the Playwright config — because Wren is a modal
   and a test about the Back button should not have to get past her. This
   file is the one that is about her, so it opts out. */
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * Wren and Professor Ambrose.
 *
 * They are most of the product's character, and the place the shipping
 * reader is buggiest: talking over each other, a close button that did
 * not close, greetings repeating. Every assertion here is one of those.
 */

/** How many audio elements are actually playing, right now. */
const playingCount = (page) =>
  page.evaluate(
    () => [...document.querySelectorAll('audio')].filter((a) => !a.paused && !a.ended).length
  );

/**
 * One stop forward, and wait for it to land.
 *
 * The position is read back before the next thing is looked at, because
 * `count()` does not wait: a loop that clicks and then reads is a render
 * behind, and reports what the previous stop had on it.
 */
async function stepForward(page) {
  const at = page.locator('.count');
  const before = await at.textContent();
  await page.getByRole('button', { name: 'Next ›' }).click();
  await expect(at).not.toHaveText(before);
}

async function forwardTo(page, selector, limit = 60) {
  for (let n = 0; n < limit; n++) {
    if (await page.locator(selector).count()) {
      await expect(page.locator(selector).first()).toBeVisible();
      return true;
    }
    await stepForward(page);
  }
  throw new Error(`no ${selector} within ${limit} stops`);
}

test.describe('two people cannot speak at once', () => {
  test('a stop has one speaker, never two', async ({ page }) => {
    await page.goto('/#/read/1/0');
    await forwardTo(page, '.speaker');

    await expect(page.locator('.speaker')).toHaveCount(1);
    await expect(page.locator('.sp-name')).toHaveCount(1);
    await expect(page.locator('.sp-name')).not.toBeEmpty();
  });

  test('and one recording, never two', async ({ page }) => {
    /* the legacy defect exactly: Wren's reaction fired into the band the
       Professor was mid-sentence in, and both clips ran */
    await page.goto('/#/read/1/0');
    await page.locator('.scene').waitFor();

    for (let n = 0; n < 24; n++) {
      expect(
        await page.locator('audio').count(),
        'more than one voice is loaded at this stop'
      ).toBeLessThanOrEqual(1);
      expect(await playingCount(page)).toBeLessThanOrEqual(1);
      await stepForward(page);
    }
  });

  test('the reading and the speaking are never both on screen', async ({ page }) => {
    await page.goto('/#/read/1/0');
    await forwardTo(page, '.speaker');
    /* .scene is the Professor reading a line; .speaker is somebody
       talking about it. Both at once is two voices with one Play button */
    await expect(page.locator('.scene')).toHaveCount(0);
  });

  test('the picture stays while they talk about it', async ({ page }) => {
    await page.goto('/#/read/1/0');
    await forwardTo(page, '.speaker');
    await expect(page.locator('.stage.still .plate')).toBeVisible();
  });

  test('both of them turn up, and are told apart', async ({ page }) => {
    /* the conversation after a part alternates, so walking a segment
       finds both — if only one name ever appears, the cast is not being
       asked who is speaking */
    await page.goto('/#/read/1/0');
    const names = new Set();
    const who = new Set();

    for (let n = 0; n < 40 && names.size < 2; n++) {
      if (await page.locator('.speaker').count()) {
        names.add((await page.locator('.sp-name').textContent()).trim());
        who.add(await page.locator('.speaker').getAttribute('data-who'));
      }
      await stepForward(page);
    }

    expect([...names].sort()).toEqual(['Professor Ambrose', 'Wren']);
    expect([...who].sort()).toEqual(['prof', 'wren']);
  });

  test('a face is shown, and it is not the same face for both', async ({ page }) => {
    await page.goto('/#/read/1/0');
    const src = new Set();

    for (let n = 0; n < 40 && src.size < 2; n++) {
      if (await page.locator('.sp-face img').count()) {
        src.add(await page.locator('.sp-face img').getAttribute('src'));
      }
      await stepForward(page);
    }
    expect(src.size).toBe(2);
    for (const s of src) expect(s.startsWith('/'), `"${s}" would 404 on itch`).toBe(false);
  });

  test('the words are lit by the same clock the reading uses', async ({ page }) => {
    await page.goto('/#/read/1/0');
    await forwardTo(page, '.speaker');

    const clip = await page.locator('.speaker audio').getAttribute('src');
    expect(clip).toMatch(/^magi-audio\/(wh|d)_/);
    await expect(page.locator('.speaker audio track')).toHaveAttribute('src', 'cues/magi.vtt');
    /* the words are on screen before any of that resolves */
    expect(await page.locator('.sp-text .w').count()).toBeGreaterThan(0);
  });
});

test.describe('Wren at the door', () => {
  test('introduces the book, one thing at a time', async ({ page }) => {
    await page.goto('/#/');
    await expect(page.locator('dialog.preshow[open]')).toBeVisible();
    await expect(page.locator('.preshow .sp-name')).toHaveText('Wren');
    await expect(page.locator('.preshow-count')).toHaveText('1 of 6');

    await page.getByRole('button', { name: 'Next ›' }).click();
    await expect(page.locator('.preshow-count')).toHaveText('2 of 6');
    await page.getByRole('button', { name: '‹ Back' }).click();
    await expect(page.locator('.preshow-count')).toHaveText('1 of 6');
  });

  test('the close button closes it', async ({ page }) => {
    /* it did not, in the shipping reader */
    await page.goto('/#/');
    await expect(page.locator('dialog.preshow[open]')).toBeVisible();
    await page.locator('.preshow').getByRole('button', { name: 'Close' }).click();
    await expect(page.locator('dialog.preshow[open]')).toHaveCount(0);
  });

  test('and it stays closed, through a reload', async ({ page }) => {
    await page.goto('/#/');
    await page.locator('.preshow').getByRole('button', { name: 'Close' }).click();
    await expect(page.locator('dialog.preshow[open]')).toHaveCount(0);

    await page.reload();
    await expect(page.locator('.gate')).toBeVisible();
    await expect(page.locator('dialog.preshow[open]')).toHaveCount(0);
  });

  test('and stays closed after leaving the gate and coming back', async ({ page }) => {
    await page.goto('/#/');
    await page.locator('.preshow').getByRole('button', { name: 'Close' }).click();

    await page.goto('/#/read/1/0');
    await page.locator('.scene').waitFor();
    await page.goto('/#/');
    await expect(page.locator('.gate')).toBeVisible();
    await expect(page.locator('dialog.preshow[open]')).toHaveCount(0);
  });

  test('sitting through it counts as having heard it', async ({ page }) => {
    await page.goto('/#/');
    for (let n = 0; n < 5; n++) await page.getByRole('button', { name: 'Next ›' }).click();
    await expect(page.getByRole('button', { name: 'Let me read' })).toBeVisible();
    await page.getByRole('button', { name: 'Let me read' }).click();

    await expect(page.locator('dialog.preshow[open]')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('dialog.preshow[open]')).toHaveCount(0);
  });

  test('but she can be asked again, without clearing anything', async ({ page }) => {
    await page.goto('/#/');
    await page.locator('.preshow').getByRole('button', { name: 'Close' }).click();

    await page.getByRole('button', { name: 'What Wren said' }).click();
    await expect(page.locator('dialog.preshow[open]')).toBeVisible();
    await expect(page.locator('.preshow-count')).toHaveText('1 of 6');
  });

  test('no WCAG A or AA violations while she is speaking', async ({ page }) => {
    await page.goto('/#/');
    await expect(page.locator('dialog.preshow[open]')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test.describe('the reading is left alone', () => {
  test('nobody interrupts a question', async ({ page }) => {
    await page.goto('/#/read/2/0');
    await forwardTo(page, '.qcard');
    await expect(page.locator('.speaker')).toHaveCount(0);
  });

  test('nobody interrupts the writing', async ({ page }) => {
    await page.goto('/#/read/3/0');
    await forwardTo(page, '.wcard');
    await expect(page.locator('.speaker')).toHaveCount(0);
  });
});
