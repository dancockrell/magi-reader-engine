/**
 * Cell encoding for anything a spreadsheet will open.
 *
 * Extracted from the single-file reader, which is the specification
 * this has to match before it is allowed to be better than it. Each
 * rule below exists because a real defect was found in the original;
 * the tests name them.
 */

/** A value beginning with = + - @ tab or CR is a FORMULA to Excel,
 *  Sheets and Numbers, evaluated on open. Every value here was typed
 *  by a student, so the teacher is the one who gets attacked. */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

/** Quote only when needed, double any embedded quote. */
const NEEDS_QUOTES = /[",\n\r]/;

export function cell(value) {
  let v = value == null ? '' : String(value);
  if (FORMULA_LEAD.test(v)) v = `'${v}`;
  return NEEDS_QUOTES.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * An identifier is not a number.
 *
 * Student numbers are commonly written 01, 02, 007. A spreadsheet reads
 * those as integers and throws the leading zeros away, so 01 and 1
 * become the same student and the roll stops matching the school's own
 * list. Anything shaped like a padded id is forced to text.
 */
export function idCell(value) {
  const v = value == null ? '' : String(value);
  if (/^0\d+$/.test(v)) return `'${v}`;
  return cell(v);
}

/** Numeric or empty — never a display string like "9 / 10", which Excel
 *  silently reads as a date and writes 1-Jan into the gradebook. */
export function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : '';
}
