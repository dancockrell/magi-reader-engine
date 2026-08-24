/**
 * A spreadsheet, written by hand.
 *
 * An .xlsx is a ZIP of XML, and the parts a gradebook needs are few
 * enough to write out directly: a workbook, a stylesheet and a sheet per
 * tab. Adding a library for this would be a megabyte to save two hundred
 * lines, in a build that has to fit itch's file limit.
 *
 * Everything here returns bytes rather than a Blob, so the whole thing
 * can be checked in Node — the zip can be unpacked and the XML parsed in
 * a test, which is the only way to know an Excel file is really an Excel
 * file without opening Excel.
 *
 * Two rules are load-bearing and easy to lose:
 *
 *   Entry names use forward slashes. A backslash silently broke an
 *   upload earlier in this project. The ZIP spec allows only '/', and
 *   readers that accept '\' are being generous, not correct.
 *
 *   Anything that is not a number goes in as an inline string, including
 *   text that starts with '='. A student's answer must never become a
 *   formula in a teacher's spreadsheet.
 */

/* ------------------------------------------------------------------
   ZIP, stored (no compression)
   ------------------------------------------------------------------ */

let CRC_TABLE = null;

/** @param {Uint8Array} bytes */
export function crc32(bytes) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const utf8 = (s) => new TextEncoder().encode(String(s));

/**
 * @param {{name:string, data:string}[]} files
 * @returns {Uint8Array}
 */
export function zip(files) {
  const w16 = (a, o, v) => {
    a[o] = v & 0xff;
    a[o + 1] = (v >>> 8) & 0xff;
  };
  const w32 = (a, o, v) => {
    a[o] = v & 0xff;
    a[o + 1] = (v >>> 8) & 0xff;
    a[o + 2] = (v >>> 16) & 0xff;
    a[o + 3] = (v >>> 24) & 0xff;
  };

  const parts = [];
  const central = [];
  let offset = 0;

  for (const f of files) {
    /* forward slashes, always — see the header */
    const name = utf8(f.name.replace(/\\/g, '/'));
    const data = utf8(f.data);
    const crc = crc32(data);

    const local = new Uint8Array(30 + name.length);
    w32(local, 0, 0x04034b50);
    w16(local, 4, 20);
    w16(local, 6, 0x0800); /* the name is UTF-8 */
    w16(local, 8, 0); /* stored, not deflated */
    w32(local, 14, crc);
    w32(local, 18, data.length);
    w32(local, 22, data.length);
    w16(local, 26, name.length);
    local.set(name, 30);

    const dir = new Uint8Array(46 + name.length);
    w32(dir, 0, 0x02014b50);
    w16(dir, 4, 20);
    w16(dir, 6, 20);
    w16(dir, 8, 0x0800);
    w32(dir, 16, crc);
    w32(dir, 20, data.length);
    w32(dir, 24, data.length);
    w16(dir, 28, name.length);
    w32(dir, 42, offset);
    dir.set(name, 46);

    parts.push(local, data);
    central.push(dir);
    offset += local.length + data.length;
  }

  const cdSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  w32(end, 0, 0x06054b50);
  w16(end, 8, central.length);
  w16(end, 10, central.length);
  w32(end, 12, cdSize);
  w32(end, 16, offset);

  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of all) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/* ------------------------------------------------------------------
   XML
   ------------------------------------------------------------------ */

/**
 * Control characters are illegal in XML 1.0, and a student can paste
 * one. Stripping them beats producing a workbook that will not open at
 * all.
 *
 * Built from an escaped string rather than written as a literal class:
 * every character in it is invisible, so a literal is a line nobody can
 * review, and one that does not survive being copied between files.
 */
/* The rule is warning about exactly what this is for: these are control
   characters, and removing them is the point. */
// eslint-disable-next-line no-control-regex
const ILLEGAL_IN_XML = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]', 'g');

/** @param {unknown} v */
export function xml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(ILLEGAL_IN_XML, '');
}

/** 1 → A, 27 → AA */
export function colName(n) {
  let s = '';
  let i = n;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = (i - 1 - m) / 26;
  }
  return s;
}

/**
 * One cell.
 * @param {string} ref  e.g. "B4"
 * @param {{v?:any, s?:number, n?:boolean, f?:string}} c
 */
export function cell(ref, c) {
  const s = c.s ? ` s="${c.s}"` : '';
  if (c.f) return `<c r="${ref}"${s}><f>${xml(c.f)}</f></c>`;
  if (c.v == null || c.v === '') return `<c r="${ref}"${s}/>`;
  if (c.n && Number.isFinite(Number(c.v))) return `<c r="${ref}"${s}><v>${Number(c.v)}</v></c>`;
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xml(c.v)}</t></is></c>`;
}

/* 1 header · 2 wrapped body · 3 centred · 4 SCORE INPUT
   5 plain text · 6 one decimal · 7 group band · 8 muted */
export const STYLES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0"/></numFmts>' +
  '<fonts count="5">' +
  '<font><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
  '<font><sz val="11"/><color rgb="FF3A3226"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FF2E2A22"/><name val="Calibri"/></font>' +
  '<font><i/><sz val="10"/><color rgb="FF7A7268"/><name val="Calibri"/></font>' +
  '</fonts>' +
  '<fills count="5">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF3E3A31"/><bgColor indexed="64"/></patternFill></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2C4"/><bgColor indexed="64"/></patternFill></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFEDE7DA"/><bgColor indexed="64"/></patternFill></fill>' +
  '</fills>' +
  '<borders count="3">' +
  '<border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border><left/><right/><top/><bottom style="thin"><color rgb="FFD7CFC0"/></bottom><diagonal/></border>' +
  '<border><left style="thin"><color rgb="FFBFAE8E"/></left><right style="thin"><color rgb="FFBFAE8E"/></right>' +
  '<top style="thin"><color rgb="FFBFAE8E"/></top><bottom style="thin"><color rgb="FFBFAE8E"/></bottom><diagonal/></border>' +
  '</borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="9">' +
  '<xf xfId="0" numFmtId="0" fontId="0" fillId="0" borderId="0"/>' +
  '<xf xfId="0" numFmtId="0" fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1" applyAlignment="1">' +
  '<alignment horizontal="left" vertical="center" wrapText="1"/></xf>' +
  '<xf xfId="0" numFmtId="49" fontId="2" fillId="0" borderId="1" applyFont="1" applyBorder="1" applyAlignment="1">' +
  '<alignment vertical="top" wrapText="1"/></xf>' +
  '<xf xfId="0" numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1">' +
  '<alignment horizontal="center" vertical="top"/></xf>' +
  '<xf xfId="0" numFmtId="0" fontId="3" fillId="3" borderId="2" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' +
  '<alignment horizontal="center" vertical="center"/></xf>' +
  '<xf xfId="0" numFmtId="49" fontId="0" fillId="0" borderId="1" applyBorder="1" applyAlignment="1">' +
  '<alignment vertical="top"/></xf>' +
  '<xf xfId="0" numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1">' +
  '<alignment horizontal="center" vertical="top"/></xf>' +
  '<xf xfId="0" numFmtId="0" fontId="3" fillId="4" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' +
  '<alignment vertical="center"/></xf>' +
  '<xf xfId="0" numFmtId="0" fontId="4" fillId="0" borderId="0" applyFont="1"/>' +
  '</cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  '<dxfs count="0"/><tableStyles count="0"/></styleSheet>';

/**
 * One worksheet.
 * @param {{h?:number, cells:({v?:any,s?:number,n?:boolean,f?:string}|null)[]}[]} rows
 * @param {{w:number}[]} [cols]
 * @param {{x:number,y:number}} [freeze]
 */
export function sheet(rows, cols = [], freeze = null) {
  const out = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
    '<sheetViews><sheetView workbookViewId="0" showGridLines="0">',
    freeze
      ? `<pane xSplit="${freeze.x}" ySplit="${freeze.y}" topLeftCell="${colName(freeze.x + 1)}${
          freeze.y + 1
        }" activePane="bottomRight" state="frozen"/>`
      : '',
    '</sheetView></sheetViews>',
    '<sheetFormatPr defaultRowHeight="15"/>',
  ];

  if (cols.length) {
    out.push('<cols>');
    cols.forEach((c, i) =>
      out.push(`<col min="${i + 1}" max="${i + 1}" width="${c.w}" customWidth="1"/>`)
    );
    out.push('</cols>');
  }

  out.push('<sheetData>');
  rows.forEach((r, ri) => {
    const n = ri + 1;
    out.push(`<row r="${n}"${r.h ? ` ht="${r.h}" customHeight="1"` : ''}>`);
    r.cells.forEach((c, ci) => {
      if (!c) return;
      /* '#' in a formula means "this row", so a column of formulas can
         be written once and numbered as it is laid down */
      out.push(cell(colName(ci + 1) + n, c.f ? { ...c, f: c.f.replace(/#/g, String(n)) } : c));
    });
    out.push('</row>');
  });
  out.push('</sheetData></worksheet>');
  return out.join('');
}

/**
 * A column width, measured from what is actually in it.
 *
 * Excel widths are roughly "characters at the default font". Measured
 * rather than guessed so that nothing is clipped and nothing is absurdly
 * wide — which is most of what makes a generated sheet feel hand-made.
 */
export function widthFor(rows, colIndex, min, max) {
  let w = min;
  for (const r of rows) {
    const c = r.cells[colIndex];
    if (!c || c.v == null) continue;
    const len = String(c.v).length;
    if (len + 2 > w) w = len + 2;
  }
  return Math.min(max, Math.max(min, Math.round(w * 10) / 10));
}

/**
 * The whole file.
 * @param {{name:string, xml:string}[]} sheets
 * @returns {Uint8Array}
 */
export function workbook(sheets) {
  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    sheets
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join('') +
    '</Types>';

  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';

  const wb =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    sheets
      .map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join('') +
    /* The formulas are written with no cached value, so the app is told
       to calculate the moment it opens the file. Without this the score
       column looks empty until somebody edits a cell. */
    '</sheets><calcPr calcId="0" fullCalcOnLoad="1"/></workbook>';

  const wbRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheets
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
      )
      .join('') +
    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    '</Relationships>';

  return zip([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: '_rels/.rels', data: rels },
    { name: 'xl/workbook.xml', data: wb },
    { name: 'xl/_rels/workbook.xml.rels', data: wbRels },
    { name: 'xl/styles.xml', data: STYLES },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: s.xml })),
  ]);
}

export const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
