import { sheet, widthFor, workbook, colName } from './xlsx.js';

/**
 * The marking workbook.
 *
 * Thirty students × three readings is a lot of writing to read, and the
 * shape of the file is most of what makes that bearable. Two sheets:
 *
 *   Answers  every written answer, GROUPED BY QUESTION rather than by
 *            student. A teacher marking thirty answers to the same
 *            question has one standard in their head; jumping between
 *            questions means rebuilding it thirty times. Each row is as
 *            tall as its answer needs, so nothing is hidden behind a
 *            truncated cell, and there is a yellow box to type a mark in.
 *
 *   Grades   one row per student, and the marks typed on the Answers
 *            sheet arrive here on their own through SUMIFS. The teacher
 *            never edits this sheet. It says so at the top of the other
 *            one.
 *
 * The matching is on class + name, because those are the two fields a
 * teacher can see on both sheets and correct by hand if a student typed
 * something odd.
 */

/* the styles in xlsx.js, named */
const HEAD = 1;
const WRAP = 2;
const MID = 3;
const INPUT = 4;
const BODY = 5;
const DEC = 6;
const BAND = 7;
const MUTED = 8;

/**
 * One cell, in the shape `sheet()` wants.
 *
 * Written out so that a column of text and a column of formulas are the
 * same type — otherwise the first cell in a row decides what the rest
 * are allowed to be.
 *
 * @typedef {{v?:any, s?:number, n?:boolean, f?:string}} Cell
 * @typedef {{h?:number, cells:(Cell|null)[]}} Row
 */

/** text @type {(v:any, s?:number) => Cell} */
const T = (v, s = 0) => ({ v, s });
/** a number @type {(v:any, s?:number) => Cell} */
const N = (v, s = 0) => ({ v, s, n: true });
/** a formula; '#' means "this row" @type {(f:string, s?:number) => Cell} */
const F = (f, s = 0) => ({ f, s });

/** What one written answer is worth, until a teacher says otherwise. */
export const WRITTEN_MAX = 5;

/** Every written answer in the collected rows, flattened. */
export function answersOf(rows) {
  const out = [];
  for (const r of rows) {
    for (const item of r.payload?.items || []) {
      if (item.answer == null || String(item.answer).trim() === '') continue;
      out.push({
        cls: r.cls,
        no: r.no,
        name: r.name,
        q: item.question || '(untitled question)',
        seg: item.segment || '',
        a: String(item.answer),
      });
    }
  }
  /* by question first: one standard in the head, applied thirty times */
  out.sort(
    (a, b) =>
      String(a.q).localeCompare(String(b.q)) ||
      `${a.cls}|${a.name}`.localeCompare(`${b.cls}|${b.name}`)
  );
  return out;
}

/**
 * How tall a row has to be for its answer to be readable.
 *
 * Measured against the real column width rather than guessed: a
 * two-word answer gets one line, a paragraph gets the room it needs.
 */
export function heightFor(text, width = 62) {
  const s = String(text || '');
  const wrapped = Math.ceil(s.length / width);
  const breaks = s.split('\n').length - 1;
  const lines = Math.max(1, wrapped + breaks);
  return Math.min(220, Math.max(18, lines * 15 + 4));
}

function answersSheet(answers, writtenMax) {
  /** @type {Row[]} */
  const rows = [
    {
      cells: [
        T(
          'Type a mark in the yellow Score column. The Grades sheet adds it up on its own — you never edit that sheet.',
          MUTED
        ),
      ],
    },
    {
      h: 26,
      cells: ['Class', 'No.', 'Name', 'Question', 'Answer', 'Score', 'Out of', 'Part'].map(
        (h) => T(h, HEAD)
      ),
    },
  ];

  let lastQ = null;
  for (const a of answers) {
    if (a.q !== lastQ) {
      lastQ = a.q;
      const many = answers.filter((z) => z.q === a.q).length;
      rows.push({
        h: 22,
        cells: [
          T(`${a.q}   (${many}${many === 1 ? ' answer)' : ' answers)'}`, BAND),
          ...Array(7).fill(T('', BAND)),
        ],
      });
    }
    rows.push({
      h: heightFor(a.a),
      cells: [
        T(a.cls, BODY),
        T(a.no, BODY),
        T(a.name, BODY),
        T(a.q, WRAP),
        T(a.a, WRAP),
        T('', INPUT),
        N(writtenMax, MID),
        T(a.seg, BODY),
      ],
    });
  }

  const cols = [
    { w: widthFor(rows, 0, 8, 14) },
    { w: widthFor(rows, 1, 7, 10) },
    { w: widthFor(rows, 2, 14, 26) },
    { w: 34 },
    { w: 62 },
    { w: 9 },
    { w: 8 },
    { w: widthFor(rows, 7, 7, 12) },
  ];
  /* the two header rows stay put while a hundred answers scroll */
  return sheet(rows, cols, { x: 0, y: 2 });
}

const GRADE_HEADERS = [
  'Class',
  'Student number',
  'Name',
  'Assignment',
  'Auto score',
  'Auto out of',
  'Auto %',
  'Written score',
  'Written out of',
  'Total',
  'Total out of',
  'Final %',
  'Retried',
  'Minutes',
  'Submitted',
  'Attempts',
  'Previous score',
  'Lower than previous',
];

function gradesSheet(rows, hasWritten) {
  /** @type {Row[]} */
  const out = [{ h: 30, cells: GRADE_HEADERS.map((h) => T(h, HEAD)) }];

  /* Matched on class + name: the two fields a teacher can see on both
     sheets and fix by hand if a student typed something odd. */
  const match = 'Answers!$A:$A,$A#,Answers!$C:$C,$C#';

  for (const r of rows) {
    const num = (v) => (typeof v === 'number' ? v : '');
    out.push({
      cells: [
        T(r.cls, BODY),
        T(r.no, BODY),
        T(r.name, BODY),
        T(r.assignment, BODY),
        N(num(r.scoreNum), MID),
        N(num(r.totalNum), MID),
        N(num(r.percentNum), DEC),
        hasWritten ? F(`SUMIFS(Answers!$F:$F,${match})`, MID) : N(0, MID),
        hasWritten ? F(`SUMIFS(Answers!$G:$G,${match})`, MID) : N(0, MID),
        F('E#+H#', MID),
        F('F#+I#', MID),
        F('IF(K#=0,"",ROUND(J#/K#*100,1))', DEC),
        T(r.retried === '' ? '' : String(r.retried), MID),
        N(r.minutes, MID),
        T(r.when, BODY),
        N(r.attempts || 1, MID),
        T(r.priorScore === '' || r.priorScore == null ? '' : String(r.priorScore), MID),
        T(r.lowerThanPrior ? 'YES' : '', MID),
      ],
    });
  }

  const cols = [
    { w: widthFor(out, 0, 8, 14) },
    { w: widthFor(out, 1, 10, 16) },
    { w: widthFor(out, 2, 16, 28) },
    { w: widthFor(out, 3, 12, 20) },
    { w: 11 },
    { w: 11 },
    { w: 9 },
    { w: 13 },
    { w: 13 },
    { w: 9 },
    { w: 12 },
    { w: 9 },
    { w: 9 },
    { w: 9 },
    { w: 18 },
    { w: 10 },
    { w: 14 },
    { w: 18 },
  ];
  return sheet(out, cols, { x: 3, y: 1 });
}

/**
 * Build the file.
 *
 * @param {any[]} rows        parsed submissions, from parseSubmission
 * @param {{writtenMax?:number}} [opts]
 * @returns {Uint8Array|null} null when there is nothing to mark
 */
export function markingWorkbook(rows, { writtenMax = WRITTEN_MAX } = {}) {
  if (!rows?.length) return null;

  const sorted = [...rows].sort((a, b) =>
    `${a.cls}|${a.no}|${a.name}`.localeCompare(`${b.cls}|${b.no}|${b.name}`)
  );
  const answers = answersOf(sorted);

  /* Grades first, because it is the sheet that opens. */
  return workbook([
    { name: 'Grades', xml: gradesSheet(sorted, answers.length > 0) },
    { name: 'Answers', xml: answersSheet(answers, writtenMax) },
  ]);
}

/** Which column a header sits in, for anyone reading the formulas. */
export const gradeColumn = (header) => colName(GRADE_HEADERS.indexOf(header) + 1);

export { GRADE_HEADERS };
