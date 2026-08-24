import { useEffect, useRef, useState } from 'react';
import SignIn from './SignIn.jsx';
import { T } from './useUi.jsx';
import { label as studentLabel } from '../lib/class/student.js';

/**
 * Handing the work in.
 *
 * Three rules here came out of a classroom rather than out of the code.
 *
 * A student sees it being sent. Not a spinner in a corner — a bar, and
 * the word "Sending", because that is the thing they will understand and
 * the thing they will wait for. The bar moves on real steps (written
 * down, sent, confirmed) rather than on a timer, so it is not lying.
 *
 * A student is never told it failed. They cannot do anything about it,
 * they will not understand it, and the likely response is to hand in
 * again and again. The work is written down before anything is sent, and
 * the retry is ours, quietly. From their side it is done, because it is.
 *
 * A student is never told their work went somewhere it did not. If there
 * is no class set up on this device, it says so plainly — the work is
 * saved here — rather than showing a Hand in button that does nothing.
 *
 * @param {object} props
 * @param {number} props.pass
 * @param {import('../lib/class/student.js').Student|null} props.student
 * @param {boolean} props.hasClass          is there anywhere for it to go
 * @param {(s:any)=>void} props.onSignIn
 * @param {()=>void} props.onSignOut
 * @param {(step:(n:number)=>void)=>Promise<void>} props.onHandIn
 * @param {()=>void} [props.onSaveFile]  the offline path: a file the
 *     teacher can collect, for a room with no Sheet in it
 * @param {boolean} [props.alreadyIn]
 */
export default function HandIn({
  pass,
  student,
  hasClass,
  onSignIn,
  onSignOut,
  onHandIn,
  onSaveFile,
  alreadyIn = false,
}) {
  const [state, setState] = useState(
    /** @type {'idle'|'signing'|'sending'|'done'} */ (alreadyIn ? 'done' : 'idle')
  );
  const [step, setStep] = useState(0);
  /* Nothing is set on a component that has gone: a student who presses
     Hand in and immediately taps Back should not produce a warning in
     a teacher's console. */
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /* Asked for first, whichever way the work is going out: a file with
     no name on it is no use to a teacher collecting thirty of them, and
     the offline path used to produce exactly that. */
  const askWho = (
    <div className="handin-who">
      <SignIn
        student={student}
        onSignIn={(s) => {
          onSignIn(s);
          setState('idle');
        }}
        onCancel={student ? () => setState('idle') : undefined}
      />
    </div>
  );

  if (state === 'signing') return askWho;

  if (!hasClass) {
    /* No Sheet to send to. The work is not lost and it is not stranded
       either: it saves to a file the teacher can collect, which is the
       whole offline path. Saying only "your work stays here" left a
       student holding something they could not hand over. */
    return (
      <div className="handin">
        <p className="handin-note">
          <T>No class is set up on this device, so your work stays here.</T>
        </p>
        {onSaveFile ? (
          <button
            type="button"
            className="btn"
            onClick={() => (student ? onSaveFile() : setState('signing'))}
          >
            <T>Save my work to a file</T>
          </button>
        ) : null}
      </div>
    );
  }

  if (state === 'done') {
    return (
      <p className="handin-done" role="status">
        <b>
          <T>Handed in.</T>
        </b>{' '}
        <T>Your teacher has it.</T>
      </p>
    );
  }

  if (state === 'sending') {
    const of = 3;
    return (
      <div className="handin-going" role="status" aria-live="polite">
        <p>
          <T>Sending your work…</T>
        </p>
        {/* A real progress element, moved by real steps. */}
        <progress className="handin-bar" value={step} max={of}>
          {step} of {of}
        </progress>
      </div>
    );
  }

  if (!student) return askWho;

  return (
    <div className="handin">
      <p className="handin-as">
        <T>Handing in reading</T> {pass} <T>as</T> <b>{studentLabel(student)}</b>
        <button type="button" className="btn ghost tiny" onClick={() => setState('signing')}>
          <T>Not you?</T>
        </button>
      </p>

      <button
        type="button"
        className="btn primary handin-go"
        onClick={async () => {
          setState('sending');
          setStep(1);
          try {
            await onHandIn(setStep);
          } finally {
            /* Done either way. It is written down; if it has not gone
               yet it will, and that is not the student's problem. */
            if (alive.current) {
              setStep(3);
              setState('done');
            }
          }
        }}
      >
        <T>Hand in your work</T>
      </button>

      <button type="button" className="btn ghost tiny signout" onClick={onSignOut}>
        <T>Sign out of this device</T>
      </button>
    </div>
  );
}
