import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * The reader that actually ships.
 *
 * Until now it had no automated coverage of any kind. Everything in src/
 * is tested; the file on itch was checked by hand, once, in a browser
 * pane that could not report focus or compositing — and it has been
 * changed heavily since: the gradebook, the class key, the Apps Script
 * backend, the outbox, eight question types, the contrast and focus
 * fixes. None of that has been run by a person.
 *
 * That is the gap: there is no build anyone has confirmed working, so a
 * regression has nothing to be measured against. These are the checks
 * that make a release from legacy/ falsifiable rather than hopeful —
 * deliberately shallow and about *loading and running*, because the
 * detailed behaviour lives in src/ where it can be tested properly.
 */

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.vtt': 'text/vtt',
};

async function serve(root, prefix = '/html/1891234/') {
  const server = createServer(async (req, res) => {
    try {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      if (!url.startsWith(prefix)) return void res.writeHead(404).end();
      let rel = url.slice(prefix.length) || '/';
      if (rel.endsWith('/')) rel += 'index.html';
      const file = normalize(join(root, rel));
      if (!file.startsWith(normalize(root))) return void res.writeHead(403).end();
      await stat(file);
      res.writeHead(200, {
        'content-type': TYPES[extname(file)] || 'application/octet-stream',
      });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, port: server.address().port, prefix };
}

test.describe('the shipping reader loads and runs', () => {
  test('boots on a nested path with no uncaught errors', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === 'gecko',
      'BiDi cannot see uncaught page errors reliably'
    );

    const s = await serve('legacy-dist');
    const errors = [];
    const missing = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => {
      if (r.status() >= 400) missing.push(`${r.status()} ${new URL(r.url()).pathname}`);
    });

    try {
      await page.goto(`http://127.0.0.1:${s.port}${s.prefix}`);
      /* the gate is the first thing a student sees */
      await page.locator('#stage').waitFor({ timeout: 20_000 });
      await page.waitForTimeout(1500);

      expect(errors, 'uncaught errors on boot').toEqual([]);
      expect(missing, 'assets that failed to load').toEqual([]);
    } finally {
      await new Promise((r) => s.server.close(r));
    }
  });

  test('the three readings and the class door are all present', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'markup check; once is enough');

    const s = await serve('legacy-dist');
    try {
      await page.goto(`http://127.0.0.1:${s.port}${s.prefix}`);
      await page.locator('#stage').waitFor({ timeout: 20_000 });

      for (const id of ['btnClass', 'btnGuide', 'btnVocabBar']) {
        await expect(page.locator(`#${id}`)).toHaveCount(1);
      }
      /* Watch / Notice / Think */
      await expect(page.locator('.passcard')).toHaveCount(3);
    } finally {
      await new Promise((r) => s.server.close(r));
    }
  });

  test('the backend teachers paste is present and parses as JavaScript', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'content check; once is enough');

    const s = await serve('legacy-dist');
    try {
      await page.goto(`http://127.0.0.1:${s.port}${s.prefix}`);
      await page.locator('#stage').waitFor({ timeout: 20_000 });

      const backend = await page.evaluate(() => {
        const el = document.getElementById('ravenBackend');
        if (!el) return { present: false };
        try {
          /* parsing it is the point: a backend that does not compile is
             worse than no backend, because the teacher only finds out
             after pasting it into Apps Script */
          new Function(el.textContent);
          return { present: true, parses: true, length: el.textContent.length };
        } catch (e) {
          return { present: true, parses: false, error: String(e.message) };
        }
      });

      expect(backend.present, 'the setup tells teachers to paste it').toBe(true);
      expect(backend.parses, `it must be valid JS: ${backend.error}`).toBe(true);
      expect(backend.length).toBeGreaterThan(5000);
    } finally {
      await new Promise((r) => s.server.close(r));
    }
  });

  test('a student can open the reading', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === 'gecko',
      'driven through BiDi; timing is unreliable here'
    );

    const s = await serve('legacy-dist');
    try {
      await page.goto(`http://127.0.0.1:${s.port}${s.prefix}`);
      await page.locator('#stage').waitFor({ timeout: 20_000 });
      await page.waitForTimeout(1200);

      /* first reading: "Watch" */
      const watch = page.locator('.passcard').first();
      await watch.click();
      await page.waitForTimeout(1500);

      /* the picture window exists and has a picture in it */
      const shown = await page.evaluate(() => {
        const img = document.querySelector('.scene img, #plateA, .plate');
        return { found: !!img, width: img ? img.naturalWidth : 0 };
      });
      expect(shown.found, 'a picture frame appeared').toBe(true);
    } finally {
      await new Promise((r) => s.server.close(r));
    }
  });
});
