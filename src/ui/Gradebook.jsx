import { useRef, useState } from 'react';
import { buildCsv } from '../lib/gradebook/csv.js';
import { markingWorkbook } from '../lib/gradebook/workbook.js';
import { MIME as XLSX_MIME } from '../lib/gradebook/xlsx.js';
import {
  loadCollected,
  saveCollected,
  clearCollected,
  collect,
  summarise,
  fileName,
} from '../lib/gradebook/collected.js';

/**
 * The work gathered on this device, and the workbook that marks it.
 *
 * For a room with no Google in it. Where a Sheet is connected the work
 * goes there and this stays empty — they are two answers to the same
 * question and a school will want one of them.
 *
 * The table is deliberately short on columns. Everything is in the
 * workbook; this is here so a teacher can see that the pile they dropped
 * in arrived, and whose is missing.
 */

function download(data, name, type) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  /* revoked on the next turn, not immediately: Safari has not started
     the download by the time click() returns */
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * @param {object} props
 * @param {string} props.bookId
 * @param {string} props.bookTitle
 */
export default function Gradebook({ bookId, bookTitle }) {
  const [rows, setRows] = useState(() => loadCollected(bookId));
  const [said, setSaid] = useState('');
  const [wipe, setWipe] = useState(false);
  const picker = useRef(/** @type {HTMLInputElement|null} */ (null));

  const take = async (fileList) => {
    const files = await Promise.all(
      [...fileList].map(async (f) => ({ name: f.name, text: await f.text() }))
    );
    const result = collect(rows, files);
    setRows(result.rows);
    saveCollected(bookId, result.rows);
    setSaid(summarise(result));
  };

  const marks = (r) =>
    typeof r.percentNum === 'number'
      ? `${r.percentNum}%`
      : r.scoreNum === ''
        ? '—'
        : r.scoreNum;

  return (
    <section className="card">
      <h2>Work collected on this device</h2>

      {rows.length === 0 ? (
        <p className="klass-note">
          Nothing yet. If your class hands in to files rather than to a Sheet, drop them here —
          the marking workbook is built from whatever is in this list.
        </p>
      ) : (
        <p className="klass-note">
          <b>{rows.length}</b> {rows.length === 1 ? 'piece' : 'pieces'} of work, from{' '}
          <b>{new Set(rows.map((r) => `${r.cls}|${r.name}`)).size}</b> students.
        </p>
      )}

      <div className="row">
        {/* The button below is the control; this is the machinery it
            drives. Out of the accessibility tree entirely rather than
            merely out of sight — an unlabelled file input announced to
            a screen reader is a second, worse way to do the same thing,
            and axe was right to say so. */}
        <input
          ref={picker}
          type="file"
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          multiple
          accept="application/json,.json"
          onChange={(e) => {
            take(e.target.files);
            /* cleared so the same file can be picked twice — a teacher
               who fixes a file and drops it again should not be met
               with silence */
            e.target.value = '';
          }}
        />
        <button type="button" className="btn" onClick={() => picker.current?.click()}>
          Add handed-in files
        </button>

        <button
          type="button"
          className="btn primary"
          disabled={!rows.length}
          onClick={() => {
            const bytes = markingWorkbook(rows);
            if (bytes) {
              download(bytes, fileName(bookTitle, rows, 'xlsx'), XLSX_MIME);
              setSaid('Workbook saved. Mark on the Answers sheet; the Grades sheet follows.');
            }
          }}
        >
          Marking workbook
        </button>

        <button
          type="button"
          className="btn"
          disabled={!rows.length}
          onClick={() => {
            download(
              buildCsv(rows),
              fileName(bookTitle, rows, 'csv'),
              'text/csv;charset=utf-8'
            );
            setSaid('CSV saved.');
          }}
        >
          CSV
        </button>
      </div>

      {rows.length > 0 ? (
        <>
          {/* The table scrolls inside itself once a class is thirty
              long, and a scrollable box has to be reachable from the
              keyboard or it cannot be read without a mouse. Caught on
              the phone profile, where the box is short enough to
              overflow with two rows in it. */}
          {/* eslint-disable jsx-a11y/no-noninteractive-tabindex */}
          <div
            className="sheetwrap"
            tabIndex={0}
            role="region"
            aria-label="Work collected on this device"
          >
            <table className="sheet">
              <caption className="sr-only">Work collected on this device</caption>
              <thead>
                <tr>
                  <th scope="col">Class</th>
                  <th scope="col">No.</th>
                  <th scope="col">Name</th>
                  <th scope="col">Assignment</th>
                  <th scope="col">Marks</th>
                  <th scope="col">Handed in</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.cls}|${r.no}|${r.name}|${r.assignment}`}>
                    <td>{r.cls}</td>
                    <td className="num">{r.no}</td>
                    <td>{r.name}</td>
                    <td>{r.assignment}</td>
                    <td className="num">{marks(r)}</td>
                    <td>{String(r.when || '').slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}

          {wipe ? (
            <div className="row">
              <button
                type="button"
                className="btn danger"
                onClick={() => {
                  clearCollected(bookId);
                  setRows([]);
                  setWipe(false);
                  setSaid('Cleared. Save the workbook first next time.');
                }}
              >
                Yes, remove all {rows.length}
              </button>
              <button type="button" className="btn ghost" onClick={() => setWipe(false)}>
                Keep it
              </button>
            </div>
          ) : (
            <button type="button" className="btn ghost tiny" onClick={() => setWipe(true)}>
              Remove the collected work
            </button>
          )}
        </>
      ) : null}

      {said ? (
        <p className="klass-note ok" role="status">
          {said}
        </p>
      ) : null}
    </section>
  );
}
