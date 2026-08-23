import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * The checks that were impossible until now.
 *
 * Everything here depends on the page being genuinely rendered,
 * composited and focused. In jsdom none of it is real, and in an
 * automated tab that never holds focus, `:focus` matches nothing — which
 * is how this project produced a confident, wrong report that no control
 * had a focus indicator.
 */

/** Relative luminance, per WCAG. */
function luminance({ r, g, b }) {
  const f = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
function parseRgb(text) {
  const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(text || '');
  return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
}

/**
 * These tests are about the vocabulary card, and the app opens on the
 * reading. Going through the real control rather than a query parameter
 * means the switch itself stays covered.
 */
async function openVocabulary(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Vocabulary' }).click();
  await page.locator('.opt').first().waitFor();
}

test.describe('keyboard focus is visible', () => {
  test('the document really has focus, unlike in the old harness', async ({ page }) => {
    await openVocabulary(page);
    expect(await page.evaluate(() => document.hasFocus())).toBe(true);
    expect(await page.evaluate(() => document.visibilityState)).toBe('visible');
  });

  test('tabbing to an option paints a ring that is actually there', async ({ page }) => {
    await openVocabulary(page);

    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();

    const style = await focused.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName,
        matchesFocusVisible: el.matches(':focus-visible'),
        outlineStyle: cs.outlineStyle,
        outlineWidth: cs.outlineWidth,
        outlineColor: cs.outlineColor,
        boxShadow: cs.boxShadow,
      };
    });

    expect(style.matchesFocusVisible).toBe(true);
    expect(style.outlineStyle).not.toBe('none');
    expect(parseFloat(style.outlineWidth)).toBeGreaterThanOrEqual(2);
    expect(style.boxShadow).not.toBe('none');
  });

  test('the ring clears 3:1 against what sits behind it', async ({ page }) => {
    await openVocabulary(page);
    await page.keyboard.press('Tab');

    const { ring, behind } = await page.locator(':focus').evaluate((el) => {
      const cs = getComputedStyle(el);
      /* walk out to the first opaque background */
      let n = el.parentElement;
      let bg = 'rgb(11, 10, 9)';
      while (n) {
        const c = getComputedStyle(n).backgroundColor;
        const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c);
        if (m && (m[4] === undefined || +m[4] === 1)) {
          bg = c;
          break;
        }
        n = n.parentElement;
      }
      return { ring: cs.outlineColor, behind: bg };
    });

    const ratio = contrast(parseRgb(ring), parseRgb(behind));
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  test('a mouse click leaves no ring — it is keyboard-only', async ({ page }) => {
    await openVocabulary(page);
    const first = page.locator('.opt').first();
    await first.click();

    const outline = await first.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).toBe('none');
  });

  test('answering moves focus to Next rather than stranding the student', async ({ page }) => {
    await openVocabulary(page);
    await page.locator('.opt').first().click();
    await expect(page.locator('.v-next')).toBeFocused();
  });
});

test.describe('the whole card, in a real viewport', () => {
  test('never scrolls sideways', async ({ page }) => {
    await openVocabulary(page);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflows).toBe(false);
  });

  test('every control is big enough to hit', async ({ page }) => {
    await openVocabulary(page);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('button, input')]
        .filter((el) => el.getClientRects().length)
        .map((el) => ({
          label: el.textContent?.trim().slice(0, 24) || el.id,
          h: el.getBoundingClientRect().height,
        }))
        .filter((x) => x.h < 44)
    );
    expect(small).toEqual([]);
  });

  test('no control overlaps the one below it', async ({ page }) => {
    /* the bug that put "Suivant" on top of the Finish button */
    await openVocabulary(page);
    await page.locator('.opt').first().click();

    const clash = await page.evaluate(() => {
      const els = [...document.querySelectorAll('.opt, .v-next, .btn')].filter(
        (e) => e.getClientRects().length
      );
      const boxes = els.map((e) => ({
        t: e.textContent.trim().slice(0, 20),
        r: e.getBoundingClientRect(),
      }));
      const bad = [];
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i].r;
          const b = boxes[j].r;
          const overlap =
            a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
          if (overlap) bad.push(`${boxes[i].t} <-> ${boxes[j].t}`);
        }
      }
      return bad;
    });
    expect(clash).toEqual([]);
  });
});

test.describe('accessibility, audited rather than assumed', () => {
  test('no WCAG A or AA violations on the question card', async ({ page }) => {
    await openVocabulary(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const summary = results.violations.map(
      (v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.help}`
    );
    expect(summary).toEqual([]);
  });

  test('and none after an answer is showing', async ({ page }) => {
    await openVocabulary(page);
    await page.locator('.opt').first().click();
    await page.locator('.v-fb').waitFor();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
