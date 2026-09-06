import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const base = process.env.PORTFOLIO_URL || 'http://127.0.0.1:5181/';
mkdirSync('test-results/portfolio', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base);
  await page.getByRole('heading', { name: 'Your bookshelf' }).waitFor();
  await page.screenshot({ path: 'test-results/portfolio/bookshelf-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'Read', exact: true }).click();
  await page.getByText('One dollar and eighty-seven cents.', { exact: false }).first().waitFor();
  await page.screenshot({ path: 'test-results/portfolio/reading-desktop.png', fullPage: true });
  await page.goto(new URL('film.html', base).href);
  await page.waitForFunction(() => document.querySelector('video')?.readyState >= 1, null, { timeout: 60000 });
  const video = page.locator('video');
  await video.evaluate(element => element.play());
  await page.waitForFunction(() => document.querySelector('video').currentTime > 1);
  for (const seconds of [480, 610, 631, 880]) {
    await video.evaluate((element, time) => { element.currentTime = time; }, seconds);
    await page.waitForFunction(time => {
      const v = document.querySelector('video');
      return !v.seeking && v.readyState >= 2 && v.currentTime >= time;
    }, seconds, { timeout: 60000 });
    await video.evaluate(element => element.pause());
    await page.screenshot({ path: 'test-results/portfolio/film-' + seconds + '.png' });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  await page.getByRole('heading', { name: 'Your bookshelf' }).waitFor();
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Mobile horizontal overflow');
  await page.screenshot({ path: 'test-results/portfolio/bookshelf-mobile.png', fullPage: true });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({ base, desktop: true, mobile: true, text: true, remoteVideoPlayback: true, seekSeconds: [480,610,631,880], pageErrors: errors }));
} finally { await browser.close(); }
