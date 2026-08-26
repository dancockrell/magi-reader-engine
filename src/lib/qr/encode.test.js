import { describe, it, expect } from 'vitest';
import {
  encode,
  rsEncode,
  formatBits,
  versionBits,
  pickVersion,
  penalty,
  fits,
  MAX_BYTES,
} from './encode.js';

/**
 * A QR encoder fails in a way nothing else does: the output looks
 * completely convincing and does not scan. There is no version of reading
 * a matrix of squares that tells you whether a phone will read it, so
 * every check here is against a number somebody else published.
 *
 * Three of them come straight out of ISO/IEC 18004, which is where a
 * reader's expectations come from too:
 *
 *   the worked example in Annex I, for the Reed-Solomon arithmetic
 *   Table C.1, for the format information
 *   Table D.1, for the version information
 *
 * Those three cover everything a reader looks at before it has decoded
 * anything. The rest is structure — where the standard puts the finders,
 * the timing pattern and the dark module — and `legacy-parity.test.js`
 * compares the whole matrix against the encoder that shipped.
 */

/** A deployment link of realistic length, and not a real one. */
const API =
  'https://script.google.com/macros/s/AKfycbwABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghij/exec';

describe('the arithmetic a reader checks first', () => {
  it('produces the error correction codewords the standard prints', () => {
    /* ISO/IEC 18004 Annex I: the symbol for "01234567" at version 1-M.
       The standard gives both halves, so the sixteen data codewords go
       in and the ten below have to come out. This is the check that the
       field, the generator polynomial and the division are all right at
       once — get any of them wrong and the symbol is unrecoverable
       noise to a reader that is otherwise perfectly happy with it. */
    const data = [
      0x10, 0x20, 0x0c, 0x56, 0x61, 0x80, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec, 0x11, 0xec,
      0x11,
    ];
    const expected = [0xa5, 0x24, 0xd4, 0xc1, 0xed, 0x36, 0xc7, 0x87, 0x2c, 0x55];
    expect(rsEncode(data, 10)).toEqual(expected);
  });

  it('gives the format information the standard tabulates for level M', () => {
    /* Table C.1, the level M row, all eight masks. A reader finds these
       fifteen bits before it knows anything else about the symbol, so a
       wrong bit here is not a degraded scan, it is no scan. The XOR mask
       0x5412 is in them, which is why mask 0 is not all zeroes. */
    const TABLE_C1_M = [
      '101010000010010',
      '101000100100101',
      '101111001111100',
      '101101101001011',
      '100010111111001',
      '100000011001110',
      '100111110010111',
      '100101010100000',
    ];
    for (let mask = 0; mask < 8; mask++) {
      const bits = formatBits(mask).toString(2).padStart(15, '0');
      expect(bits, `mask ${mask}`).toBe(TABLE_C1_M[mask]);
    }
  });

  it('gives the version information the standard tabulates', () => {
    /* Table D.1. Only versions 7 and up carry it, and this encoder goes
       to 10, so these four are the whole of what it can emit. */
    const TABLE_D1 = {
      7: '000111110010010100',
      8: '001000010110111100',
      9: '001001101010011001',
      10: '001010010011010011',
    };
    for (const [v, expected] of Object.entries(TABLE_D1)) {
      expect(versionBits(Number(v)).toString(2).padStart(18, '0'), `version ${v}`).toBe(
        expected
      );
    }
  });
});

describe('choosing a version', () => {
  it('takes the smallest one the text fits in', () => {
    /* A bigger symbol is not free: every extra version is four more
       modules across, and the back of the room has to resolve them. */
    expect(pickVersion(1)).toBe(1);
    expect(pickVersion(14)).toBe(1);
    expect(pickVersion(15)).toBe(2);
    expect(pickVersion(MAX_BYTES)).toBe(10);
  });

  it('refuses rather than silently truncating', () => {
    /* The failure that would matter: a link one byte too long, quietly
       cut short, encoded perfectly, and pointing nowhere. */
    expect(() => pickVersion(MAX_BYTES + 1)).toThrow(/too long/i);
    expect(fits('x'.repeat(MAX_BYTES))).toBe(true);
    expect(fits('x'.repeat(MAX_BYTES + 1))).toBe(false);
  });

  it('counts bytes rather than characters', () => {
    /* A class name in Korean is three bytes a character in byte mode, and
       counting characters would overflow the symbol it just chose. */
    expect(fits('한'.repeat(MAX_BYTES))).toBe(false);
    expect(encode('한글 1-A').version).toBe(1);
  });
});

describe('the symbol a reader looks at', () => {
  const code = encode(`https://example.test/reader#/?join=${'ABCDE'.repeat(20)}`);

  it('is square, and sized the way the standard sizes it', () => {
    expect(code.size).toBe(17 + code.version * 4);
    expect(code.modules).toHaveLength(code.size);
    for (const row of code.modules) expect(row).toHaveLength(code.size);
  });

  it('has a finder pattern in three corners and not the fourth', () => {
    /* The three squares are how a reader finds the symbol at all, and
       which way up it is. The fourth corner is deliberately not one. */
    const finder = (r0, c0) => {
      for (let dr = 0; dr < 7; dr++)
        for (let dc = 0; dc < 7; dc++) {
          const ring = dr === 0 || dr === 6 || dc === 0 || dc === 6;
          const core = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
          expect(code.modules[r0 + dr][c0 + dc], `${r0 + dr},${c0 + dc}`).toBe(ring || core);
        }
    };
    finder(0, 0);
    finder(0, code.size - 7);
    finder(code.size - 7, 0);

    /* and the separator: a light ring, or the reader reads the finder as
       part of the data next to it */
    for (let i = 0; i < 8; i++) {
      expect(code.modules[7][i], `separator ${7},${i}`).toBe(false);
      expect(code.modules[i][7], `separator ${i},7`).toBe(false);
    }
  });

  it('has a timing pattern that alternates the whole way across', () => {
    /* This is the ruler: a reader measures one module against it. If it
       does not alternate exactly, every coordinate after it drifts. */
    for (let i = 8; i < code.size - 8; i++) {
      expect(code.modules[6][i], `row timing at ${i}`).toBe(i % 2 === 0);
      expect(code.modules[i][6], `column timing at ${i}`).toBe(i % 2 === 0);
    }
  });

  it('has the dark module, which is always dark', () => {
    expect(code.modules[code.size - 8][8]).toBe(true);
  });

  it('puts an alignment pattern where the standard puts one', () => {
    /* From version 2 up, these are how a reader corrects for the symbol
       being photographed at an angle or off a curled sheet — which is
       every scan taken by somebody standing in a classroom. A version 5
       symbol has exactly one, centred at 30,30, and it is a five by five
       ring with a single dark module in the middle. */
    const v5 = encode('https://example.test/reader/#/?join=0123456789ABCDEFGHJKMNPQRSTVWXYZ');
    expect(v5.version).toBe(5);
    for (let dr = -2; dr <= 2; dr++)
      for (let dc = -2; dc <= 2; dc++) {
        const expected = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
        expect(v5.modules[30 + dr][30 + dc], `alignment ${dr},${dc}`).toBe(expected);
      }
  });

  it('carries the same format information in both copies', () => {
    /* Two copies so a damaged corner is survivable. They have to agree,
       and they are written by different lines of code, so this catches a
       transcription error in either. */
    const f = formatBits(code.mask);
    const n = code.size;
    for (let i = 0; i < 15; i++) {
      const bit = !!((f >> i) & 1);
      const first =
        i < 6
          ? code.modules[i][8]
          : i === 6
            ? code.modules[7][8]
            : i === 7
              ? code.modules[8][8]
              : i === 8
                ? code.modules[8][7]
                : code.modules[8][14 - i];
      const second = i < 8 ? code.modules[8][n - 1 - i] : code.modules[n - 15 + i][8];
      expect(first, `format bit ${i}, first copy`).toBe(bit);
      expect(second, `format bit ${i}, second copy`).toBe(bit);
    }
  });

  it('names the mask it used, within the eight there are', () => {
    /* The mask number is in the format bits, so a symbol whose reported
       mask is not the one applied decodes to nothing. */
    expect(code.mask).toBeGreaterThanOrEqual(0);
    expect(code.mask).toBeLessThan(8);
  });
});

describe('the penalty rules, which decide which mask ships', () => {
  /**
   * @param {number} n
   * @param {(r:number,c:number)=>boolean} f
   * @returns {number[][]}
   */
  const grid = (n, f) =>
    Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => Number(f(r, c))));

  it('punishes a flat field far more than a chequerboard', () => {
    /* Rules 1, 2 and 4 all fire on flat: long runs, solid blocks, and
       every module the same colour. A chequerboard trips none of them. */
    const n = 21;
    expect(
      penalty(
        grid(n, () => true),
        n
      )
    ).toBeGreaterThan(
      penalty(
        grid(n, (r, c) => (r + c) % 2 === 0),
        n
      ) * 10
    );
  });

  it('punishes anything shaped like a finder pattern', () => {
    /* This is the rule that matters most and the one worth a test of its
       own: a reader that spots a fourth finder-like run gives up on the
       symbol entirely. The penalty is 40 a time, so one planted run has
       to be visible against a chequerboard's score. */
    const n = 21;
    const clean = grid(n, (r, c) => (r + c) % 2 === 0);
    const planted = clean.map((row) => [...row]);
    for (const [i, v] of [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0].entries()) planted[10][i] = v;
    expect(penalty(planted, n) - penalty(clean, n)).toBeGreaterThanOrEqual(40);
  });
});

describe('what actually gets encoded', () => {
  it('is the same code every time for the same link', () => {
    /* A teacher reloads the class panel mid-lesson. The code on the wall
       must not change under the students already pointing at it. */
    const a = encode(API);
    const b = encode(API);
    expect(a.modules).toEqual(b.modules);
    expect(a.mask).toBe(b.mask);
  });

  it('grows the symbol as the link grows, and stays inside the limit', () => {
    /* The real join link is the app's own address plus a base32 join
       code, and the longest plausible one still has to fit. */
    const long = `https://html-classic.itch.zone/html/12345678/index.html#/?join=${'ABCDEFGH'.repeat(
      12
    )}`;
    expect(long.length).toBeGreaterThan(140);
    expect(fits(long)).toBe(true);
    expect(encode(long).version).toBeLessThanOrEqual(10);
    expect(encode('x').version).toBeLessThan(encode(long).version);
  });
});
