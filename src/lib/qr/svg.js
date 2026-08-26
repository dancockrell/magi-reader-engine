import { encode } from './encode.js';

/**
 * Turning a matrix into something drawable.
 *
 * Kept out of the component for the reason everything else in `src/lib`
 * is: the part that can be wrong — the quiet zone, the coordinates, the
 * viewBox arithmetic — is the part that can be tested without a browser.
 * What is left in the UI is an `<svg>` tag with a `d` on it.
 *
 * SVG rather than the prototype's `<canvas>`, and that is the one thing
 * here that is not a port. A canvas is a fixed number of device pixels
 * chosen when it is drawn, so the code a teacher projects at full screen
 * is a 232-pixel bitmap stretched across two metres of wall, and the edge
 * of every module goes soft exactly when the camera is furthest away.
 * SVG has no resolution, so the same element is sharp on a phone and on a
 * projector, and it prints. It also means the size lives in CSS, which is
 * where a size that depends on the screen belongs.
 */

/**
 * How much white goes round the outside, in modules.
 *
 * Four is what the standard requires, and it is not decoration: a reader
 * finds the symbol by looking for the light border around the finder
 * patterns. The prototype used two and got away with it because a canvas
 * on a dark card had more white around it anyway. Four, always, so that
 * getting away with it is not part of the design.
 */
export const QUIET = 4;

/**
 * @typedef {object} QrSvg
 * @property {string} d one path covering every dark module
 * @property {number} extent width and height of the viewBox, in modules
 * @property {number} version
 * @property {number} mask
 */

/**
 * The path data for a code, and the box it wants to be drawn in.
 *
 * One `<path>` for the whole symbol rather than a rectangle per module:
 * a version 8 code is 2209 modules, and 2209 elements is a real cost on
 * a school tablet for a picture that never changes.
 *
 * @param {string} text
 * @returns {QrSvg}
 */
export function qrPath(text) {
  const code = encode(text);
  const extent = code.size + QUIET * 2;

  /* Each dark module is one closed subpath, in absolute coordinates.
     `h1 v1 h-1 z` is the same square in three fewer characters, which on
     a symbol this size is worth having in the DOM. */
  let d = '';
  for (let r = 0; r < code.size; r++) {
    for (let c = 0; c < code.size; c++) {
      if (code.modules[r][c]) d += `M${c + QUIET} ${r + QUIET}h1v1h-1z`;
    }
  }

  return { d, extent, version: code.version, mask: code.mask };
}
