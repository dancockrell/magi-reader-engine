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

/** Run the real tool against a made-up reader and read what it wrote.
 *
 *  The id is passed explicitly because these write into a temp folder,
 *  and the tool refuses to take a book id from a folder name that is not
 *  one — which is the whole point of the check. */
function extract(html, name, id = 'fixture') {
  const from = join(dir, `${name}.html`);
  const to = join(dir, `${name}.json`);
  writeFileSync(from, html, 'utf8');
  /* `stdio: pipe` so the child's stderr is captured rather than inherited.
     The "refuses a file with no story in it" test expects this to throw,
     and without piping it printed a full Node stack trace into every
     verify run — an alarming-looking error, in a passing suite, every
     time. A log that always contains a scary error is a log nobody reads
     when a real one turns up. The throw still carries the message on
     `e.stderr` for the tests that match against it. */
  execFileSync('node', ['tools/extract-book.mjs', from, to, id], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
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
});

describe('which book it thinks it is extracting', () => {
  const html = `<script>
      var TEXT_UNITS = [ ${unit('s1')} ];
      var BOOK = { title:"Some Other Book" };
    </script>`;

  it('uses the id it is given, not the one it was written for', () => {
    /* This is the defect that made the test: the id was the literal
       'magi', so The Raven extracted as { id:'magi', title:'The Raven' }.
       Two packs with one id share every per-book storage key, so a class
       reading one would overwrite its progress in the other. Nothing
       errored; the pack just quietly claimed to be a different book. */
    const book = extract(html, 'otherbook', 'somethingelse');
    expect(book.meta.id).toBe('somethingelse');
    expect(book.meta.title).toBe('Some Other Book');
  });

  it('refuses a folder name that is plainly not a book id', () => {
    const from = join(dir, 'generic.html');
    writeFileSync(from, html, 'utf8');
    let err = '';
    try {
      execFileSync('node', ['tools/extract-book.mjs', from, join(dir, 'book', 'book.json')], {
        encoding: 'utf8',
        stdio: 'pipe',
      });
    } catch (e) {
      err = String(e.stderr || e.message);
    }
    expect(err, 'a bad id has to stop the run, not ship').toMatch(/not a book id/);
  });

  it('will not invent a title for a reader that has none', () => {
    const from = join(dir, 'untitled.html');
    writeFileSync(from, `<script>var TEXT_UNITS = [ ${unit('s1')} ];</script>`, 'utf8');
    let err = '';
    try {
      execFileSync(
        'node',
        ['tools/extract-book.mjs', from, join(dir, 'untitled.json'), 'untitled'],
        {
          encoding: 'utf8',
          stdio: 'pipe',
        }
      );
    } catch (e) {
      err = String(e.stderr || e.message);
    }
    expect(err).toMatch(/no title/);
  });

  it('still refuses a file with no story in it', () => {
    /* the one part that is not optional */
    expect(() =>
      extract(`<script>var SWAPS = {}; var BOOK = { title:"Empty" };</script>`, 'empty')
    ).toThrow();
  });
});
