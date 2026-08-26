import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { normaliseStudent, problemsWith, canSignIn } from '../lib/class/student.js';
import { lookupStudent, hasMatch } from '../lib/class/roster.js';
import { loadApi } from '../lib/class/key.js';
import { T } from './useUi.jsx';

/**
 * Who is at this device.
 *
 * Four fields and nothing else. It is asked once, and only when there is
 * somewhere for the work to go — a student reading on their own at home
 * should never be made to type their class number to see a story.
 *
 * Every problem is reported against the field it belongs to rather than
 * as one message at the top: "please check your details" makes a
 * thirteen-year-old guess which of four boxes is wrong.
 *
 * WHERE THE CLASS LIST COMES IN. If the teacher keeps one, the number
 * they typed is looked up and the name on the list is offered back for
 * them to accept or refuse. A class of thirty produces three students
 * called Kevin, one who types "aaaa", one who taps a friend's name for
 * a laugh, and one who joins twenty minutes late; the number solves most
 * of that and the confirmation solves the rest.
 *
 * And it is a convenience, never a gate. Unconfigured, offline, slow,
 * unreadable, or simply not on the list — every one of those signs them
 * in with what they typed, silently, because none of it is a thing a
 * student can do anything about and all of it ends with work that has
 * to reach a teacher. Nothing here can stop anybody handing work in.
 *
 * @param {object} props
 * @param {import('../lib/class/student.js').Student|null} [props.student]
 * @param {(s: import('../lib/class/student.js').Student) => void} props.onSignIn
 * @param {() => void} [props.onCancel]
 * @param {string} [props.api]  where the class list lives; read from the
 *     class set up on this device when not given
 * @param {typeof lookupStudent} [props.lookup]  testing seam
 */
export default function SignIn({
  student = null,
  onSignIn,
  onCancel,
  api,
  lookup = lookupStudent,
}) {
  const id = useId();
  const [form, setForm] = useState(() => student || { cls: '', no: '', name: '', nick: '' });
  /* Nothing is marked wrong before it has been filled in once. An empty
     form covered in red is the app telling a student off for arriving. */
  const [touched, setTouched] = useState(/** @type {Record<string,boolean>} */ ({}));
  const [tried, setTried] = useState(false);

  /* 'asking' is the form; 'checking' is the class list being asked;
     'confirm' is a name being offered back. The prototype called these
     number, list and manual — the same three moments. */
  const [phase, setPhase] = useState(/** @type {'asking'|'checking'|'confirm'} */ ('asking'));
  const [candidate, setCandidate] = useState(
    /** @type {import('../lib/class/roster.js').RosterMatch|null} */ (null)
  );

  const endpoint = useMemo(() => (api !== undefined ? api : loadApi()), [api]);

  /* Nothing is set on a component that has gone: a student who presses
     the button and immediately taps Back should not produce a warning
     in a teacher's console. */
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /* Asked once per number. A student who said "no, that is not me" is
     not asked the same question again on the next press, and neither is
     one whose lookup found nothing — the second press signs them in. */
  const asked = useRef(/** @type {Set<string>} */ (new Set()));

  const confirmRef = useRef(/** @type {HTMLButtonElement|null} */ (null));
  useEffect(() => {
    /* A real focus change, so a screen reader says what just happened
       rather than leaving it on a form that has visibly changed. The
       button's own label carries the name being offered. */
    if (phase === 'confirm') confirmRef.current?.focus();
  }, [phase]);

  const problems = problemsWith(form);
  const show = (k) => (touched[k] || tried) && problems[k];

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const fields = [
    ['cls', 'Class', 'e.g. 1-A', 'organization'],
    ['no', 'Number', 'e.g. 07', 'off'],
    ['name', 'Your name', '', 'name'],
    ['nick', 'What you like to be called', 'optional', 'nickname'],
  ];

  async function submit(e) {
    e.preventDefault();
    if (phase === 'checking') return;
    setTried(true);
    if (!canSignIn(form)) return;

    const typed = normaliseStudent(form);
    const key = `${typed.cls}|${typed.no}`;
    if (!endpoint || asked.current.has(key)) {
      onSignIn(typed);
      return;
    }

    setPhase('checking');
    /* The lookup answers rather than throwing, and the catch is here
       anyway: a thrown error would leave the button saying "Checking
       the class list" for the rest of the lesson, which is the one
       failure that would actually stop somebody handing work in. */
    const answer = await lookup(endpoint, typed).catch(() => null);
    if (!alive.current) return;
    asked.current.add(key);

    /* Only worth interrupting them for a name that is not the one they
       just typed. Agreeing with the register is not news. */
    const match = hasMatch(answer) ? answer.match : null;
    if (match && match.name.toLowerCase() !== typed.name.toLowerCase()) {
      setCandidate(match);
      setPhase('confirm');
      return;
    }
    setPhase('asking');
    onSignIn(typed);
  }

  if (phase === 'confirm' && candidate) {
    return (
      <section className="signin signin-confirm" aria-labelledby={`${id}-conf`}>
        <h2 className="signin-confirm-q" id={`${id}-conf`}>
          <T>Is this you?</T>
        </h2>
        <p className="signin-confirm-who" id={`${id}-conf-who`}>
          <b className="signin-confirm-name">{candidate.name}</b>
          {candidate.nick && candidate.nick !== candidate.name ? (
            <span className="signin-confirm-nick">{candidate.nick}</span>
          ) : null}
          <span className="signin-confirm-from">
            <T>Number</T> {candidate.no} <T>on your teacher’s class list</T>
          </span>
        </p>
        <div className="signin-do">
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              /* Refusing goes back to the form, not out of the door.
                 Somebody has to be able to be the new student whose
                 number was somebody else's last term. */
              setCandidate(null);
              setPhase('asking');
            }}
          >
            <T>No, use what I typed</T>
          </button>
          <button
            type="button"
            className="btn primary"
            ref={confirmRef}
            aria-describedby={`${id}-conf-who`}
            onClick={() =>
              onSignIn(
                normaliseStudent({
                  ...form,
                  no: candidate.no,
                  name: candidate.name,
                  nick: candidate.nick,
                })
              )
            }
          >
            <T>Yes, that’s me</T>
          </button>
        </div>
      </section>
    );
  }

  const checking = phase === 'checking';

  return (
    <form className="signin" noValidate onSubmit={submit}>
      <p className="signin-why">
        <T>Your teacher needs to know whose work this is.</T>
      </p>

      {fields.map(([key, labelText, hint, auto]) => (
        <label key={key} className="field" htmlFor={`${id}-${key}`}>
          <span className="field-label">
            <T>{labelText}</T>
          </span>
          <input
            id={`${id}-${key}`}
            name={key}
            value={form[key]}
            onChange={set(key)}
            onBlur={blur(key)}
            autoComplete={auto}
            /* the number is digits but not a number input: a spinner on
               a student number is nonsense, and "07" must survive */
            inputMode={key === 'no' ? 'numeric' : 'text'}
            enterKeyHint={key === 'nick' ? 'done' : 'next'}
            aria-invalid={show(key) ? 'true' : undefined}
            aria-describedby={show(key) ? `${id}-${key}-why` : undefined}
          />
          {hint && !show(key) ? <span className="field-hint">{hint}</span> : null}
          {show(key) ? (
            <span className="field-why" id={`${id}-${key}-why`} role="alert">
              {problems[key]}
            </span>
          ) : null}
        </label>
      ))}

      <div className="signin-do">
        {onCancel ? (
          <button type="button" className="btn ghost" onClick={onCancel} disabled={checking}>
            <T>Not now</T>
          </button>
        ) : null}
        {/* aria-disabled rather than disabled: a disabled button loses
            focus the moment it is pressed, and the student is then
            nowhere while the class list is being asked. */}
        <button type="submit" className="btn primary" aria-disabled={checking || undefined}>
          {checking ? <T>Checking the class list…</T> : <T>That’s me</T>}
        </button>
      </div>

      {/* Only ever says it is looking. It never reports that the lookup
          failed: that is not a thing a student can act on, and they are
          signed in either way. */}
      <p className="signin-checking" role="status">
        {checking ? <T>Looking for your name…</T> : ''}
      </p>
    </form>
  );
}
