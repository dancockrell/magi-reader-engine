import { cell, idCell } from './cells.js';

export const GRADE_HEADER = [
  'Class',
  'Student number',
  'Name',
  'Assignment',
  'Score',
  'Out of',
  'Percent',
  'Retried',
  'Minutes',
  'Submitted',
  'Attempts',
  'Previous score',
  'Lower than previous',
];

export const WRITTEN_HEADER = [
  'Class',
  'Student number',
  'Name',
  'Segment',
  'Question',
  'Written answer',
];

/** Every written answer across the class, so a teacher can read the
 *  actual writing without opening a single JSON file. */
export function writtenRows(rows) {
  const out = [];
  for (const r of rows) {
    for (const it of r.payload?.items || []) {
      if (it.answer == null || String(it.answer).trim() === '') continue;
      out.push([r.cls, r.no, r.name, it.segment || '', it.question || '', String(it.answer)]);
    }
  }
  return out;
}

export function buildCsv(rows) {
  const lines = [GRADE_HEADER.map(cell).join(',')];

  for (const r of rows) {
    lines.push(
      [
        cell(r.cls),
        idCell(r.no),
        cell(r.name),
        cell(r.assignment),
        cell(r.scoreNum),
        cell(r.totalNum),
        cell(r.percentNum),
        cell(r.retried),
        cell(r.minutes),
        cell(r.when),
        cell(r.attempts || 1),
        cell(r.priorScore ?? ''),
        cell(r.lowerThanPrior ? 'YES' : ''),
      ].join(',')
    );
  }

  const written = writtenRows(rows);
  if (written.length) {
    lines.push('');
    lines.push(WRITTEN_HEADER.map(cell).join(','));
    for (const w of written) {
      lines.push(
        [cell(w[0]), idCell(w[1]), cell(w[2]), cell(w[3]), cell(w[4]), cell(w[5])].join(',')
      );
    }
  }

  /* BOM so Excel opens UTF-8 without mangling names */
  return '﻿' + lines.join('\r\n');
}
