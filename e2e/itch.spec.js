import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * itch, reproduced as closely as a test can.
 *
 * itch does not serve a game from your page's origin. The page is on
 * itch.io and the game runs in an <iframe> pointed at a *different*
 * origin — html-classic.itch.zone — under a nested path like
 * /html/1891234/index.html.
 *
 * Both of those matter and neither is covered by serving dist/ directly:
 *
 *   the nested path breaks any URL anchored at the domain root
 *   the cross-origin iframe makes the game third-party, and a browser
 *   may refuse it storage on that basis — Safari does by default, which
 *   would silently take localStorage away on exactly the iPads this is
 *   built for
 *
 * So this stands up two servers on two ports, embeds one in the other,
 * and checks the reading actually runs in there.
 */

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.vtt': 'text/vtt',
  '.json': 'application/json',
};

async function serveDist(prefix, root) {
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
        /* itch serves the game frame without an ancestor restriction */
        'x-frame-options': 'ALLOWALL',
      });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, port: server.address().port };
}

/** The itch.io page: nothing but the iframe, on a different origin. */
async function servePage(gameUrl) {
  const html = `<!doctype html><meta charset="utf-8"><title>host</title>
<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100%}</style>
<iframe id="game" src="${gameUrl}" allow="autoplay; fullscreen"></iframe>`;
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end(html);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, port: server.address().port };
}

/**
 * Tagged `@serial`, and run on their own.
 *
 * These two stand up two extra HTTP servers each and load the whole
 * built game inside a frame. Alongside the other workers that is enough
 * contention to miss a twenty-second wait for the first paint, so this
 * file timed out under load and passed in isolation, repeatedly.
 *
 * That was answered twice by raising the timeout, first to sixty seconds
 * and then to ninety, and it came back both times, because the cause is
 * contention and a timeout does not remove contention. It only moves the
 * point at which the machine loses. Measured: 12.6 seconds with one
 * worker, timing out at ninety with four.
 *
 * So `npm run e2e` now excludes this tag and `npm run e2e:serial` runs
 * it alone. The ninety-second allowance stays, because it costs nothing
 * when the test takes twelve seconds and it is the honest budget for
 * starting two servers and a browser.
 */
test.describe('running the way itch runs it', () => {
  test(
    'loads and reads inside a cross-origin iframe',
    { tag: '@serial' },
    async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'checked once; not engine-specific');
      test.setTimeout(90_000);

      const prefix = '/html/1891234/';
      const game = await serveDist(prefix, 'dist');
      /* localhost and 127.0.0.1 are different origins to a browser, which
       is what makes the frame third-party here */
      const host = await servePage(`http://localhost:${game.port}${prefix}#/book/magi/read/0`);

      const failed = [];
      page.on('response', (r) => {
        if (r.status() >= 400) failed.push(`${r.status()} ${new URL(r.url()).pathname}`);
      });
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(e.message));

      try {
        await page.goto(`http://127.0.0.1:${host.port}/`);
        const frame = page.frameLocator('#game');

        await frame.locator('.scene').waitFor({ timeout: 20_000 });
        await expect(frame.locator('.sub-line')).not.toBeEmpty();

        const width = await frame.locator('.plate').evaluate((img) => img.naturalWidth);
        expect(width, 'the picture decoded inside the frame').toBeGreaterThan(0);

        await frame.getByRole('button', { name: 'Next ›' }).click();
        await expect(frame.locator('.scene')).toBeVisible();

        expect(failed, 'nothing 404d').toEqual([]);
        expect(pageErrors, 'no uncaught errors').toEqual([]);
      } finally {
        await new Promise((r) => game.server.close(r));
        await new Promise((r) => host.server.close(r));
      }
    }
  );

  /* This one runs on EVERY engine, unlike the load check above. Whether a
     third-party frame may keep storage is decided by the browser, not by
     us: Safari blocks it by default and Chromium currently does not, so
     answering it once would answer it for the wrong device. The iPad is
     the case that matters. */
  test(
    'reports whether storage survives being third-party',
    { tag: '@serial' },
    async ({ page }) => {
      const prefix = '/html/1891234/';
      const game = await serveDist(prefix, 'dist');
      const host = await servePage(`http://localhost:${game.port}${prefix}#/book/magi/read/0`);

      try {
        await page.goto(`http://127.0.0.1:${host.port}/`);
        const frame = page.frameLocator('#game');
        await frame.locator('.scene').waitFor({ timeout: 20_000 });

        /* Not an assertion about the browser under test so much as a
         record of what the app may rely on. If this is false, session
         resume and the outbox cannot use localStorage on itch and must
         fall back to something the frame is allowed to keep. */
        const storage = await frame.locator('body').evaluate(() => {
          try {
            localStorage.setItem('probe', '1');
            const ok = localStorage.getItem('probe') === '1';
            localStorage.removeItem('probe');
            return { available: ok, error: null };
          } catch (e) {
            return { available: false, error: String(e && e.name) };
          }
        });

        expect(storage.available, `localStorage in a third-party frame: ${storage.error}`).toBe(
          true
        );
      } finally {
        await new Promise((r) => game.server.close(r));
        await new Promise((r) => host.server.close(r));
      }
    }
  );
});
