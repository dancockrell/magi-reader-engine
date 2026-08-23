import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * The reading view, in a real browser.
 *
 * The assertions here are the old reader's scars: a picture that
 * marched up the page as lines advanced, art that was cropped through
 * faces, and the same sentence printed three times on one screen.
 */

test.describe('the picture window', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.scene').waitFor();
  });

  test('shows the whole picture rather than cropping it', async ({ page }) => {
    const fit = await page.locator('.plate').evaluate((el) => getComputedStyle(el).objectFit);
    expect(fit).toBe('contain');
  });

  test('the art actually loads', async ({ page }) => {
    /* naturalWidth is 0 until the image has decoded, so reading it the
       moment .scene appears is a race — it passed alone and failed under
       load. Poll until the browser has it, or fail on the timeout. */
    await expect
      .poll(() => page.locator('.plate').evaluate((img) => img.naturalWidth), {
        timeout: 15_000,
        message: 'the scene picture never decoded',
      })
      .toBeGreaterThan(0);
  });

  test('the frame does not move as the reading advances', async ({ page }) => {
    /* the "marching picture": layout was being computed from
       text-dependent measurements, so the frame drifted line by line */
    const box = () => page.locator('.scene').boundingBox();
    const before = await box();
    for (let n = 0; n < 4; n++) {
      await page.getByRole('button', { name: 'Next ›' }).click();
      await page.waitForTimeout(60);
    }
    const after = await box();
    expect(Math.round(after.y)).toBe(Math.round(before.y));
    expect(Math.round(after.height)).toBe(Math.round(before.height));
    expect(Math.round(after.x)).toBe(Math.round(before.x));
  });

  test('the line appears once, on the picture', async ({ page }) => {
    /* The first version of this counted the sentence in body.innerText,
       which raced the cue fetch: the words re-render once the VTT
       resolves, so under load the count was taken mid-update. Asserting
       on structure instead of on a text scrape is both stricter and
       deterministic. */
    await expect(page.locator('.sub-line')).not.toBeEmpty();

    const text = (await page.locator('.sub-line').textContent()).trim();
    expect(text.length).toBeGreaterThan(0);

    /* exactly one place shows it... */
    await expect(page.locator('.sub-line')).toHaveCount(1);

    /* ...and nothing outside the picture repeats it. This is the
       "printed three times" defect: the same sentence as the big line,
       as a caption, and again in a translation panel. */
    const elsewhere = await page.evaluate(
      (needle) => {
        const scene = document.querySelector('.scene');
        return [...document.querySelectorAll('body *')]
          .filter((el) => !scene.contains(el) && !el.contains(scene))
          .filter((el) => (el.textContent || '').includes(needle))
          .map((el) => el.className || el.tagName);
      },
      text.slice(0, 30)
    );
    expect(elsewhere).toEqual([]);
  });

  test('the subtitle sits over the picture, not below it', async ({ page }) => {
    const scene = await page.locator('.scene').boundingBox();
    const subs = await page.locator('.subs').boundingBox();
    expect(subs.y).toBeGreaterThanOrEqual(scene.y);
    expect(subs.y + subs.height).toBeLessThanOrEqual(scene.y + scene.height + 1);
  });
});

test.describe('moving through the reading', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('.scene').waitFor();
  });

  test('Back is unavailable at the start and Next advances', async ({ page }) => {
    await expect(page.getByRole('button', { name: '‹ Back' })).toBeDisabled();
    await expect(page.locator('.count')).toHaveText('1 of 244');
    await page.getByRole('button', { name: 'Next ›' }).click();
    await expect(page.locator('.count')).toHaveText('2 of 244');
    await expect(page.getByRole('button', { name: '‹ Back' })).toBeEnabled();
  });

  test('arrow keys move too', async ({ page }) => {
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.count')).toHaveText('2 of 244');
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.count')).toHaveText('1 of 244');
  });

  test('progress is a real progress element', async ({ page }) => {
    const el = page.locator('progress.through');
    await expect(el).toHaveAttribute('max', '244');
    await expect(el).toHaveJSProperty('value', 1);
  });

  test('each beat carries its own audio and captions', async ({ page }) => {
    const first = await page.locator('audio').getAttribute('src');
    const track = await page.locator('audio track').getAttribute('src');
    /* relative, no leading slash — see "no asset is requested from the
       domain root" above. One cue file carries every clip. */
    expect(first).toBe('magi-audio/n_s1_0.mp3');
    expect(track).toBe('cues/magi.vtt');

    await page.getByRole('button', { name: 'Next ›' }).click();
    await expect(page.locator('audio')).toHaveAttribute('src', /n_s1_1\.mp3$/);
  });

  test('no asset is requested from the domain root', async ({ page }) => {
    /* itch serves a game from a nested path, so a leading slash sends
       every picture and clip to the wrong host root. This is the same
       shape of mistake as the backslash ZIP entries that broke an
       earlier upload: it works locally and fails only once deployed. */
    await page.goto('/');
    await page.locator('.scene').waitFor();

    const attrs = await page.evaluate(() => {
      const out = [];
      const img = document.querySelector('.plate');
      if (img) out.push(img.getAttribute('src'));
      const audio = document.querySelector('audio');
      if (audio) out.push(audio.getAttribute('src'));
      const track = document.querySelector('audio track');
      if (track) out.push(track.getAttribute('src'));
      return out.filter(Boolean);
    });

    expect(attrs.length).toBeGreaterThan(0);
    for (const a of attrs) {
      expect(a.startsWith('/'), `"${a}" is absolute and will 404 on itch`).toBe(false);
      expect(a.startsWith('http')).toBe(false);
    }
  });

  test('the caption file is really served, and holds every clip', async ({ page }) => {
    const res = await page.request.get('/cues/magi.vtt');
    expect(res.ok()).toBe(true);
    const body = await res.text();
    expect(body.startsWith('WEBVTT')).toBe(true);
    /* identified cues, so one file serves the whole book */
    expect(body).toContain('n_s1_0\n');
    expect(body).toContain('<00:00:00.477>dollar');
    expect(body).toContain('n_s12_14\n');
  });
});

test.describe('the reading view is accessible', () => {
  test('no WCAG A or AA violations', async ({ page }) => {
    await page.goto('/');
    await page.locator('.scene').waitFor();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('the picture is described by the scene’s own caption', async ({ page }) => {
    await page.goto('/');
    await page.locator('.scene').waitFor();
    const alt = await page.locator('.plate').getAttribute('alt');
    expect(alt).toBeTruthy();
    expect(alt).not.toMatch(/^(image|illustration|picture)$/i);
  });
});
