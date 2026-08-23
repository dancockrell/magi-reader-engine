import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';

/**
 * legacy/index.html is a preserved artifact, not source.
 *
 * It is the reader that actually ships, and the specification everything
 * in src/ is measured against. Prettier reflowed it once — 14,447 lines
 * became 37,706, every line changed — and a release was built from the
 * result before anyone noticed. That is precisely the failure this
 * project cannot afford: no known-good build to fall back to, and a
 * 37,000-line diff hiding whatever broke.
 *
 * These are cheap structural checks, not a checksum. A checksum would
 * have to be updated on every legitimate edit and would quickly be
 * updated without being read.
 */
describe('the shipping reader is preserved, not reformatted', () => {
  const src = readFileSync('legacy/index.html', 'utf8');
  const lines = src.split('\n');

  it('is one self-contained file', () => {
    expect(src).toContain('<!doctype html>');
    expect(src).toContain('</html>');
    /* nothing external: it has to run from a memory stick */
    expect(src).not.toMatch(/<script[^>]+src="https?:/i);
    expect(src).not.toMatch(/<link[^>]+href="https?:/i);
  });

  it('still has its hand-written shape', () => {
    /* Prettier's rewrite more than doubled this. The real file sits near
       14,400; a jump past 20,000 means something reformatted it. */
    expect(lines.length).toBeGreaterThan(10_000);
    expect(lines.length).toBeLessThan(20_000);
  });

  it('is not much larger than the app it contains', () => {
    const kb = statSync('legacy/index.html').size / 1024;
    expect(kb).toBeGreaterThan(1_000);
    expect(kb).toBeLessThan(1_800);
  });

  it('still contains the modules the rebuild is measured against', () => {
    for (const name of [
      'var TEXT_UNITS',
      'var SWAPS',
      'var PLATES',
      'var VOCAB',
      'var TEACHER',
    ]) {
      expect(src, `${name} is missing`).toContain(name);
    }
  });

  it('still carries the backend teachers are told to paste', () => {
    expect(src).toContain('id="ravenBackend"');
    expect(src).toContain('function doPost(');
  });

  it('has both glossary inconsistencies fixed', () => {
    /* found by the book contract; the fix belongs to the shipping app too */
    expect(src).toContain('{vestibule|a small entrance hall}');
    expect(src).toContain('{janitor|a building caretaker}');
  });
});
