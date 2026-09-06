import { chromium } from '@playwright/test';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  for (const size of [192, 512]) {
    await page.setViewportSize({ width: size, height: size });
    await page.goto('http://localhost:5180/app-icon.svg');
    await page.screenshot({ path: 'public/app-icon-' + size + '.png' });
  }
} finally { await browser.close(); }
