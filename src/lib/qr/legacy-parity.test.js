import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { encode } from './encode.js';

/**
 * The port is the prototype's encoder, and this is what makes that a
 * claim rather than an intention.
 *
 * `src/lib/qr/encode.js` was not written from the standard. It was lifted
 * out of `legacy/index.html`, where the same maths has been generating
 * check-in codes that phones in classrooms have actually read — which is
 * the only evidence about scannability that is worth anything, and the
 * reason porting beat rewriting.
 *
 * That evidence only transfers if the port is faithful, so the legacy
 * encoder is pulled out of the HTML, evaluated in isolation the way
 * `tools/extract-book.mjs` evaluates the book literals, and run against
 * the port over the same inputs. Every module of both matrices is
 * compared. A single flipped bit anywhere — a mask condition, an
 * interleave order, a format bit — shows up here as a failure, and there
 * is nowhere for a plausible-looking difference to hide.
 *
 * `legacy/index.html` is opened read-only and is never written to. If
 * this test starts failing, the port drifted; the reference did not.
 */

/** @type {{encode:(t:string)=>{size:number, version:number, mask:number, modules:boolean[][]}}} */
let LEGACY;

beforeAll(() => {
  const src = readFileSync('legacy/index.html', 'utf8');

  /* Sliced between two literals rather than parsed: the block is a
     self-contained IIFE assigned to one name, and it ends at the line
     that exports it for the prototype's own tests. Both markers are
     asserted below, so a change to the reference fails loudly here
     instead of silently testing nothing. */
  const START = 'var QR = (function(){';
  const END = "if(typeof module!=='undefined') module.exports=QR;";
  const from = src.indexOf(START);
  const to = src.indexOf(END, from);
  expect(from, 'the legacy QR encoder was not found in legacy/index.html').toBeGreaterThan(-1);
  expect(to, 'the end of the legacy QR encoder was not found').toBeGreaterThan(from);

  const block = src.slice(from, to);
  /* `module` is not defined in here, which is exactly why the slice
     stops before the export line. */
  LEGACY = new Function(`${block}\nreturn QR;`)();
});

/**
 * The inputs, chosen to reach every branch the two encoders share.
 *
 * Between them they cover both character-count widths (eight bits below
 * version 10, sixteen at it), single-block and two-group interleaving,
 * symbols with and without alignment patterns, and symbols with and
 * without version information.
 */
const CASES = {
  'a single character': 'x',
  'nothing at all': '',
  'a plain link': 'https://example.test/reader',
  /* the real shape: this app's own address, then a base32 join code
     carrying an Apps Script deployment id and a class name */
  'a class link': `https://example.test/reader/#/?join=${'0123456789ABCDEFGHJKMNPQRSTVWXYZ'.repeat(
    3
  )}`,
  /* long enough to need version 8, where the blocks stop being the same
     size and the interleave has two groups in it */
  'a link long enough for two block groups': `https://html-classic.itch.zone/html/12345678/index.html#/?join=${'ABCDEFGH'.repeat(
    12
  )}`,
  /* version 10, where the character count field widens to sixteen bits
     and there is version information to place */
  'the longest thing that fits': 'y'.repeat(213),
  'a class name that is not English': '한글 1-A 담임 · ホーム',
  'characters outside the basic plane': '🙂🙂 1-A',
};

describe('the port is the encoder that shipped', () => {
  it('finds a working encoder in the reference', () => {
    /* If the slice above grabbed the wrong text this passes nothing and
       every comparison below is vacuously true. */
    expect(typeof LEGACY.encode).toBe('function');
    expect(LEGACY.encode('x').size).toBe(21);
  });

  for (const [what, text] of Object.entries(CASES)) {
    it(`produces an identical matrix for ${what}`, () => {
      const mine = encode(text);
      const theirs = LEGACY.encode(text);

      expect(mine.version, 'version').toBe(theirs.version);
      expect(mine.size, 'size').toBe(theirs.size);
      expect(mine.mask, 'mask').toBe(theirs.mask);
      /* Every module, not a hash: a failure should say which one. */
      expect(mine.modules).toEqual(theirs.modules);
    });
  }

  it('refuses the same things the reference refuses', () => {
    expect(() => encode('y'.repeat(214))).toThrow();
    expect(() => LEGACY.encode('y'.repeat(214))).toThrow();
  });

  it('agrees over a spread of lengths, not only the ones chosen above', () => {
    /* Cheap insurance against a case list that happens to miss the one
       length where a padding or block boundary falls badly. Every length
       from 1 to 213 would take a minute; every seventh takes a second
       and still crosses every version boundary. */
    for (let len = 1; len <= 213; len += 7) {
      const text = 'ab/9-Z_'.repeat(40).slice(0, len);
      expect(encode(text).modules, `length ${len}`).toEqual(LEGACY.encode(text).modules);
    }
  });
});
