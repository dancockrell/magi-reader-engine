import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { typeInto } from './book.js';
import AxeBuilder from '@axe-core/playwright';

/**
 * The offline round trip: a student saves a file, a teacher drops it in,
 * a marking workbook comes out.
 *
 * This is the path for a room with no Google in it, and it is the one
 * the original requirement was about — thirty students, hundreds of
 * answers, and a way to mark them that does not involve scrolling
 * through a JSON file.
 */

const setUpClass = async (page, name = '1-A') => {
  await page.goto('/#/class');
  await page.locator('.klass').waitFor();
  await typeInto(page.getByLabel('Class name'), name);
  await page.getByRole('button', { name: 'Set up this class' }).click();
  await expect(page.locator('.keybox').first()).toBeVisible();
};

/** A handed-in file, in the shape buildSubmission produces. */
const submission = (over = {}) =>
  JSON.stringify({
    assignment: 'The Gift of the Magi — Reading 3 Written',
    pass: 3,
    className: '1-A',
    studentNo: '07',
    realName: 'Ana Lopez',
    nickname: 'Ana',
    score: null,
    totalItems: 2,
    percent: null,
    minutesSpent: 12,
    submittedAt: '2026-08-24T10:00:00.000Z',
    items: [
      {
        kind: 'written',
        id: 's1',
        segment: 's1',
        question: 'Why does Della cry?',
        answer: 'Because she only has one dollar and eighty-seven cents.',
      },
      {
        kind: 'written',
        id: 's2',
        segment: 's2',
        question: 'What does Jim sell?',
        answer: 'His gold watch, to buy her the combs.',
      },
    ],
    ...over,
  });

/** Drop files in without a real file dialog. */
async function dropIn(page, files) {
  await page.locator('input[type="file"]').setInputFiles(
    files.map((f) => ({
      name: f.name,
      mimeType: 'application/json',
      buffer: Buffer.from(f.text, 'utf8'),
    }))
  );
}

test.describe('collecting work by hand', () => {
  test.beforeEach(async ({ page }) => setUpClass(page));

  test('says there is nothing before there is', async ({ page }) => {
    await expect(page.locator('.klass')).toContainText('Nothing yet');
    await expect(page.locator('table.sheet')).toHaveCount(0);
  });

  test('takes a handed-in file and shows whose it is', async ({ page }) => {
    await dropIn(page, [{ name: 'ana.json', text: submission() }]);

    await expect(page.locator('table.sheet')).toBeVisible();
    await expect(page.locator('table.sheet tbody tr')).toHaveCount(1);
    await expect(page.locator('table.sheet')).toContainText('Ana Lopez');
    await expect(page.locator('table.sheet')).toContainText('1-A');
    /* 07 is not 7 */
    await expect(page.locator('table.sheet .num').first()).toHaveText('07');
  });

  test('takes a whole pile at once', async ({ page }) => {
    await dropIn(page, [
      { name: 'a.json', text: submission({ realName: 'Ana Lopez', studentNo: '07' }) },
      { name: 'b.json', text: submission({ realName: 'Ben Ito', studentNo: '08' }) },
      { name: 'c.json', text: submission({ realName: 'Cho Min', studentNo: '09' }) },
    ]);
    await expect(page.locator('table.sheet tbody tr')).toHaveCount(3);
    await expect(page.locator('.klass')).toContainText('3 pieces');
  });

  test('says which file it could not read, rather than dropping it quietly', async ({
    page,
  }) => {
    /* a teacher who dragged in twenty-nine files and got twenty-eight
       rows needs to know which one */
    await dropIn(page, [
      { name: 'good.json', text: submission() },
      { name: 'holiday-photo.json', text: '{"not":"a submission"}' },
    ]);

    await expect(page.locator('.klass')).toContainText('could not be read');
    await expect(page.locator('.klass')).toContainText('holiday-photo.json');
    await expect(page.locator('table.sheet tbody tr')).toHaveCount(1);
  });

  test('a second attempt replaces the first rather than making two rows', async ({ page }) => {
    await dropIn(page, [{ name: 'a.json', text: submission() }]);
    await dropIn(page, [
      { name: 'a-again.json', text: submission({ submittedAt: '2026-08-25T10:00:00.000Z' }) },
    ]);

    await expect(page.locator('table.sheet tbody tr')).toHaveCount(1);
    await expect(page.locator('.klass')).toContainText('replaced an earlier attempt');
  });

  test('survives a reload, because marking is not one sitting', async ({ page }) => {
    await dropIn(page, [{ name: 'a.json', text: submission() }]);
    await page.reload();
    await page.locator('.klass').waitFor();
    await expect(page.locator('table.sheet tbody tr')).toHaveCount(1);
  });

  test('removing it asks first', async ({ page }) => {
    await dropIn(page, [{ name: 'a.json', text: submission() }]);
    await page.getByRole('button', { name: 'Remove the collected work' }).click();
    await expect(page.getByRole('button', { name: /Yes, remove all/ })).toBeVisible();

    await page.getByRole('button', { name: 'Keep it' }).click();
    await expect(page.locator('table.sheet tbody tr')).toHaveCount(1);

    await page.getByRole('button', { name: 'Remove the collected work' }).click();
    await page.getByRole('button', { name: /Yes, remove all/ }).click();
    await expect(page.locator('table.sheet')).toHaveCount(0);
  });
});

test.describe('the marking workbook', () => {
  test.beforeEach(async ({ page }) => setUpClass(page));

  test('cannot be asked for when there is nothing to mark', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Marking workbook' })).toBeDisabled();
  });

  test('downloads, named so it can be found again', async ({ page }, testInfo) => {
    /* Firefox over BiDi does not surface a download to the harness, so
       this is checked in the three engines that do. What the file
       contains is asserted in the unit tests, against the bytes. */
    test.skip(testInfo.project.name === 'gecko', 'BiDi does not report downloads');

    await dropIn(page, [{ name: 'a.json', text: submission() }]);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Marking workbook' }).click(),
    ]);

    const name = download.suggestedFilename();
    expect(name).toMatch(/\.xlsx$/);
    expect(name).toContain('1-A');
    expect(name).toContain('Magi');
  });

  test('is a real spreadsheet, with the answers grouped by question', async ({
    page,
  }, testInfo) => {
    /* Firefox over BiDi does not surface a download to the harness, so
       this is checked in the three engines that do. What the file
       contains is asserted in the unit tests, against the bytes. */
    test.skip(testInfo.project.name === 'gecko', 'BiDi does not report downloads');

    await dropIn(page, [
      { name: 'a.json', text: submission({ realName: 'Ana Lopez' }) },
      { name: 'b.json', text: submission({ realName: 'Ben Ito', studentNo: '08' }) },
    ]);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Marking workbook' }).click(),
    ]);

    const stream = await download.createReadStream();
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    const bytes = Buffer.concat(chunks);

    /* "PK" — it really is a ZIP, which is what an xlsx is */
    expect(bytes.subarray(0, 2).toString('latin1')).toBe('PK');

    const text = bytes.toString('utf8');
    expect(text).toContain('Grades');
    expect(text).toContain('Answers');
    /* both students under one question, and the SUMIFS that carries a
       mark back to the grade table */
    expect(text).toContain('Why does Della cry?   (2 answers)');
    expect(text).toContain('SUMIFS(Answers!$F:$F');
  });

  test('the CSV comes out too', async ({ page }, testInfo) => {
    /* Firefox over BiDi does not surface a download to the harness, so
       this is checked in the three engines that do. What the file
       contains is asserted in the unit tests, against the bytes. */
    test.skip(testInfo.project.name === 'gecko', 'BiDi does not report downloads');

    await dropIn(page, [{ name: 'a.json', text: submission() }]);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });
});

test.describe('a student with no Sheet to send to', () => {
  test('is given a file to hand over rather than being left holding it', async ({
    page,
  }, testInfo) => {
    /* Firefox over BiDi does not surface a download to the harness, so
       this is checked in the three engines that do. What the file
       contains is asserted in the unit tests, against the bytes. */
    test.skip(testInfo.project.name === 'gecko', 'BiDi does not report downloads');

    await page.goto('/#/read/2/999999');
    await page.locator('.finish').waitFor();
    await expect(page.locator('.handin-note')).toContainText('stays here');

    /* asked who they are first: a file with no name on it is no use to
       a teacher collecting thirty of them */
    await page.getByRole('button', { name: /Save my work to a file/ }).click();
    await expect(page.locator('.signin')).toBeVisible();

    await typeInto(page.getByLabel('Class'), '1-A');
    await typeInto(page.getByLabel('Number'), '07');
    await typeInto(page.getByLabel('Your name'), 'Ana Lopez');
    await page.getByRole('button', { name: /That’s me/ }).click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Save my work to a file/ }).click(),
    ]);

    const name = download.suggestedFilename();
    expect(name).toContain('Ana Lopez');
    expect(name).toContain('1-A');
    expect(name).toMatch(/\.json$/);
  });
});

test.describe('the gradebook is accessible', () => {
  test('no WCAG A or AA violations with work in it', async ({ page }) => {
    await setUpClass(page);
    await dropIn(page, [{ name: 'a.json', text: submission() }]);
    await page.locator('table.sheet').waitFor();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
