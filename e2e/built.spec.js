import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

/**
 * The built output, served from a nested path.
 *
 * This is the check nothing else makes. Everything else runs against the
 * dev server at the domain root, where an absolute "/art/x.webp" happens
 * to resolve — and then breaks the moment the game is uploaded to itch,
 * which serves it from /html/<id>/. That failure mode has already cost
 * this project one broken upload, via ZIP entries written with
 * backslashes; it looked fine locally too.
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

/** Serve dist/ under a nested prefix, the way itch does. */
async function serveNested(prefix, root) {
  const server = createServer(async (req, res) => {
    try {
      const url = decodeURIComponent((req.url || '/').split('?')[0]);
      if (!url.startsWith(prefix)) {
        res.writeHead(404).end('outside the prefix');
        return;
      }
      let rel = url.slice(prefix.length) || '/';
      if (rel.endsWith('/')) rel += 'index.html';
      /* refuse to climb out of the served directory */
      const file = normalize(join(root, rel));
      if (!file.startsWith(normalize(root))) {
        res.writeHead(403).end('nope');
        return;
      }
      await stat(file);
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': TYPES[extname(file)] || 'application/octet-stream',
      });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, port: server.address().port };
}

test.describe('the build is uploadable', () => {
  test('has fewer than 1000 files', async ({ page: _page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'checked once');
    /* itch rejects the upload outright:
         "There was a problem loading your project:
          Too many files in zip (1266 > 1000)"
       That is exactly what one WebVTT file per clip cost — 519 of them.
       The whole book's timing is one identified-cue file now, and this
       is here so the next person who splits something per-clip finds out
       before the upload rather than after. */
    const { readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const count = (dir) =>
      readdirSync(dir).reduce(
        (n, e) => n + (statSync(join(dir, e)).isDirectory() ? count(join(dir, e)) : 1),
        0
      );
    const files = count('dist');
    expect(files, `${files} files; itch allows 1000`).toBeLessThan(1000);
  });
});

test.describe('the production build on a nested path', () => {
  /* Run once, not per engine. What is under test is the shape of the
     built output — whether its URLs resolve from a nested prefix — and
     that is the same in every browser. Running it four times also means
     four extra HTTP servers competing with the dev server, which is what
     made it flake. */
  test('loads and reads with nothing 404ing', async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      'the built output is engine-independent; checked once'
    );

    const prefix = '/html/1891234/';
    const { server, port } = await serveNested(prefix, 'dist');
    const missing = [];
    page.on('response', (r) => {
      if (r.status() >= 400) missing.push(`${r.status()} ${new URL(r.url()).pathname}`);
    });

    try {
      await page.goto(`http://127.0.0.1:${port}${prefix}#/book/magi/read/0`);
      await page.locator('.scene').waitFor({ timeout: 15_000 });

      /* the picture really decoded */
      const w = await page.locator('.plate').evaluate((img) => img.naturalWidth);
      expect(w).toBeGreaterThan(0);

      /* the words are there */
      await expect(page.locator('.sub-line')).not.toBeEmpty();

      /* and the reading advances */
      await page.getByRole('button', { name: 'Next ›' }).click();
      await expect(page).toHaveURL(/#\/book\/magi\/read\/1$/);

      expect(missing).toEqual([]);
    } finally {
      await new Promise((r) => server.close(r));
    }
  });
});
