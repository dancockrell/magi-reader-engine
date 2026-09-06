import { expect, test } from '@playwright/test';

test('two-scene screening is one native movie with all narration captions', async ({
  page,
}) => {
  await page.goto('/film-preview-v9.html');
  const movie = page.locator('video');
  await expect.poll(() => movie.evaluate((v) => v.readyState)).toBeGreaterThanOrEqual(1);
  const state = await movie.evaluate((v) => ({
    duration: v.duration,
    src: v.currentSrc,
    width: v.videoWidth,
    muted: v.muted,
    loop: v.loop,
    rate: v.playbackRate,
  }));
  expect(state.duration).toBeGreaterThan(118);
  expect(state.duration).toBeLessThan(120);
  expect(state.src).toContain('magi-opening-v9-preview.mp4');
  expect(state.width).toBe(1920);
  expect(state.muted).toBe(false);
  expect(state.loop).toBe(false);
  expect(state.rate).toBe(1);
  await expect(page.locator('#description')).toContainText('not the complete film');
  await movie.evaluate(async (v) => {
    v.textTracks[0].mode = 'showing';
    await v.play();
  });
  await expect.poll(() => movie.evaluate((v) => v.currentTime)).toBeGreaterThan(0.3);
  await expect.poll(() => movie.evaluate((v) => v.textTracks[0].cues?.length)).toBe(34);
  await movie.evaluate((v) => {
    v.currentTime = 50;
  });
  await expect.poll(() => movie.evaluate((v) => v.currentTime)).toBeGreaterThan(51);
  expect(await movie.evaluate((v) => v.currentSrc)).toBe(state.src);
  await movie.evaluate((v) => {
    v.currentTime = v.duration - 0.4;
  });
  await expect.poll(() => movie.evaluate((v) => v.ended)).toBe(true);
  await expect(
    page.getByRole('link', { name: 'Previous opening · 50 seconds' })
  ).toHaveAttribute('href', 'film-preview.html?film=opening-v8');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
  ).toBe(true);
});
