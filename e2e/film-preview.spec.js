import { expect, test } from '@playwright/test';

test('the opening screening is one audible movie with captions, not a loop', async ({
  page,
}) => {
  await page.goto('/film-preview.html?film=opening-v8');
  const movie = page.locator('video');
  await expect
    .poll(() => movie.evaluate((video) => video.readyState))
    .toBeGreaterThanOrEqual(1);
  const before = await movie.evaluate((video) => ({
    src: video.currentSrc,
    duration: video.duration,
    muted: video.muted,
    loop: video.loop,
    width: video.videoWidth,
  }));
  expect(before.src).toContain('magi-opening-v8-preview.mp4');
  expect(before.duration).toBeGreaterThan(49);
  expect(before.duration).toBeLessThan(51);
  expect(before.width).toBe(1920);
  expect(before.muted).toBe(false);
  expect(before.loop).toBe(false);
  await movie.evaluate(async (video) => {
    video.textTracks[0].mode = 'showing';
    await video.play();
  });
  await expect.poll(() => movie.evaluate((video) => video.currentTime)).toBeGreaterThan(0.3);
  await expect.poll(() => movie.evaluate((video) => video.textTracks[0].cues?.length)).toBe(16);
  await movie.evaluate((video) => {
    video.currentTime = video.duration - 0.4;
  });
  await expect.poll(() => movie.evaluate((video) => video.ended)).toBe(true);
  expect(await movie.evaluate((video) => video.currentTime)).toBeGreaterThan(49);
});

test('the default screening points to the current reader cut', async ({ page }) => {
  await page.goto('/film-preview.html');
  await expect(page.locator('source')).toHaveAttribute(
    'src',
    'video/films/magi-reader-film-final.mp4'
  );
  await expect(page.locator('video')).not.toHaveAttribute('loop');
  await expect(page.locator('#description')).toContainText('No narration');
});
