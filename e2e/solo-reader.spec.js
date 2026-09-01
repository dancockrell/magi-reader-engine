import { expect, test } from '@playwright/test';

test('the bookshelf opens the bundled book without classroom gates', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Choose a book' })).toBeVisible();

  const gift = page.locator('.book-card').filter({ hasText: 'The Gift of the Magi' });
  await gift.getByRole('link', { name: 'Open book' }).click();

  await expect(page.getByRole('heading', { name: 'The Gift of the Magi' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start reading' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Practise vocabulary' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore the book' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'What Wren & Ambrose said' })).toBeVisible();
  await expect(page.getByText(/\b(quiz|assignment|class|teacher)\b/i)).toHaveCount(0);
});

test('reading stays on literary lines', async ({ page }) => {
  await page.goto('/#/book/magi/read/0', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.solo-reader')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Reading controls' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play' })).toBeVisible();
  await expect(page.locator('.question, .writing, .reaction')).toHaveCount(0);
});

test('Explore stays separate from the reading', async ({ page }) => {
  await page.goto('/#/book/magi/explore', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Explore The Gift of the Magi' })
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ways into the book' })).toBeVisible();
  await expect(page.getByText(/No quiz is hiding here/)).toBeVisible();
});
