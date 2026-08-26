import { describe, it, expect } from 'vitest';
import { qrPath, QUIET } from './svg.js';
import { encode } from './encode.js';

/**
 * Everything a code needs to survive being projected, tested without a
 * projector. The contrast and the size are CSS and are checked in the
 * component; what is checked here is the geometry, because a quiet zone
 * that is one module short scans on a desk and fails at four metres,
 * which is not a failure anybody finds before the lesson.
 */

const LINK = 'https://example.test/reader/#/?join=0123456789ABCDEFGHJKMNPQRSTVWXYZ';

describe('the drawable form of a code', () => {
  it('leaves the quiet zone the standard asks for on all four sides', () => {
    /* A reader looks for light around the finder patterns to know where
       the symbol stops. Without it the wall, the slide behind it, or the
       next thing on the page runs straight into the code. */
    const { d, extent } = qrPath(LINK);
    const code = encode(LINK);
    expect(QUIET).toBeGreaterThanOrEqual(4);
    expect(extent).toBe(code.size + QUIET * 2);

    const coords = [...d.matchAll(/M(\d+) (\d+)/g)].map(([, x, y]) => [Number(x), Number(y)]);
    expect(coords.length).toBeGreaterThan(100);
    for (const [x, y] of coords) {
      expect(x).toBeGreaterThanOrEqual(QUIET);
      expect(y).toBeGreaterThanOrEqual(QUIET);
      /* the +1 because each module is drawn one unit wide from here */
      expect(x + 1).toBeLessThanOrEqual(extent - QUIET);
      expect(y + 1).toBeLessThanOrEqual(extent - QUIET);
    }
  });

  it('draws exactly the dark modules, offset by the quiet zone', () => {
    const code = encode(LINK);
    const { d } = qrPath(LINK);
    const drawn = new Set([...d.matchAll(/M(\d+) (\d+)/g)].map(([, x, y]) => `${y},${x}`));

    let dark = 0;
    for (let r = 0; r < code.size; r++)
      for (let c = 0; c < code.size; c++)
        if (code.modules[r][c]) {
          dark++;
          expect(drawn.has(`${r + QUIET},${c + QUIET}`), `module ${r},${c}`).toBe(true);
        }
    expect(drawn.size).toBe(dark);
  });

  it('bakes no size into the path, so CSS decides how big it is', () => {
    /* The whole reason this is SVG and not the prototype's canvas: the
       same element has to be sharp on a phone held up at the front and
       on a projector filling a wall. A pixel size in here would put the
       resolution back. */
    const { d, extent } = qrPath(LINK);
    expect(extent).toBeLessThan(70); /* modules, not pixels */
    expect(d).not.toMatch(/px|%|em/);
  });

  it('reports which version and mask it drew, for a failure to name', () => {
    const { version, mask } = qrPath(LINK);
    expect(version).toBe(encode(LINK).version);
    expect(mask).toBe(encode(LINK).mask);
  });

  it('throws rather than drawing half a link', () => {
    expect(() => qrPath('z'.repeat(214))).toThrow(/too long/i);
  });
});
