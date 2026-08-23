import { describe, it, expect } from 'vitest';
import { cell, idCell } from './cells.js';
import { parseSubmission, mergeAttempt, autoColumns } from './submission.js';
import { buildCsv } from './csv.js';

/**
 * These are characterization tests taken from the single-file reader.
 * Each one is a defect that was found by attacking the original, and
 * together they are the contract the rebuild has to satisfy before it
 * is allowed to claim it is better.
 */

const quiz = (over = {}) => ({
  assignment: 'magi — Reading 2 Quiz',
  pass: 2,
  className: '1-A',
  studentNo: '01',
  realName: 'Ana Lopez',
  score: 9,
  totalItems: 10,
  percent: 90,
  submittedAt: '2026-03-02T09:12',
  minutesSpent: 32,
  items: Array.from({ length: 10 }, (_, i) => ({
    kind: 'mc',
    isCorrect: i < 9,
    question: `Q${i + 1}`,
    segment: `s${i + 1}`,
  })),
  ...over,
});

const written = (over = {}) => ({
  assignment: 'magi — Reading 3 Written',
  pass: 3,
  className: '1-A',
  studentNo: '02',
  realName: 'Ben Ochoa',
  score: null,
  totalItems: 4,
  percent: null,
  submittedAt: '2026-03-02T10:00',
  minutesSpent: 40,
  items: Array.from({ length: 4 }, (_, i) => ({
    kind: 'written',
    question: `W${i + 1}`,
    segment: `s${i + 1}`,
    answer: `An answer ${i}`,
  })),
  ...over,
});

/**
 * Decode one encoded cell back to the text a spreadsheet would hold.
 *
 * Asserting on the raw encoded string is the trap: a payload containing
 * a quote gets the apostrophe guard AND then CSV quoting, so the cell
 * begins with `"` and a naive startsWith("'") check fails on exactly the
 * nastiest inputs while passing on the harmless ones. Decode first, then
 * assert on what Excel will actually put in the cell.
 */
function decode(encoded) {
  if (!encoded.startsWith('"')) return encoded;
  return encoded.slice(1, -1).replace(/""/g, '"');
}

describe('formula injection', () => {
  it.each(['=HYPERLINK("http://evil","free A")', '+1+1', '-2+3', '@SUM(A1)', '\tx', '\rx'])(
    'neutralises %j',
    (payload) => {
      const inCell = decode(cell(payload));
      expect(inCell.startsWith("'")).toBe(true);
      expect(inCell.slice(1)).toBe(payload);
    }
  );

  it('does not mangle ordinary writing', () => {
    expect(cell('She sells her hair.')).toBe('She sells her hair.');
  });

  it('quotes commas and doubles embedded quotes', () => {
    expect(cell('They sold something, "the best thing".')).toBe(
      '"They sold something, ""the best thing""."'
    );
  });

  it('survives a formula smuggled into a written answer, end to end', () => {
    const rows = [
      parseSubmission(
        written({
          items: [
            {
              kind: 'written',
              question: 'Theme?',
              segment: 's12',
              answer: '=HYPERLINK("http://evil","click")',
            },
          ],
        })
      ),
    ];
    const csv = buildCsv(rows);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).not.toMatch(/(^|,)=HYPERLINK/m);
  });
});

describe('student numbers are identifiers, not numbers', () => {
  it('keeps leading zeros as text', () => {
    expect(idCell('01')).toBe("'01");
    expect(idCell('007')).toBe("'007");
  });
  it('leaves unpadded numbers alone', () => {
    expect(idCell('20413')).toBe('20413');
  });
  it('keeps them through the CSV', () => {
    const csv = buildCsv([parseSubmission(quiz())]);
    expect(csv).toContain("'01");
  });
});

describe('Excel date coercion', () => {
  it('never emits a "9 / 10" score cell', () => {
    const csv = buildCsv([parseSubmission(quiz())]);
    expect(csv).not.toMatch(/\d+\s*\/\s*\d+/);
  });
  it('emits score and out-of as separate numbers', () => {
    const r = parseSubmission(quiz());
    expect(r.scoreNum).toBe(9);
    expect(r.totalNum).toBe(10);
    expect(r.percentNum).toBe(90);
  });
});

describe('written work does not carry an automatic out-of', () => {
  /* The original recorded totalItems for Reading 3 even though score was
     null, so the written questions were counted once as unearnable
     automatic marks and again as written marks: full marks came out at
     8/12 = 67%. */
  it('leaves every automatic column empty when there is no automatic score', () => {
    expect(autoColumns(written())).toEqual({ score: '', outOf: '', percent: '' });
  });

  it('gives perfect written work 100%, not 67%', () => {
    const r = parseSubmission(written());
    const writtenEarned = 8;
    const writtenPossible = 8;
    const total = (r.scoreNum || 0) + writtenEarned;
    const outOf = (r.totalNum || 0) + writtenPossible;
    expect(Math.round((total / outOf) * 100)).toBe(100);
  });

  it('does not disturb a quiz', () => {
    expect(autoColumns(quiz())).toEqual({ score: 9, outOf: 10, percent: 90 });
  });
});

describe('resubmission is visible', () => {
  it('counts attempts and remembers what was displaced', () => {
    let rows = [];
    rows = mergeAttempt(rows, parseSubmission(quiz({ score: 5, percent: 50 })));
    rows = mergeAttempt(rows, parseSubmission(quiz({ score: 8, percent: 80 })));
    expect(rows).toHaveLength(1);
    expect(rows[0].attempts).toBe(2);
    expect(rows[0].priorScore).toBe(5);
    expect(rows[0].lowerThanPrior).toBe(false);
  });

  it('flags the case a teacher must actually look at', () => {
    let rows = [];
    rows = mergeAttempt(rows, parseSubmission(quiz({ score: 9, percent: 90 })));
    rows = mergeAttempt(rows, parseSubmission(quiz({ score: 3, percent: 30 })));
    expect(rows[0].lowerThanPrior).toBe(true);
  });

  it('keeps different assignments apart', () => {
    let rows = [];
    rows = mergeAttempt(rows, parseSubmission(quiz()));
    rows = mergeAttempt(
      rows,
      parseSubmission(written({ studentNo: '01', realName: 'Ana Lopez' }))
    );
    expect(rows).toHaveLength(2);
  });
});

describe('malformed input', () => {
  it.each([null, undefined, '', 'not json', '{}', '{"assignment":"x"}'])(
    'returns null rather than throwing for %j',
    (bad) => {
      expect(parseSubmission(bad)).toBeNull();
    }
  );
});

describe('the written block', () => {
  it('carries the actual writing under the grades', () => {
    const csv = buildCsv([parseSubmission(written())]);
    const [gradeBlock, writtenBlock] = csv.split('\r\n\r\n');
    expect(gradeBlock).toContain('Ben Ochoa');
    expect(writtenBlock).toContain('Written answer');
    expect(writtenBlock).toContain('An answer 0');
  });

  it('omits the block entirely when nothing was written', () => {
    const csv = buildCsv([parseSubmission(quiz())]);
    expect(csv).not.toContain('Written answer');
  });
});
