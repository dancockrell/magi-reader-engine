import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * The reader's own language, and the words the book explains.
 *
 * All of this was already in the package and none of it reached the
 * screen: 64 word meanings in ten languages, 413 translated lines of
 * speech, 129 translated phrases of interface. A student who reads no
 * English could have the story translated under every line and still not
 * know which button started it.
 */

const chooseKorean = async (page) => {
  await page.getByRole('button', { name: /^Language/ }).click();
  await page.getByRole('button', { name: /Korean/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('dialog.overlay[open]')).toHaveCount(0);
};

/** Walk forward until something matches. */
async function forwardTo(page, selector, limit = 40) {
  for (let n = 0; n < limit; n++) {
    if (await page.locator(selector).count()) return;
    const before = await page.locator('.count').textContent();
    await page.getByRole('button', { name: 'Next ›' }).click();
    await expect(page.locator('.count')).not.toHaveText(before);
  }
  throw new Error(`no ${selector} within ${limit} stops`);
}

test.describe('a word you can tap', () => {
  test('the hard words are marked, and the rest are not', async ({ page }) => {
    await page.goto('/#/read/1/4');
    await page.locator('.scene').waitFor();
    await expect(page.locator('.sub-line .gl')).not.toHaveCount(0);
    /* not every word — a line of all buttons is a form, not a sentence */
    const words = await page.locator('.sub-line .w').count();
    const glossed = await page.locator('.sub-line .gl').count();
    expect(glossed).toBeLessThan(words);
  });

  test('tapping one says what it means', async ({ page }) => {
    await page.goto('/#/read/1/4');
    await page.locator('.sub-line .gl').first().waitFor();

    await expect(page.locator('.glossbox:popover-open')).toHaveCount(0);
    await page.locator('.sub-line .gl').first().click();

    const box = page.locator('.glossbox:popover-open');
    await expect(box).toBeVisible();
    await expect(box.locator('.gl-mean')).not.toBeEmpty();
  });

  test('a closed one is not sitting invisibly over the page', async ({ page }) => {
    /* It was. Declaring `display: grid` on the box overrode the UA rule
       that hides a closed popover, so sixty-four invisible boxes ate
       every tap — on the iPad profile the transport could not be pressed
       at all. Invisible and clickable is the worst thing a rule can do. */
    await page.goto('/#/read/1/4');
    await page.locator('.sub-line .gl').first().waitFor();
    await expect(page.locator('.glossbox:popover-open')).toHaveCount(0);

    const boxes = await page.locator('.glossbox').count();
    expect(boxes, 'there should be a box per glossed word').toBeGreaterThan(0);

    const shown = await page
      .locator('.glossbox')
      .evaluateAll((els) => els.filter((e) => getComputedStyle(e).display !== 'none').length);
    expect(shown).toBe(0);

    /* and the controls underneath are reachable */
    const before = await page.locator('.count').textContent();
    await page.getByRole('button', { name: 'Next ›' }).click();
    await expect(page.locator('.count')).not.toHaveText(before);
  });

  test('Escape closes it, because it is the platform’s own pop-up', async ({
    page,
  }, testInfo) => {
    test.skip(
      ['tablet', 'phone'].includes(testInfo.project.name),
      'touch profile: no keyboard to press'
    );
    await page.goto('/#/read/1/4');
    await page.locator('.sub-line .gl').first().click();
    await expect(page.locator('.glossbox:popover-open')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.glossbox:popover-open')).toHaveCount(0);
  });

  test('and it does not drive the reading behind it', async ({ page }, testInfo) => {
    test.skip(
      ['tablet', 'phone'].includes(testInfo.project.name),
      'touch profile: no keyboard to press'
    );
    await page.goto('/#/read/1/4');
    const at = await page.locator('.count').textContent();
    await page.locator('.sub-line .gl').first().click();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.count')).toHaveText(at);
  });

  test('shows the meaning in the reader’s language too', async ({ page }) => {
    await page.goto('/#/read/1/4');
    await page.locator('.scene').waitFor();
    await chooseKorean(page);

    await page.locator('.sub-line .gl').first().click();
    const box = page.locator('.glossbox:popover-open');
    await expect(box.locator('.gl-tr')).toBeVisible();
    expect(await box.locator('.gl-tr').textContent()).toMatch(/[가-힣]/);
  });

  test('a word with no translation still says what it means', async ({ page }) => {
    /* five of the sixty-nine were never translated; the pop-up drops the
       second line rather than showing an empty one */
    await page.goto('/#/read/1/0');
    await chooseKorean(page);
    await forwardTo(page, '.sub-line .gl');
    const box = page.locator('.glossbox');
    await page.locator('.sub-line .gl').first().click();
    await expect(box.locator('.gl-mean').first()).not.toBeEmpty();
  });

  test('no WCAG A or AA violations with one open', async ({ page }) => {
    await page.goto('/#/read/1/4');
    await page.locator('.sub-line .gl').first().click();
    await expect(page.locator('.glossbox:popover-open')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test.describe('what Wren and the Professor say', () => {
  test('is translated too, not just the story', async ({ page }) => {
    await page.goto('/#/read/1/0');
    await page.locator('.scene').waitFor();
    await chooseKorean(page);

    await forwardTo(page, '.speaker');
    const tr = page.locator('.speaker .sp-tr');
    await expect(tr).toHaveCount(1);
    expect(await tr.textContent()).toMatch(/[가-힣]/);
    /* and they still say it in English */
    expect(await page.locator('.sp-text').textContent()).not.toMatch(/[가-힣]/);
  });
});

test.describe('the interface', () => {
  test('is in the reader’s language, under the English', async ({ page }) => {
    await page.goto('/#/');
    await expect(page.locator('.ui-tr')).toHaveCount(0);

    await chooseKorean(page);
    await expect(page.locator('.ui-tr').first()).toBeVisible();

    const vocab = page.getByRole('link', { name: /Vocabulary/ });
    await expect(vocab).toContainText('Vocabulary');
    expect(await vocab.textContent()).toMatch(/[가-힣]/);
  });

  test('the doors still work by their English name', async ({ page }) => {
    /* a teacher saying "press Vocabulary" out loud has to keep working */
    await page.goto('/#/');
    await chooseKorean(page);
    await page.getByRole('link', { name: /Vocabulary/ }).click();
    await expect(page).toHaveURL(/#\/practise$/);
  });

  test('falls back to English rather than to a blank', async ({ page }) => {
    /* only 129 phrases are translated, and the app says more than 129
       things — an untranslated one must read as English, never empty */
    await page.goto('/#/');
    await chooseKorean(page);
    const empty = await page
      .locator('.ui-tr')
      .evaluateAll((els) => els.filter((e) => !(e.textContent || '').trim()).length);
    expect(empty).toBe(0);
  });

  test('goes back to English when English only is chosen', async ({ page }) => {
    await page.goto('/#/');
    await chooseKorean(page);
    await expect(page.locator('.ui-tr').first()).toBeVisible();

    await page.getByRole('button', { name: /^Language/ }).click();
    await page.getByRole('button', { name: 'English only' }).click();
    await page.keyboard.press('Escape');
    await expect(page.locator('.ui-tr')).toHaveCount(0);
  });

  test('no WCAG A or AA violations in another language', async ({ page }) => {
    await page.goto('/#/');
    await chooseKorean(page);
    await page.locator('.ui-tr').first().waitFor();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
