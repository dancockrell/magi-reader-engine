import { useId, useState } from 'react';
import { normaliseStudent, problemsWith, canSignIn } from '../lib/class/student.js';
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
 * @param {object} props
 * @param {import('../lib/class/student.js').Student|null} [props.student]
 * @param {(s: import('../lib/class/student.js').Student) => void} props.onSignIn
 * @param {() => void} [props.onCancel]
 */
export default function SignIn({ student = null, onSignIn, onCancel }) {
  const id = useId();
  const [form, setForm] = useState(() => student || { cls: '', no: '', name: '', nick: '' });
  /* Nothing is marked wrong before it has been filled in once. An empty
     form covered in red is the app telling a student off for arriving. */
  const [touched, setTouched] = useState(/** @type {Record<string,boolean>} */ ({}));
  const [tried, setTried] = useState(false);

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

  return (
    <form
      className="signin"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (canSignIn(form)) onSignIn(normaliseStudent(form));
      }}
    >
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
          <button type="button" className="btn ghost" onClick={onCancel}>
            <T>Not now</T>
          </button>
        ) : null}
        <button type="submit" className="btn primary">
          <T>That’s me</T>
        </button>
      </div>
    </form>
  );
}
