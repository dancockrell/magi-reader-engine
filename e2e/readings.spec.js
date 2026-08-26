import { test, expect } from '@playwright/test';
import { at, segment, SEGMENTS } from './book.js';
import AxeBuilder from '@axe-core/playwright';

/**
 * Readings 2 and 3, in a real browser.
 *
 * The reading, the question and the writing are one sequence driven by
 * one position, so most of what could break here is navigation: a
 * question that shows the wrong text after going back, work lost to a
 * reload, a hint that gives the answer away.
 */

/**
 * Walk forward until a stop of this kind is on screen.
 *
 * The position is read back after every click before the next one is
 * looked at. `count()` does not wait for anything, so a version of this
 * that clicked and counted in a loop was reading the DOM one render
 * behind — it walked past the prompt and then asserted against the line
 * after it. That is a bug in the test, but it is exactly the shape of
 * the bug it would have to catch in the app, so it is worth naming.
 *
 * Fails loudly rather than looping, because a reading with no questions
 * in it is itself the bug.
 */
async function forwardTo(page, selector, limit = 60) {
  const at = page.locator('.count');
  for (let n = 0; n < limit; n++) {
    if (await page.locator(selector).count()) {
      await expect(page.locator(selector).first()).toBeVisible();
      return true;
    }
    const before = await at.textContent();
    await page.getByRole('button', { name: 'Next ›' }).click();
    await expect(at).not.toHaveText(before);
  }
  throw new Error(`no ${selector} within ${limit} stops`);
}

/**
 * Answer the question on screen and return what was recorded.
 *
 * The reader's default is a hint and one more try, so the first click is
 * not necessarily an answer — a wrong one stays put and explains. The
 * second click on the same option is recorded whether it is right or
 * not, which is the rule: one more try, not unlimited tries.
 */
async function answerHere(page) {
  const opt = page.locator('.qcard .opt').first();
  const text = await opt.textContent();

  await opt.click();
  await expect(page.locator('.hint, .told').first()).toBeVisible();
  if (await page.locator('.hint').count()) await opt.click();

  await expect(page.locator('.told')).toBeVisible();
  return text;
}

/**
 * Get onto a question and answer it wrongly, so the hint is showing.
 *
 * Which option is right is not exposed anywhere a student — or a test —
 * can read, which is the point. So this picks the first option and, when
 * that happens to be the right one, moves to the next question and tries
 * again rather than reloading: an answer is final and is remembered, so
 * reloading would land back on the same closed question.
 */
async function provokeHint(page, tries = 8) {
  for (let n = 0; n < tries; n++) {
    await forwardTo(page, '.qcard');
    const opts = await page.locator('.qcard .opt').allTextContents();
    const asked = await page.locator('.q-text').textContent();

    await page.locator('.qcard .opt').first().click();
    await expect(page.locator('.hint, .told').first()).toBeVisible();
    if (await page.locator('.hint').count()) return { asked, opts };

    await page.getByRole('button', { name: 'Next ›' }).click();
  }
  throw new Error(`the first option was right ${tries} times running — check the book`);
}

/**
 * Type into the answer box, keystroke by keystroke.
 *
 * `fill()` sets the value and fires one input event, and in Firefox that
 * does not reach React's change tracking: the box showed the text while
 * the word count stayed at zero. Typing does reach it, in every engine —
 * verified by driving the same box both ways. A student types, so this
 * is also the thing worth testing.
 */
async function writeAnswer(page, text) {
  const box = page.locator('textarea.write');
  await box.click();
  await box.press('ControlOrMeta+a');
  await box.press('Delete');
  await box.pressSequentially(text);
  return box;
}

test.describe('reading 2 — the quiz', () => {
  test('a question comes after the segment it asks about', async ({ page }) => {
    await page.goto('/#/read/2/0');
    await page.locator('.scene').waitFor();

    /* the first stop is the story, not a question */
    await expect(page.locator('.qcard')).toHaveCount(0);
    await forwardTo(page, '.qcard');
    await expect(page.locator('.q-text')).not.toBeEmpty();
  });

  test('the picture stays while the question is answered', async ({ page }) => {
    await page.goto('/#/read/2/0');
    await forwardTo(page, '.qcard');
    await expect(page.locator('.stage.still .plate')).toBeVisible();
  });

  test('answering explains, and the reader moves on when they are ready', async ({ page }) => {
    await page.goto('/#/read/2/0');
    await forwardTo(page, '.qcard');
    const where = await page.locator('.count').textContent();

    await answerHere(page);
    /* the explanation is the teaching, so nothing scrolls past it */
    await expect(page.locator('.told')).toBeVisible();
    await expect(page.locator('.count')).toHaveText(where);

    await page.getByRole('button', { name: 'Next ›' }).click();
    await expect(page.locator('.count')).not.toHaveText(where);
  });

  test('an answered question is closed — the explanation is not a second go', async ({
    page,
  }) => {
    await page.goto('/#/read/2/0');
    await forwardTo(page, '.qcard');
    await answerHere(page);

    /* the explanation names the right answer, so being able to change
       the answer after reading it would be a way through the quiz */
    for (const opt of await page.locator('.qcard .opt').all()) await expect(opt).toBeDisabled();
    await expect(page.locator('.qcard .opt.correct')).toHaveCount(1);
  });

  test('the second try counts, right or wrong — one more try, not unlimited', async ({
    page,
  }) => {
    await page.goto('/#/read/2/0');
    await forwardTo(page, '.qcard');

    const opt = page.locator('.qcard .opt').first();
    await opt.click();
    if (await page.locator('.hint').count()) {
      /* the same wrong answer again is recorded, and that is that */
      await opt.click();
      await expect(page.locator('.told')).toBeVisible();
      await expect(page.locator('.hint')).toHaveCount(0);
      await expect(opt).toBeDisabled();
    }
  });

  test('a wrong answer gives a hint and the same question again', async ({ page }) => {
    await page.goto('/#/read/2/0');
    const { asked } = await provokeHint(page);

    await expect(page.locator('.hint')).toBeVisible();
    await expect(page.locator('.q-text')).toHaveText(asked);
    /* and nothing has been recorded yet */
    await expect(page.locator('.told')).toHaveCount(0);
  });

  test('the hint does not give the answer away', async ({ page }) => {
    await page.goto('/#/read/2/0');
    const { opts } = await provokeHint(page);

    const hint = (await page.locator('.hint').textContent()).toLowerCase();
    /* nothing on screen may be marked right or wrong: a student who can
       read the answer off the page has not been taught anything */
    await expect(page.locator('.qcard .opt.correct, .qcard .opt.wrong')).toHaveCount(0);
    for (const opt of opts) {
      const words = opt
        .toLowerCase()
        .replace(/[^a-z ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 5);
      const quoted = words.filter((w) => hint.includes(w));
      expect(quoted.length, `the hint quotes "${opt}"`).toBeLessThan(Math.max(1, words.length));
    }
  });

  test('going back shows the question that was asked there, and what was answered', async ({
    page,
  }) => {
    await page.goto('/#/read/2/0');
    await forwardTo(page, '.qcard');

    const asked = await page.locator('.q-text').textContent();
    const at = page.url();
    const chosen = await answerHere(page);

    await page.goto(at);
    await expect(page.locator('.q-text')).toHaveText(asked);
    await expect(page.locator('.qcard .opt.picked')).toHaveText(chosen);
  });

  test('answers survive a reload, because tablets sleep', async ({ page }) => {
    await page.goto('/#/read/2/0');
    await forwardTo(page, '.qcard');
    const at = page.url();
    const chosen = await answerHere(page);

    await page.goto(at);
    await page.reload();
    await expect(page.locator('.qcard .opt.picked')).toHaveText(chosen);
  });

  test('no WCAG A or AA violations on a question', async ({ page }) => {
    await page.goto('/#/read/2/0');
    await forwardTo(page, '.qcard');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test.describe('reading 3 — the writing', () => {
  test('a prompt comes with a box to write in', async ({ page }) => {
    await page.goto('/#/read/3/0');
    await forwardTo(page, '.wcard');
    await expect(page.locator('textarea.write')).toBeVisible();
    await expect(page.locator('.q-text')).not.toBeEmpty();
  });

  test('counts the words as they are written', async ({ page }) => {
    await page.goto('/#/read/3/0');
    await forwardTo(page, '.wcard');
    await writeAnswer(page, 'She sold her hair for him');
    await expect(page.locator('.wcount')).toContainText('6 words');
  });

  test('says nothing at all until there is something to say', async ({ page }) => {
    await page.goto('/#/read/3/0');
    await forwardTo(page, '.wcard');
    await expect(page.locator('.wback')).toHaveCount(0);
    await writeAnswer(page, 'She sold her hair because she loved him');
    await expect(page.locator('.wback')).toBeVisible();
  });

  test('never shows a mark, and nothing is ever marked wrong', async ({ page }) => {
    await page.goto('/#/read/3/0');
    await forwardTo(page, '.wcard');
    await writeAnswer(page, 'I do not know what to write about this at all.');
    const card = await page.locator('.wcard').textContent();
    expect(card).not.toMatch(/\b\d{1,3}\s*%/);
    expect(card.toLowerCase()).not.toMatch(/\b(wrong|incorrect|fail)\b/);
  });

  test('typing does not move the reading', async ({ page }) => {
    /* the arrow keys drive the reading; inside a textarea they must
       move the cursor instead */
    await page.goto('/#/read/3/0');
    await forwardTo(page, '.wcard');
    const at = await page.locator('.count').textContent();

    const box = await writeAnswer(page, 'the wind');
    await box.press('ArrowLeft');
    await box.press('ArrowRight');
    await expect(page.locator('.count')).toHaveText(at);
    await expect(box).toHaveValue('the wind');
  });

  test('the writing survives a reload', async ({ page }) => {
    await page.goto('/#/read/3/0');
    await forwardTo(page, '.wcard');
    const at = page.url();
    await writeAnswer(page, 'Because she had nothing else to give him.');
    await expect(page.locator('.wcount')).toContainText('8 words');

    await page.goto(at);
    await page.reload();
    await expect(page.locator('textarea.write')).toHaveValue(
      'Because she had nothing else to give him.'
    );
  });

  test('no WCAG A or AA violations on a prompt', async ({ page }) => {
    await page.goto('/#/read/3/0');
    await forwardTo(page, '.wcard');
    await writeAnswer(page, 'She sold her hair because she loved him.');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});

test.describe('the storyboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/read/1/0');
    await page.locator('.scene').waitFor();
  });

  test('opens from where you are, and shows pictures rather than dots', async ({ page }) => {
    await page.locator('.seg-open').click();
    await expect(page.locator('dialog.storyboard')).toBeVisible();
    await expect(page.locator('.seg')).toHaveCount(SEGMENTS);
    expect(await page.locator('.seg-plate img').count()).toBeGreaterThan(8);
    await expect(page.locator('.seg.here')).toHaveCount(1);
  });

  test('every row is laid out the same, read or unread', async ({ page }) => {
    /* A state class that another rule already owned — `.done`, which the
       finished screen uses — centred the title of every segment already
       read while the rest stayed left. Nothing was broken, and it looked
       broken, which is the kind of thing a stylesheet does quietly. */
    await page.goto('/#/read/1/60');
    await page.locator('.scene').waitFor();
    await page.locator('.seg-open').click();
    await expect(page.locator('dialog.storyboard')).toBeVisible();
    await expect(page.locator('.seg.behind')).not.toHaveCount(0);

    const lefts = await page
      .locator('.seg-title')
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));
    expect(new Set(lefts).size, `titles start at ${[...new Set(lefts)].join(', ')}`).toBe(1);
  });

  test('choosing a segment goes to the top of it', async ({ page }) => {
    await page.locator('.seg-open').click();
    const third = page.locator('.seg').nth(2);
    const title = await third.locator('.seg-title').textContent();
    await third.click();

    await expect(page.locator('dialog.storyboard')).toBeHidden();
    await expect(page.locator('.where .title')).toHaveText(title);
    await expect(page.locator('.seg-count')).toHaveText(segment(3));
  });

  test('the keyboard does not drive the reading behind it', async ({ page }, testInfo) => {
    test.skip(
      ['tablet', 'phone'].includes(testInfo.project.name),
      'touch profile: no keyboard to press'
    );
    await page.getByRole('button', { name: 'Next ›' }).click();
    /* read the position back once it has settled, not straight after
       the click — the click returns before React has rendered */
    await expect(page.locator('.count')).toHaveText(at(2));
    const before = await page.locator('.count').textContent();

    await page.locator('.seg-open').click();
    await expect(page.locator('dialog.storyboard')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Escape');

    await expect(page.locator('.count')).toHaveText(before);
  });
});

test.describe('moving by segment', () => {
  test('back from partway through restarts the segment', async ({ page }) => {
    await page.goto('/#/read/1/4');
    await page.locator('.scene').waitFor();
    await expect(page.locator('.seg-count')).toHaveText(segment(1));

    await page.getByRole('button', { name: 'Previous segment' }).click();
    await expect(page.locator('.count')).toHaveText(at(1));
  });

  test('forward goes to the top of the next one', async ({ page }) => {
    await page.goto('/#/read/1/0');
    await page.locator('.scene').waitFor();
    await page.getByRole('button', { name: 'Next segment' }).click();
    await expect(page.locator('.seg-count')).toHaveText(segment(2));
  });
});

test.describe('the one thing to look for', () => {
  /* Authored per part, translated into every language the picker offers,
     promised in the printed guide, and rendered nowhere but the guide
     until now. A unit test proves which line is chosen; this proves a
     student can see it. */
  test('is on screen when a part begins, and gone once it is under way', async ({ page }) => {
    await page.goto('/#/read/1/0');
    const aim = page.locator('.aim');
    await expect(aim).toBeVisible();
    const first = (await aim.textContent()) || '';
    expect(first.length, 'the prompt is there but empty').toBeGreaterThan(20);

    /* Aimed once. Repeating it under every line would make it wallpaper. */
    await page.getByRole('button', { name: 'Next ›' }).click();
    await expect(page.locator('.aim')).toHaveCount(0);
  });

  test('changes when the next part starts, rather than repeating the first', async ({
    page,
  }) => {
    await page.goto('/#/read/1/0');
    const aim = page.locator('.aim');
    await expect(aim).toBeVisible();
    const first = (await aim.textContent()) || '';

    /* Jump a whole segment rather than clicking through every line.
       Asserted with not.toHaveText rather than by reading textContent a
       second time: that read raced the re-render and compared the old
       text against itself, failing for a reason that had nothing to do
       with the app. */
    await page.getByRole('button', { name: 'Next segment' }).click();
    await expect(aim).toBeVisible();
    await expect(aim).not.toHaveText(first);
  });

  test('is announced, not just painted', async ({ page }) => {
    /* It arrives without the student doing anything, so a reader that
       only paints it leaves a screen reader silent at every part. */
    await page.goto('/#/read/1/0');
    await expect(page.locator('.aim')).toHaveAttribute('role', 'status');
  });
});
