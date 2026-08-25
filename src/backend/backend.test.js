import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * The script a teacher pastes into their own Sheet.
 *
 * Nothing here can run it — Apps Script's globals are Google's, not
 * Node's — so these are the checks that are possible without a
 * spreadsheet, and they are the ones that matter: it has to parse, it
 * has to have the routes the reader posts to, and it must never hand a
 * student's work back out.
 *
 * A backend that does not parse is a teacher pasting three hundred lines
 * into their Sheet and getting a syntax error with no idea which part
 * came out wrong.
 */

const code = readFileSync('src/backend/backend.gs', 'utf8');

describe('it is a script somebody can actually paste', () => {
  it('parses as JavaScript', () => {
    expect(() => new Function(code)).not.toThrow();
  });

  it('is the whole thing, not a truncated copy', () => {
    expect(code.split('\n').length).toBeGreaterThan(300);
    expect(code.trimEnd().endsWith('}')).toBe(true);
  });

  it('tells the teacher what to do with it, at the top', () => {
    const head = code.slice(0, 1200);
    expect(head).toContain('Extensions');
    expect(head).toContain('Apps Script');
    expect(head).toMatch(/Execute as:\s*Me/);
    expect(head).toMatch(/Who has access:\s*Anyone/);
  });

  it('warns about the warning, because that is where people stop', () => {
    expect(code).toContain('unverified');
  });

  it('is called Magi Reader, not the working name it had', () => {
    expect(code).toContain('Magi Reader');
    expect(code).not.toContain('Raven classroom backend');
  });
});

describe('the routes the reader posts to', () => {
  it('has the two entry points Apps Script calls', () => {
    expect(code).toMatch(/function doPost\s*\(/);
    expect(code).toMatch(/function doGet\s*\(/);
  });

  it('records a hand-in and rebuilds the marks', () => {
    for (const fn of ['record', 'rebuild', 'writeAnswers', 'writeGrades']) {
      expect(code, `no ${fn}()`).toMatch(new RegExp(`function ${fn}\\s*\\(`));
    }
  });

  it('checks the roster rather than trusting the name typed in', () => {
    expect(code).toMatch(/function onRoster\s*\(/);
  });
});

describe('what it refuses to do', () => {
  it('never hands a student’s work back out', () => {
    /* the deployment link is a way in, not a way to read the class —
       a link a whole class holds must not be a way to read the class */
    const get = code.slice(code.indexOf('function doGet'));
    const body = get.slice(0, get.indexOf('\nfunction '));
    expect(body).not.toMatch(/\bAnswers\b/);
    expect(body).not.toMatch(/\bwriteAnswers\b/);
  });

  it('guards a cell that would otherwise be read as a formula', () => {
    /* a student who types =IMPORTXML(...) as their answer must not have
       it evaluated in a teacher's spreadsheet */
    expect(code).toMatch(/function safe\s*\(/);
    const safe = code.slice(code.indexOf('function safe'));
    expect(safe.slice(0, 400)).toMatch(/[=+\-@]/);
  });
});
