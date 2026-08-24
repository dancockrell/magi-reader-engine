import { test, expect } from '@playwright/test';
import { at, atIn } from './book.js';

/**
 * Every control in the Settings and Language panels changes something.
 *
 * Four of them did not. Language, sound, pace and the reading ruler all
 * saved, all persisted, and all reached exactly nothing: the checkbox
 * stayed ticked across a reload while the reader carried on as before.
 * That is worse than not offering the control, because there is no way
 * for a student to tell — and one of them, the language, was the whole
 * reason a class in Korea would use this.
 *
 * So: one test per control, asserting on the thing the reader would
 * actually notice, not on the class name.
 */

const openSettings = async (page) => {
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.locator('dialog.overlay[open]')).toBeVisible();
};

const closePanel = async (page) => {
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog.overlay[open]')).toHaveCount(0);
};

test.describe('the language', () => {
  test('puts the reader’s own language under the line', async ({ page }) => {
    await page.goto('/#/read/1/0');
    await page.locator('.scene').waitFor();
    await expect(page.locator('.sub-tr')).toHaveCount(0);

    await page.getByRole('button', { name: 'Language' }).click();
    await page.getByRole('button', { name: /Korean/ }).click();
    await closePanel(page);

    const tr = page.locator('.sub-tr');
    await expect(tr).toHaveCount(1);
    await expect(tr).not.toBeEmpty();
    await expect(tr).toHaveAttribute('lang', 'ko');
    /* really Korean, not the English again */
    expect(await tr.textContent()).toMatch(/[가-힣]/);
  });

  test('the story itself stays in English', async ({ page }) => {
    await page.goto('/#/read/1/0');
    await page.getByRole('button', { name: 'Language' }).click();
    await page.getByRole('button', { name: /Korean/ }).click();
    await closePanel(page);

    expect(await page.locator('.sub-line').textContent()).not.toMatch(/[가-힣]/);
  });

  test('follows the reading from line to line', async ({ page }) => {
    await page.goto('/#/read/1/0');
    await page.getByRole('button', { name: 'Language' }).click();
    await page.getByRole('button', { name: /Korean/ }).click();
    await closePanel(page);

    const first = await page.locator('.sub-tr').textContent();
    await page.getByRole('button', { name: 'Next ›' }).click();
    await expect(page.locator('.count')).toHaveText(at(2));
    await expect(page.locator('.sub-tr')).not.toHaveText(first);
  });

  test('and goes away again when English only is chosen', async ({ page }) => {
    await page.goto('/#/read/1/0');
    await page.getByRole('button', { name: 'Language' }).click();
    await page.getByRole('button', { name: /Korean/ }).click();
    await expect(page.locator('.sub-tr')).toHaveCount(1);

    await page.getByRole('button', { name: 'English only' }).click();
    await closePanel(page);
    await expect(page.locator('.sub-tr')).toHaveCount(0);
  });

  test('survives a reload, like every other setting', async ({ page }) => {
    await page.goto('/#/read/1/0');
    await page.getByRole('button', { name: 'Language' }).click();
    await page.getByRole('button', { name: /Japanese/ }).click();
    await closePanel(page);
    await page.reload();
    await expect(page.locator('.sub-tr')).toHaveAttribute('lang', 'ja');
  });
});

test.describe('sound and pace reach the recording', () => {
  const audioState = (page) =>
    page.locator('audio').evaluate((a) => ({ muted: a.muted, rate: a.playbackRate }));

  test('sound off actually silences it', async ({ page }) => {
    await page.goto('/#/read/1/0');
    await page.locator('.scene').waitFor();
    expect((await audioState(page)).muted).toBe(false);

    await openSettings(page);
    await page.getByLabel('Sound on').uncheck();
    await closePanel(page);
    expect((await audioState(page)).muted).toBe(true);
  });

  test('pace actually changes the speed', async ({ page }) => {
    await page.goto('/#/read/1/0');
    await page.locator('.scene').waitFor();
    await openSettings(page);
    await page.getByRole('button', { name: 'Slower' }).click();
    await closePanel(page);
    expect((await audioState(page)).rate).toBeCloseTo(0.85, 2);

    await openSettings(page);
    await page.getByRole('button', { name: 'Faster' }).click();
    await closePanel(page);
    expect((await audioState(page)).rate).toBeCloseTo(1.18, 2);
  });

  test('and they stick when the line changes', async ({ page }) => {
    /* a new stop is a new <audio>, which starts at the defaults */
    await page.goto('/#/read/1/0');
    await page.locator('.scene').waitFor();
    await openSettings(page);
    await page.getByLabel('Sound on').uncheck();
    await page.getByRole('button', { name: 'Slower' }).click();
    await closePanel(page);

    await page.getByRole('button', { name: 'Next ›' }).click();
    await expect(page.locator('.count')).toHaveText(at(2));
    expect(await audioState(page)).toMatchObject({ muted: true });
    expect((await audioState(page)).rate).toBeCloseTo(0.85, 2);
  });

  test('and they reach Wren and the Professor too', async ({ page }) => {
    await page.goto('/#/read/1/0');
    await openSettings(page);
    await page.getByLabel('Sound on').uncheck();
    await closePanel(page);

    for (let n = 0; n < 20 && !(await page.locator('.speaker').count()); n++) {
      const before = await page.locator('.count').textContent();
      await page.getByRole('button', { name: 'Next ›' }).click();
      await expect(page.locator('.count')).not.toHaveText(before);
    }
    await expect(page.locator('.speaker')).toHaveCount(1);
    expect((await audioState(page)).muted).toBe(true);
  });
});

test.describe('the reading ruler', () => {
  test('changes how the line looks', async ({ page }) => {
    await page.goto('/#/read/1/0');
    await page.locator('.scene').waitFor();
    const before = await page
      .locator('.sub-line')
      .evaluate((el) => getComputedStyle(el).backgroundColor);

    await openSettings(page);
    await page.getByLabel('Reading ruler').check();
    await closePanel(page);

    const after = await page
      .locator('.sub-line')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(after, 'the ruler setting did nothing at all').not.toBe(before);
  });
});

test.describe('carrying on', () => {
  test('the gate offers to pick up where the reading stopped', async ({ page }) => {
    await page.goto('/#/');
    await expect(page.locator('.resume')).toHaveCount(0);

    await page.goto('/#/read/2/30');
    await page.locator('.transport').waitFor();

    await page.goto('/#/');
    await expect(page.locator('.resume')).toBeVisible();
    await expect(page.locator('.resume')).toContainText('Reading 2');

    await page.getByRole('link', { name: 'Carry on' }).click();
    await expect(page.locator('.count')).toHaveText(atIn(2, 31));
  });

  test('and forgets when told to start again', async ({ page }) => {
    await page.goto('/#/read/1/30');
    await page.locator('.transport').waitFor();
    await page.goto('/#/');
    await expect(page.locator('.resume')).toBeVisible();

    await page.getByRole('button', { name: 'Start again' }).click();
    await expect(page.locator('.resume')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('.resume')).toHaveCount(0);
  });
});

test.describe('a reading ends rather than running out', () => {
  for (const pass of [1, 2, 3]) {
    test(`reading ${pass} says so at the last stop`, async ({ page }) => {
      await page.goto(`/#/read/${pass}/999999`);
      await page.locator('.transport').waitFor();

      await expect(page.locator('.finish')).toBeVisible();
      await expect(page.locator('.finish h2')).not.toBeEmpty();
      /* and somewhere to go, because Next is disabled here */
      expect(await page.locator('.finish-doors a').count()).toBeGreaterThan(0);
    });
  }

  test('the quiz says what was scored', async ({ page }) => {
    await page.goto('/#/read/2/999999');
    await page.locator('.finish').waitFor();
    await expect(page.locator('.finish-score b')).toContainText('out of');
  });

  test('the writing is never given a mark', async ({ page }) => {
    /* a person marks written work; a number here would be a lie */
    await page.goto('/#/read/3/999999');
    await page.locator('.finish').waitFor();
    const text = await page.locator('.finish').innerText();
    expect(text).not.toMatch(/\b\d{1,3}\s*%/);
    expect(text.toLowerCase()).toContain('teacher');
  });

  test('does not claim the work was handed in', async ({ page }) => {
    /* it cannot be, yet — telling a student it was is the worst
       version of this screen */
    await page.goto('/#/read/2/999999');
    await page.locator('.finish').waitFor();
    const text = (await page.locator('.finish').innerText()).toLowerCase();
    expect(text).not.toMatch(/\b(handed in|submitted|sent to your teacher)\b/);
    expect(text).toContain('not built yet');
  });
});

test.describe('the vocabulary trainer has a way out', () => {
  test('back to the reading and back to the start', async ({ page }) => {
    await page.goto('/#/practise');
    await page.locator('main').waitFor();
    await expect(page.getByRole('link', { name: /Back to the reading/ })).toBeVisible();
    await page.getByRole('link', { name: /Back to the start/ }).click();
    await expect(page.locator('.gate')).toBeVisible();
  });
});
