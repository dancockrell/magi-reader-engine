import { expect, test } from '@playwright/test';

test('focus view preserves the playing film and fits the viewport', async ({ page }) => {
  await page.goto('/#/book/magi/read/1');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  const video = page.locator('.scene video');
  await expect.poll(() => video.evaluate((el) => el.currentTime)).toBeGreaterThan(0.1);
  const handle = await video.elementHandle();
  const before = await video.evaluate((el) => el.currentTime);
  await page.getByRole('button', { name: 'Focus view' }).click();
  await expect(page.locator('.solo-app .bar')).toBeHidden();
  expect(await video.evaluate((el, original) => el === original, handle)).toBe(true);
  expect(await video.evaluate((el) => el.currentTime)).toBeGreaterThanOrEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
    true
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('.solo-app .bar')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
});

async function skipOpening(page) {
  await expect(page.locator('.opening-master')).toBeVisible();
  await page.getByRole('button', { name: 'Skip opening' }).click();
}

test('the bookshelf opens the bundled book at its first line', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Choose a book' })).toBeVisible();

  await page.evaluate(() => {
    localStorage.setItem(
      'reader.where.v1.magi',
      JSON.stringify({ pass: 1, at: 40, of: 200, when: Date.now() })
    );
  });

  const gift = page.locator('.book-card').filter({ hasText: 'The Gift of the Magi' });
  await expect(gift.getByText('Included with Magi Reader')).toBeVisible();
  await gift.getByRole('link', { name: 'Open book' }).click();

  await expect(page).toHaveURL(/#\/book\/magi\/read\/0$/);
  await expect(page.locator('.solo-reader')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The Gift of the Magi' })).toBeVisible();
  await expect(page.locator('.reader-status')).toHaveText(
    'Opening The Gift of the Magi by O. Henry.'
  );
  await skipOpening(page);
  await expect(page.locator('.reader-status')).toHaveText('One dollar and eighty-seven cents.');
  await expect(page.getByText(/Wren|Ambrose|Look more closely/)).toHaveCount(0);
});

test('the shelf tells an offline reader which books still open', async ({ page, context }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));

  const gift = page.locator('.book-card').filter({ hasText: 'The Gift of the Magi' });
  const raven = page.locator('.book-card').filter({ hasText: 'The Raven' });
  await expect(gift.getByRole('link', { name: 'Open book' })).toBeVisible();
  await expect(raven).toHaveCount(0);
  await expect(page.locator('.book-card')).toHaveCount(1);
});

test('the mastered opening completes into the first scene without intervention', async ({
  page,
}) => {
  test.setTimeout(15_000);
  await page.goto('/#/book/magi/read/0', { waitUntil: 'domcontentloaded' });
  const opening = page.locator('.opening-master');
  await expect(opening).toBeVisible();
  await expect(opening).toHaveClass(/title-phase/);
  await expect(opening.locator('video')).toHaveCount(0);
  await expect(opening.locator('video')).toHaveAttribute(
    'src',
    'video/opening/magi-opening.mp4',
    { timeout: 4_000 }
  );

  await expect(opening).toHaveCount(0, { timeout: 7_000 });
  await expect(page.locator('.reader-status')).toHaveText('One dollar and eighty-seven cents.');
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
});

test('reading stays on literary lines', async ({ page }) => {
  await page.goto('/#/book/magi/read/0', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.solo-reader')).toBeVisible();
  await skipOpening(page);
  await expect(page.getByRole('group', { name: 'Reading controls' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await expect(page.locator('.question, .writing, .reaction')).toHaveCount(0);
});

test('shared animation advances across narration lines without repeating', async ({ page }) => {
  test.setTimeout(15_000);
  await page.goto('/#/book/magi/read/0', { waitUntil: 'domcontentloaded' });
  await skipOpening(page);
  await page.getByRole('button', { name: 'Play', exact: true }).click();

  const samples = [];
  for (let i = 0; i < 42; i += 1) {
    await page.waitForTimeout(100);
    samples.push(
      await page.locator('video').evaluate((video) => ({
        source: video.currentSrc,
        time: video.currentTime,
      }))
    );
  }

  const backwards = samples.slice(1).filter((sample, i) => {
    const before = samples[i];
    return sample.source === before.source && sample.time < before.time - 0.08;
  });
  expect(backwards).toEqual([]);
  await expect(page).toHaveURL(/#\/book\/magi\/read\/[12]$/);
});

test('a new literary line is announced without announcing every highlighted word', async ({
  page,
}) => {
  await page.goto('/#/book/magi/read/0', { waitUntil: 'domcontentloaded' });
  await skipOpening(page);

  const status = page.locator('.reader-status');
  const firstLine = await status.textContent();
  expect(firstLine?.trim()).toBeTruthy();
  await page.getByRole('button', { name: 'Next ›', exact: true }).click();

  await expect(status).not.toHaveText(firstLine || '');
  await expect(page.locator('.reader-status')).toHaveCount(1);
});

test('retired Explore links return to the beginning of the reading', async ({ page }) => {
  await page.goto('/#/book/magi/explore', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/#\/book\/magi\/read\/0$/);
  await skipOpening(page);
  await expect(page.locator('.reader-status')).toHaveText('One dollar and eighty-seven cents.');
});

test('the final line rolls literary credits before the ending actions', async ({ page }) => {
  await page.goto('/#/book/magi/read/9999', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.credit-reel')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'O. Henry' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip credits' }).click();
  await expect(
    page.getByRole('heading', { name: 'That is The Gift of the Magi.' })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replay credits' })).toBeVisible();
});
