/**
 * A QR code for the link the class gets.
 *
 * Ported, deliberately unchanged, from the encoder in `legacy/index.html`
 * — byte mode, error correction level M, versions 1 to 10. That encoder
 * shipped, and teachers used it to get a room full of students onto the
 * check-in page, so it has the one property no amount of desk-checking
 * buys: phones have read its output. Reimplementing it from the standard
 * would have thrown that away to arrive somewhere no better.
 *
 * So the maths here is the prototype's maths, line for line. What changed
 * is the packaging — modules, named exports, types — and one substitution
 * noted at `bytes()`. `legacy-parity.test.js` runs both encoders over the
 * same inputs and compares every module of the matrix, which is what makes
 * "unchanged" a checkable claim rather than an intention.
 *
 * Why no dependency: this ships to itch as static files, and a QR library
 * is 20 KB and a supply chain for something the prototype already solved
 * in 200 lines.
 *
 * Level M corrects about 15% of the symbol. That is the right level for a
 * code on a projector or held up on a phone, where the damage is glare and
 * a bad angle rather than a torn sticker, and it keeps the symbol small
 * enough that the back row can still resolve the modules.
 */

/* ------------------------------------------------------------------
   GF(256), the field Reed-Solomon is done in
   ------------------------------------------------------------------ */

const EXP = new Array(512);
const LOG = new Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    /* 0x11d is the primitive polynomial the QR standard names; every
       other choice gives a valid field and unreadable codes. */
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}

/** @param {number} a @param {number} b */
const gmul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

/**
 * The generator polynomial for `n` error correction codewords.
 * @param {number} n
 * @returns {number[]}
 */
export function rsGenPoly(n) {
  let p = [1];
  for (let i = 0; i < n; i++) {
    const q = p.concat([0]);
    for (let j = 0; j < p.length; j++) q[j + 1] ^= gmul(p[j], EXP[i]);
    p = q;
  }
  return p;
}

/**
 * The error correction codewords for one block.
 *
 * @param {number[]} data
 * @param {number} ecLen
 * @returns {number[]}
 */
export function rsEncode(data, ecLen) {
  const gen = rsGenPoly(ecLen);
  const res = new Array(ecLen).fill(0);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i] ^ res[0];
    res.shift();
    res.push(0);
    for (let j = 0; j < ecLen; j++) res[j] ^= gmul(gen[j + 1], factor);
  }
  return res;
}

/* ------------------------------------------------------------------
   the version tables, for level M only
   ------------------------------------------------------------------ */

/** total data codewords per version, level M */
const CAP = [0, 16, 28, 44, 64, 86, 108, 124, 154, 182, 216];
/** error correction codewords per block, level M */
const ECLEN = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
/**
 * [count, data codewords per block] groups, level M. Index 0 is empty
 * padding so that the index is the version number, as in the tables it
 * was copied from.
 *
 * @type {number[][][]}
 */
const BLOCKS = [
  [],
  [[1, 16]],
  [[1, 28]],
  [[1, 44]],
  [[2, 32]],
  [[2, 43]],
  [[4, 27]],
  [[4, 31]],
  [
    [2, 38],
    [2, 39],
  ],
  [
    [3, 36],
    [2, 37],
  ],
  [
    [4, 43],
    [1, 44],
  ],
];
/** alignment pattern centre coordinates per version */
const ALIGN = [
  null,
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

/** The largest byte-mode payload this encoder can hold, at version 10-M. */
export const MAX_BYTES = CAP[10] - 3;

/**
 * The smallest version that will hold `len` bytes.
 *
 * @param {number} len
 * @returns {number}
 */
export function pickVersion(len) {
  for (let v = 1; v <= 10; v++) {
    /* four bits of mode indicator, then the character count — eight bits
       below version 10, sixteen from version 10 up */
    const head = 4 + (v < 10 ? 8 : 16);
    if (CAP[v] * 8 >= head + len * 8) return v;
  }
  throw new Error('Text too long for this encoder (max ~200 characters).');
}

/**
 * The bytes a string is encoded as.
 *
 * The prototype hand-rolled UTF-8 because it had to run in a single file
 * with no imports; `TextEncoder` is the same transformation and is the
 * standard one. They agree on every well-formed string, which is what the
 * parity test compares them over. They differ only on a lone surrogate,
 * where `TextEncoder` substitutes U+FFFD and the hand-rolled loop emits
 * nonsense — a difference in favour of the port.
 *
 * Note what byte mode does NOT carry: a character set declaration. Readers
 * sniff UTF-8, which is why a class name in Korean survives the trip, but
 * the link itself is ASCII and never depends on that.
 *
 * @param {string} text
 * @returns {number[]}
 */
function bytes(text) {
  return [...new TextEncoder().encode(String(text))];
}

/**
 * Mode indicator, length, payload, padding, then split into blocks and
 * interleaved with their error correction codewords.
 *
 * @param {string} text
 * @returns {{version:number, bytes:number[]}}
 */
function buildData(text) {
  const data = bytes(text);
  const v = pickVersion(data.length);

  /** @type {number[]} */
  const bits = [];
  /** @param {number} val @param {number} n */
  const push = (val, n) => {
    for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  push(4, 4); /* byte mode */
  push(data.length, v < 10 ? 8 : 16);
  for (const b of data) push(b, 8);

  const cap = CAP[v] * 8;
  /* the terminator is up to four zero bits, and stops early if the
     symbol is already full */
  for (let i = 0; i < 4 && bits.length < cap; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  /* 0xEC and 0x11 alternating: the standard's pad codewords, chosen
     because they mask to something with a low penalty score */
  const pads = [0xec, 0x11];
  let pi = 0;
  while (bits.length < cap) push(pads[pi++ % 2], 8);

  /** @type {number[]} */
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    codewords.push(b);
  }

  /** @type {number[][]} */
  const dataBlocks = [];
  /** @type {number[][]} */
  const ecBlocks = [];
  let p = 0;
  for (const [count, size] of BLOCKS[v]) {
    for (let k = 0; k < count; k++) {
      const blk = codewords.slice(p, p + size);
      p += size;
      dataBlocks.push(blk);
      ecBlocks.push(rsEncode(blk, ECLEN[v]));
    }
  }

  /* Interleaved, not concatenated: a scuff across the symbol then lands
     one codeword in each block rather than destroying one block
     outright, and each block can correct its own share. */
  /** @type {number[]} */
  const out = [];
  const maxD = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxD; i++) for (const b of dataBlocks) if (i < b.length) out.push(b[i]);
  for (let i = 0; i < ECLEN[v]; i++) for (const b of ecBlocks) out.push(b[i]);

  return { version: v, bytes: out };
}

/* ------------------------------------------------------------------
   the matrix: function patterns first, then the data
   ------------------------------------------------------------------ */

/**
 * @param {number} v
 * @returns {{n:number, m:number[][], reserved:boolean[][]}}
 */
function makeMatrix(v) {
  const n = 17 + v * 4;
  /** @type {number[][]} */
  const m = [];
  /** @type {boolean[][]} */
  const reserved = [];
  for (let i = 0; i < n; i++) {
    m.push(new Array(n).fill(0));
    reserved.push(new Array(n).fill(false));
  }

  /* The three finders and their separators in one pass: the loop runs
     from -1 so the white ring around each finder is written too, and it
     is written as *reserved*, which is what stops the mask flipping it. */
  const finder = (r, c) => {
    for (let dr = -1; dr <= 7; dr++)
      for (let dc = -1; dc <= 7; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
        const on =
          (dr >= 0 && dr <= 6 && (dc === 0 || dc === 6)) ||
          (dc >= 0 && dc <= 6 && (dr === 0 || dr === 6)) ||
          (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
        m[rr][cc] = on ? 1 : 0;
        reserved[rr][cc] = true;
      }
  };
  finder(0, 0);
  finder(0, n - 7);
  finder(n - 7, 0);

  /* timing: row 6 and column 6, dark on even coordinates. This is what a
     reader measures the module size against, so it runs the full span
     between the separators. */
  for (let i = 8; i < n - 8; i++) {
    m[6][i] = i % 2 === 0 ? 1 : 0;
    reserved[6][i] = true;
    m[i][6] = i % 2 === 0 ? 1 : 0;
    reserved[i][6] = true;
  }

  /* alignment patterns, at every pairing of the centres for this
     version except the three that would sit on a finder */
  const ac = ALIGN[v];
  for (let a = 0; a < ac.length; a++)
    for (let b = 0; b < ac.length; b++) {
      const r = ac[a];
      const c = ac[b];
      if ((r < 8 && c < 8) || (r < 8 && c > n - 9) || (r > n - 9 && c < 8)) continue;
      for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++) {
          const on = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          m[r + dr][c + dc] = on ? 1 : 0;
          reserved[r + dr][c + dc] = true;
        }
    }

  /* the dark module, which is always dark and is the reason a decoder
     can tell a symbol from its own negative */
  m[n - 8][8] = 1;
  reserved[n - 8][8] = true;

  /* the two copies of the format information. Reserved now and filled in
     after masking, because the format bits carry the mask number and
     must not themselves be masked. */
  for (let i = 0; i < 9; i++) {
    reserved[8][i] = true;
    reserved[i][8] = true;
  }
  for (let i = 0; i < 8; i++) {
    reserved[8][n - 1 - i] = true;
    reserved[n - 1 - i][8] = true;
  }

  /* version information, only from version 7 up */
  if (v >= 7) {
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 3; j++) {
        reserved[i][n - 11 + j] = true;
        reserved[n - 11 + j][i] = true;
      }
  }

  return { n, m, reserved };
}

/**
 * The zigzag: two columns at a time, right to left, alternating up and
 * down, skipping the timing column and anything already reserved.
 *
 * @param {{n:number, m:number[][], reserved:boolean[][]}} M
 * @param {number[]} data
 */
function placeData(M, data) {
  const { n, m, reserved: res } = M;
  /** @type {number[]} */
  const bits = [];
  for (const b of data) for (let i = 7; i >= 0; i--) bits.push((b >> i) & 1);

  let idx = 0;
  let up = true;
  for (let col = n - 1; col > 0; col -= 2) {
    /* column 6 is the vertical timing pattern; the pair shifts left past
       it rather than straddling it */
    if (col === 6) col--;
    for (let k = 0; k < n; k++) {
      const row = up ? n - 1 - k : k;
      for (let c = 0; c < 2; c++) {
        const cc = col - c;
        if (res[row][cc]) continue;
        m[row][cc] = idx < bits.length ? bits[idx++] : 0;
      }
    }
    up = !up;
  }
}

/**
 * The eight mask conditions, verbatim from the standard. A module is
 * flipped where its condition holds. Mask 1 is horizontal stripes and
 * looks at the row only, which is why its column argument is unused.
 *
 * @type {Array<(r:number, c:number) => boolean>}
 */
const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r, _c) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/**
 * @param {{n:number, m:number[][], reserved:boolean[][]}} M
 * @param {number} maskIdx
 * @returns {number[][]}
 */
function applyMask(M, maskIdx) {
  const { n } = M;
  /** @type {number[][]} */
  const out = [];
  for (let r = 0; r < n; r++) {
    /** @type {number[]} */
    const row = [];
    for (let c = 0; c < n; c++) {
      let v = M.m[r][c];
      if (!M.reserved[r][c] && MASKS[maskIdx](r, c)) v ^= 1;
      row.push(v);
    }
    out.push(row);
  }
  return out;
}

/**
 * The fifteen format bits: two bits of error correction level, three of
 * mask, ten of BCH, then XORed with 0x5412 so that a symbol of all-zero
 * format bits cannot occur.
 *
 * @param {number} maskIdx
 * @returns {number} fifteen bits, bit 0 first on the symbol
 */
export function formatBits(maskIdx) {
  const ecBits = 0; /* level M is 00 — not 01, which is L */
  const data = (ecBits << 3) | maskIdx;
  let v = data << 10;
  const gen = 0x537;
  for (let i = 14; i >= 10; i--) if ((v >> i) & 1) v ^= gen << (i - 10);
  return ((data << 10) | v) ^ 0x5412;
}

/**
 * The eighteen version bits: six of version, twelve of BCH. Not XORed —
 * version 7 and up are large enough that the all-zero case cannot arise.
 *
 * @param {number} v
 * @returns {number}
 */
export function versionBits(v) {
  let d = v << 12;
  const gen = 0x1f25;
  for (let i = 17; i >= 12; i--) if ((d >> i) & 1) d ^= gen << (i - 12);
  return (v << 12) | d;
}

/**
 * @param {number[][]} grid
 * @param {number} n
 * @param {number} maskIdx
 */
function drawFormat(grid, n, maskIdx) {
  const f = formatBits(maskIdx);
  for (let i = 0; i < 15; i++) {
    const bit = (f >> i) & 1;
    /* the copy around the top-left finder, which jogs around the timing
       row and column rather than running straight */
    if (i < 6) grid[i][8] = bit;
    else if (i === 6) grid[7][8] = bit;
    else if (i === 7) grid[8][8] = bit;
    else if (i === 8) grid[8][7] = bit;
    else grid[8][14 - i] = bit;

    /* and the second copy, split between the other two finders, so that
       a symbol with one corner damaged is still readable */
    if (i < 8) grid[8][n - 1 - i] = bit;
    else grid[n - 15 + i][8] = bit;
  }
  grid[n - 8][8] = 1;
}

/**
 * @param {number[][]} grid
 * @param {number} n
 * @param {number} v
 */
function drawVersion(grid, n, v) {
  if (v < 7) return;
  const vb = versionBits(v);
  for (let i = 0; i < 18; i++) {
    const bit = (vb >> i) & 1;
    const r = Math.floor(i / 3);
    const c = i % 3;
    grid[r][n - 11 + c] = bit;
    grid[n - 11 + c][r] = bit;
  }
}

/**
 * How hard a masked symbol is to read, by the standard's four rules.
 * Lower is better, and the mask with the lowest score is the one shipped.
 *
 * @param {number[][]} g
 * @param {number} n
 * @returns {number}
 */
export function penalty(g, n) {
  let p = 0;

  /* rule 1: runs of five or more of the same colour, which a reader can
     lose count in */
  for (let r = 0; r < n; r++) {
    let run = 1;
    for (let c = 1; c < n; c++) {
      if (g[r][c] === g[r][c - 1]) run++;
      else {
        if (run >= 5) p += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) p += 3 + (run - 5);
  }
  for (let c = 0; c < n; c++) {
    let run = 1;
    for (let r = 1; r < n; r++) {
      if (g[r][c] === g[r - 1][c]) run++;
      else {
        if (run >= 5) p += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) p += 3 + (run - 5);
  }

  /* rule 2: solid two by two blocks */
  for (let r = 0; r < n - 1; r++)
    for (let c = 0; c < n - 1; c++) {
      const v = g[r][c];
      if (v === g[r][c + 1] && v === g[r + 1][c] && v === g[r + 1][c + 1]) p += 3;
    }

  /* rule 3: anything that looks like a finder pattern, which is the
     expensive mistake — a reader that finds a fourth corner gives up */
  const pat = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const match = (arr, at) => {
    for (let k = 0; k < 11; k++) if (arr[at + k] !== pat[k]) return false;
    return true;
  };
  const matchRev = (arr, at) => {
    for (let k = 0; k < 11; k++) if (arr[at + k] !== pat[10 - k]) return false;
    return true;
  };
  for (let r = 0; r < n; r++) {
    const row = g[r];
    for (let c = 0; c + 11 <= n; c++) if (match(row, c) || matchRev(row, c)) p += 40;
  }
  for (let c = 0; c < n; c++) {
    /** @type {number[]} */
    const col = [];
    for (let r = 0; r < n; r++) col.push(g[r][c]);
    for (let r = 0; r + 11 <= n; r++) if (match(col, r) || matchRev(col, r)) p += 40;
  }

  /* rule 4: how far the balance of dark to light is from even */
  let dark = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) dark += g[r][c];
  const pct = (dark * 100) / (n * n);
  p += Math.floor(Math.abs(pct - 50) / 5) * 10;

  return p;
}

/**
 * @typedef {object} QrCode
 * @property {number} size modules across, and down
 * @property {number} version 1 to 10
 * @property {number} mask which of the eight was chosen
 * @property {boolean[][]} modules `[row][column]`, true meaning dark. No
 *   quiet zone: that is the renderer's to add, because how much white a
 *   code needs depends on what it is drawn on.
 */

/**
 * Encode text as a QR code.
 *
 * Throws when the text will not fit at version 10. Callers show the link
 * as text in that case rather than a broken picture, which is what the
 * prototype did too.
 *
 * @param {string} text
 * @returns {QrCode}
 */
export function encode(text) {
  const d = buildData(text);
  const M = makeMatrix(d.version);
  placeData(M, d.bytes);

  /* All eight masks are built and scored, and the best kept. Picking one
     by rule would be quicker and would sometimes ship a symbol with a
     false finder pattern in it, which is the failure that looks fine on
     a screen and will not scan off a projector. */
  let best = 0;
  let bestScore = Infinity;
  /** @type {number[][]} */
  let bestGrid = [];
  for (let k = 0; k < 8; k++) {
    const g = applyMask(M, k);
    drawFormat(g, M.n, k);
    drawVersion(g, M.n, d.version);
    const s = penalty(g, M.n);
    if (s < bestScore) {
      bestScore = s;
      bestGrid = g;
      best = k;
    }
  }

  return {
    size: M.n,
    version: d.version,
    mask: best,
    modules: bestGrid.map((row) => row.map((v) => !!v)),
  };
}

/**
 * Whether `text` will fit in a code at all, without building one.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function fits(text) {
  return bytes(text).length <= MAX_BYTES;
}
