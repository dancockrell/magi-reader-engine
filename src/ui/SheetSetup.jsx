import { useState } from 'react';
import backend from '../backend/backend.gs?raw';

/**
 * How a teacher gets a Sheet to point the reader at.
 *
 * Until this existed, the Class panel asked for an Apps Script
 * deployment link and gave no way to make one — the script lived only
 * inside the prototype's HTML, as a block to be copied by hand out of
 * view-source. A panel that asks for something it does not tell you how
 * to produce is not a feature.
 *
 * Six steps and a copy button. The steps are numbered because this is
 * genuinely a sequence and the order matters — deploying before saving
 * gives you a link to nothing.
 *
 * The "unverified app" warning gets a paragraph of its own, because it
 * is the point where a teacher stops. It is Google saying "a human
 * wrote this and we have not reviewed it", about a script that teacher
 * has just pasted into their own Sheet, and it is expected.
 */

const STEPS = [
  ['In your Google Sheet, open', 'Extensions → Apps Script'],
  ['Delete whatever is in the editor, paste the code below, and press', 'Save'],
  ['Then', 'Deploy → New deployment → Web app'],
  ['Set', 'Execute as: Me'],
  ['Set', 'Who has access: Anyone'],
  ['Copy the link it gives you — it ends in /exec — and paste it above', ''],
];

export default function SheetSetup() {
  const [open, setOpen] = useState(false);
  const [said, setSaid] = useState('');

  return (
    <section className="card setup">
      <h2>Making a Sheet to send it to</h2>
      <p className="klass-note">
        Any Google Sheet you own. This adds a short script to it that receives the work and
        keeps the marks up to date. Nothing is stored on a student&rsquo;s tablet.
      </p>

      <button
        type="button"
        className="btn"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Hide the steps' : 'Show me how'}
      </button>

      {open ? (
        <>
          <ol className="steps">
            {/* Keyed on the whole step, not on the words it opens with:
                two of them begin "Set", which React reported as two
                children with the same key. */}
            {STEPS.map(([before, what]) => (
              <li key={`${before}|${what}`}>
                {before} {what ? <b>{what}</b> : null}
              </li>
            ))}
          </ol>

          <p className="klass-note">
            Google will call it an <b>unverified app</b>. That is expected: it is saying a
            person wrote this and Google has not reviewed it, about a script you have just
            pasted into your own Sheet. Choose <b>Advanced</b>, then <b>Go to (project name)</b>
            .
          </p>

          <p className="klass-note">
            You sign in once, here, and no student ever does. <b>Execute as: Me</b> means the
            script runs with your account&rsquo;s permission on your Sheet — which is also the
            real proof of who the teacher is, better than any passcode this app could invent. No
            route in it ever hands a student&rsquo;s work back, so the link is a way in, not a
            way to read the class.
          </p>

          <div className="row">
            <button
              type="button"
              className="btn primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(backend);
                  setSaid('Code copied. Paste it into Apps Script.');
                } catch {
                  setSaid('Select all of the code below and copy it.');
                }
              }}
            >
              Copy the code
            </button>
            <span className="klass-note">{Math.round(backend.length / 1024)} KB</span>
          </div>

          {said ? (
            <p className="klass-note ok" role="status">
              {said}
            </p>
          ) : null}

          {/* A scrollable box has to be reachable from the keyboard, or
              somebody who cannot use a mouse cannot read the script
              they are being asked to trust — WCAG 2.1.1, and the reason
              browsers are adding this automatically. `region` plus a
              label is the accessible form of it; the rule below does not
              know that case and would have this be unreachable. */}
          {/* eslint-disable jsx-a11y/no-noninteractive-tabindex */}
          <pre
            className="backend"
            tabIndex={0}
            role="region"
            aria-label="The script to paste into Apps Script"
          >
            <code>{backend}</code>
          </pre>
          {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
        </>
      ) : null}
    </section>
  );
}
