import { useEffect, useId, useState } from 'react';
import { T } from './useUi.jsx';
import {
  mintOwner,
  classKey,
  readClassKey,
  joinCode,
  safeApi,
  loadOwner,
  saveOwner,
  loadApi,
  saveApi,
  OWNER_KEY,
  API_KEY,
} from '../lib/class/key.js';
import { loadOutbox, saveOutbox, waiting, flush } from '../lib/class/outbox.js';
import { senderFor } from '../lib/class/send.js';
import { KEY as STUDENT_KEY } from '../lib/class/student.js';
import SheetSetup from './SheetSetup.jsx';
import Gradebook from './Gradebook.jsx';

/**
 * The teacher's side.
 *
 * Everything here rests on one idea: the teacher is whoever set the
 * class up, because nobody else was there. So there is nothing to log
 * in to. Setting a class up mints a key on this device, and that key —
 * written down once — is what makes any other device the teacher's too.
 *
 * Two things are said out loud on this screen rather than left for
 * someone to discover:
 *
 *   the class key is the way back, and the reset button is not
 *   the link the class gets is not the key, and cannot be used as one
 */

/** Where the reader is being served from, minus any query or hash. */
function hereUrl() {
  try {
    const u = new URL(globalThis.location.href);
    u.hash = '';
    u.search = '';
    return u.toString().replace(/[?#]$/, '');
  } catch {
    return '';
  }
}

/** @param {{bookId:string, bookTitle:string}} props the book whose class this is */
export default function Class({ bookId, bookTitle }) {
  const id = useId();
  const [owner, setOwner] = useState(() => loadOwner());
  const [api, setApi] = useState(() => loadApi());
  const [outbox, setOutbox] = useState(() => loadOutbox(bookId));

  const [cls, setCls] = useState(() => loadOwner()?.cls || '');
  const [sheet, setSheet] = useState('');
  const [paste, setPaste] = useState('');
  const [said, setSaid] = useState('');
  const [confirmReset, setConfirmReset] = useState('');

  /* Said once and then gone, so a teacher is not reading last week's
     confirmation as if it were this one. */
  useEffect(() => {
    if (!said) return undefined;
    const t = setTimeout(() => setSaid(''), 6000);
    return () => clearTimeout(t);
  }, [said]);

  const key = owner ? classKey(owner, api) : '';
  const join = api ? joinCode(api, owner?.cls || cls) : '';
  const link = join ? `${hereUrl()}#/?join=${join}` : '';
  const queue = waiting(outbox);

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      setSaid(`${what} copied.`);
    } catch {
      /* A locked clipboard is not a failure worth a dialog — the text
         is on screen and selectable, which is what a teacher will do
         anyway. */
      setSaid(`Select the ${what.toLowerCase()} and copy it.`);
    }
  };

  /* ---------------------------------------------------------------- */

  if (!owner) {
    return (
      <main className="klass">
        <h1>
          <T>Class</T>
        </h1>
        <p className="klass-lead">
          Setting a class up on this device is what makes you its teacher. There is nothing to
          log in to and no password to lose.
        </p>

        <section className="card">
          <h2>Set up a class</h2>
          <label className="field" htmlFor={`${id}-cls`}>
            <span className="field-label">Class name</span>
            <input
              id={`${id}-cls`}
              value={cls}
              onChange={(e) => setCls(e.target.value)}
              placeholder="e.g. 1-A"
            />
          </label>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              const o = mintOwner(cls);
              saveOwner(o);
              setOwner(o);
              setSaid('Class set up. Write the class key down.');
            }}
          >
            Set up this class
          </button>
        </section>

        <section className="card">
          <h2>I already have a class key</h2>
          <p className="klass-note">
            From another device, or from the last time you taught this. Pasting it here makes
            this device yours.
          </p>
          <label className="field" htmlFor={`${id}-paste`}>
            <span className="field-label">Class key</span>
            <input
              id={`${id}-paste`}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder="RAVEN-…"
              spellCheck="false"
              autoCapitalize="off"
            />
          </label>
          <button
            type="button"
            className="btn"
            onClick={() => {
              const read = readClassKey(paste);
              if (!read) {
                setSaid('That does not look like a class key.');
                return;
              }
              const o = {
                id: read.id,
                cls: read.cls,
                at: new Date().toISOString().slice(0, 10),
              };
              saveOwner(o);
              setOwner(o);
              if (read.api) {
                saveApi(read.api);
                setApi(read.api);
              }
              setSaid('This device is yours now.');
            }}
          >
            Use this key
          </button>
        </section>

        {said ? (
          <p className="klass-said" role="status">
            {said}
          </p>
        ) : null}
      </main>
    );
  }

  return (
    <main className="klass">
      <h1>
        <T>Class</T>
        {owner.cls ? <span className="klass-which">{owner.cls}</span> : null}
      </h1>

      <section className="card">
        <h2>Your class key</h2>
        <p className="klass-note">
          Write this down once. It is the way back if this device dies, if you teach from
          another machine, or if someone covers your lesson. <b>The reset button is not.</b>
        </p>
        <output className="keybox">{key}</output>
        <div className="row">
          <button type="button" className="btn" onClick={() => copy(key, 'Class key')}>
            Copy the class key
          </button>
        </div>
      </section>

      <section className="card">
        <h2>Where the work goes</h2>
        {api ? (
          <>
            <p className="klass-note ok">
              Connected. Work handed in on this device goes to your Sheet.
            </p>
            <output className="keybox small">{api}</output>
          </>
        ) : (
          <p className="klass-note">
            Nothing is connected yet, so work handed in stays on the student&rsquo;s device.
            Paste the web app link from your Apps Script deployment.
          </p>
        )}
        <label className="field" htmlFor={`${id}-sheet`}>
          <span className="field-label">Apps Script web app link</span>
          <input
            id={`${id}-sheet`}
            value={sheet}
            onChange={(e) => setSheet(e.target.value)}
            placeholder="https://script.google.com/macros/s/…/exec"
            spellCheck="false"
            autoCapitalize="off"
            inputMode="url"
          />
        </label>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const u = sheet.trim();
            if (!safeApi(u)) {
              /* Named precisely, because the usual cause is pasting the
                 editor URL rather than the deployment URL, and "invalid
                 link" does not help anyone find that. */
              setSaid('That is not an Apps Script web app link. It ends in /exec.');
              return;
            }
            saveApi(u);
            setApi(u);
            setSheet('');
            setSaid('Connected.');
          }}
        >
          Connect
        </button>
      </section>

      <SheetSetup />

      <Gradebook bookId={bookId} bookTitle={bookTitle} />

      {link ? (
        <section className="card">
          <h2>The link for your class</h2>
          <p className="klass-note">
            This points a student&rsquo;s device at your Sheet. It is <b>not</b> your class key
            and cannot be used as one — a student who keeps it cannot open your gradebook.
          </p>
          <output className="keybox small">{link}</output>
          <div className="row">
            <button type="button" className="btn" onClick={() => copy(link, 'Class link')}>
              Copy the link
            </button>
          </div>
        </section>
      ) : null}

      <section className="card">
        <h2>Waiting to be sent</h2>
        {queue.count === 0 ? (
          <p className="klass-note ok">Nothing is waiting. Everything handed in has gone.</p>
        ) : (
          <>
            <p className="klass-note">
              <b>{queue.count}</b> {queue.count === 1 ? 'piece' : 'pieces'} of work handed in on
              this device {queue.count === 1 ? 'has' : 'have'} not reached the Sheet yet.
              {queue.stuck
                ? ` ${queue.stuck} of them has been tried several times — check the link above.`
                : ''}
            </p>
            <button
              type="button"
              className="btn"
              disabled={!api}
              onClick={async () => {
                const { items, sent } = await flush(outbox, senderFor(api));
                saveOutbox(bookId, items);
                setOutbox(items);
                setSaid(sent ? `${sent} sent.` : 'Still nothing getting through.');
              }}
            >
              Try again now
            </button>
          </>
        )}
      </section>

      <section className="card danger">
        <h2>Start over on this device</h2>
        <p className="klass-note">
          This removes the class key, the Sheet link and any work still waiting — on this device
          only. <b>Your way back is the class key, not this button.</b>
        </p>
        <label className="field" htmlFor={`${id}-del`}>
          <span className="field-label">Type DELETE to confirm</span>
          <input
            id={`${id}-del`}
            value={confirmReset}
            onChange={(e) => setConfirmReset(e.target.value)}
            autoCapitalize="characters"
            spellCheck="false"
          />
        </label>
        <button
          type="button"
          className="btn danger"
          disabled={confirmReset.trim().toUpperCase() !== 'DELETE'}
          onClick={() => {
            for (const k of [OWNER_KEY, API_KEY, STUDENT_KEY, `raven.outbox.v1.${bookId}`]) {
              try {
                localStorage.removeItem(k);
              } catch {
                /* nothing to do about a locked store, and nothing to say */
              }
            }
            setOwner(null);
            setApi('');
            setOutbox([]);
            setConfirmReset('');
            setSaid('Cleared. This device is not set up for a class any more.');
          }}
        >
          Delete everything on this device
        </button>
      </section>

      {said ? (
        <p className="klass-said" role="status">
          {said}
        </p>
      ) : null}
    </main>
  );
}
