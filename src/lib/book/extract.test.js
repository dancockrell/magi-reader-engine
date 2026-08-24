import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Pulling a book out of a single-file reader.
 *
 * Both of these were found by pointing the extractor at a second book —
 * The Raven — rather than by reasoning about it, and both failed in the
 * way that matters most: quietly, producing something that still looked
 * like a book.
 */

let dir;
beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'raven-extract-'));
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Run the real tool against a made-up reader and read what it wrote. */
function extract(html, name) {
  const from = join(dir, `${name}.html`);
  const to = join(dir, `${name}.json`);
  writeFileSync(from, html, 'utf8');
  execFileSync('node', ['tools/extract-book.mjs', from, to], { encoding: 'utf8' });
  return JSON.parse(readFileSync(to, 'utf8'));
}

const unit = (id) =>
  `{ id:"${id}", scene:"${id}", title:"Part ${id}", stanzas:["A line for ${id}."], gloss:[] }`;

describe('a book declared in more than one piece', () => {
  it('picks up units pushed on after the array was closed', () => {
    /* The Raven declares four units, closes the array, and adds the
       other eight with TEXT_UNITS.push() further down. Reading only the
       literal got a third of the poem and reported nothing wrong. */
    const book = extract(
      `<script>
        var TEXT_UNITS = [ ${unit('s1')}, ${unit('s2')} ];
        TEXT_UNITS.push( ${unit('s3')}, ${unit('s4')} );
        var SWAPS = {};
        var PLATES = {};
        var BOOK = { title:"Two Pieces" };
      </script>`,
      'pieces'
    );
    expect(book.units.map((u) => u.id)).toEqual(['s1', 's2', 's3', 's4']);
  });

  it('keeps them in the order the file adds them', () => {
    const book = extract(
      `<script>
        var TEXT_UNITS = [ ${unit('s1')} ];
        TEXT_UNITS.push( ${unit('s2')} );
        TEXT_UNITS.push( ${unit('s3')} );
        var BOOK = { title:"In Order" };
      </script>`,
      'order'
    );
    expect(book.units.map((u) => u.id)).toEqual(['s1', 's2', 's3']);
  });

  it('is not confused by a bracket inside a line of the story', () => {
    const book = extract(
      `<script>
        var TEXT_UNITS = [ ${unit('s1')} ];
        TEXT_UNITS.push({ id:"s2", scene:"s2", title:"Brackets",
          stanzas:["He said \\"(quietly)\\" and left)."], gloss:[] });
        var BOOK = { title:"Brackets" };
      </script>`,
      'brackets'
    );
    expect(book.units.map((u) => u.id)).toEqual(['s1', 's2']);
    expect(book.units[1].stanzas[0]).toContain('(quietly)');
  });

  it('leaves a book that never pushes exactly as it was', () => {
    const book = extract(
      `<script>
        var TEXT_UNITS = [ ${unit('s1')}, ${unit('s2')} ];
        var BOOK = { title:"One Piece" };
      </script>`,
      'onepiece'
    );
    expect(book.units.map((u) => u.id)).toEqual(['s1', 's2']);
  });
});

describe('a book that does not have every part', () => {
  it('extracts without vocabulary swaps', () => {
    /* The Raven was built before the vocabulary trainer existed. A book
       with no swaps is a book; the extractor used to stop dead. */
    const book = extract(
      `<script>
        var TEXT_UNITS = [ ${unit('s1')} ];
        var PLATES = { s1:"art/one.webp" };
        var BOOK = { title:"No Swaps" };
      </script>`,
      'noswaps'
    );
    expect(book.swaps).toEqual({});
    expect(book.units).toHaveLength(1);
    expect(book.plates.s1).toBe('art/one.webp');
  });

  it('extracts without a picture map', () => {
    const book = extract(
      `<script>
        var TEXT_UNITS = [ ${unit('s1')} ];
        var BOOK = { title:"No Plates" };
      </script>`,
      'noplates'
    );
    expect(book.plates).toEqual({});
  });

  it('still refuses a file with no story in it', () => {
    /* the one part that is not optional */
    expect(() =>
      extract(`<script>var SWAPS = {}; var BOOK = { title:"Empty" };</script>`, 'empty')
    ).toThrow();
  });
});
