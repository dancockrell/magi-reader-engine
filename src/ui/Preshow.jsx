import { useEffect, useState } from 'react';
import Overlay from './Overlay.jsx';
import Speaker from './Speaker.jsx';
import { speaker } from '../lib/speech/script.js';
import {
  createSpeech,
  speak,
  speaking,
  next,
  back,
  close,
  isLast,
  progressOf,
  wasHeard,
} from '../lib/speech/queue.js';
import { loadHeard, saveHeard } from '../lib/speech/heard.js';

/**
 * Wren, at the door.
 *
 * She introduces the book once. Not once per visit, not once per render,
 * and not again after somebody has closed her — the shipping reader
 * managed all three, because the greeting was fired from wherever the app
 * happened to reach and the close button set a flag that the next caller
 * did not check.
 *
 * Here the queue owns it. Closing is remembered by key and the key is
 * written down, so "stays dismissed" survives the tab being shut, which
 * is the only version of that promise a student would recognise.
 */

/**
 * @param {object} props
 * @param {import('../lib/types.js').Book} props.book
 * @param {string} props.talkKey     which run this is, e.g. "preshow"
 * @param {import('../lib/speech/script.js').Turn[]} props.turns
 * @param {string} [props.title]
 */
export default function Preshow({ book, talkKey, turns, title = 'Before we start' }) {
  const bookId = book.meta?.id || 'book';
  const [s, setS] = useState(() => createSpeech(loadHeard(bookId)));
  const [playing, setPlaying] = useState(false);

  /* Claimed on arrival. `speak` is a no-op when this has been heard
     before or is already open, so this cannot restart her mid-sentence
     on a re-render — which is what made her repeat herself. */
  useEffect(() => {
    setS((cur) => speak(cur, talkKey, turns));
  }, [talkKey, turns]);

  useEffect(() => {
    saveHeard(bookId, s.heard);
  }, [bookId, s.heard]);

  const turn = speaking(s);
  const p = progressOf(s);

  return (
    <>
      <Overlay
        open={!!turn}
        onClose={() => {
          setPlaying(false);
          setS(close);
        }}
        title={title}
        className="preshow"
      >
        {turn ? (
          <>
            <Speaker
              key={turn.clip || p.at}
              turn={turn}
              who={speaker(book, turn.who)}
              playing={playing}
              onEnded={() => {
                /* She reads herself to the end of the queue and stops
                   there rather than closing on the student — leaving is
                   theirs to decide. */
                if (isLast(s)) setPlaying(false);
                setS(next);
              }}
            />

            <div className="preshow-foot">
              <button
                type="button"
                className="btn"
                onClick={() => setS(back)}
                disabled={s.at === 0}
              >
                ‹ Back
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setPlaying((v) => !v)}
                aria-pressed={playing}
              >
                {playing ? 'Pause' : 'Listen'}
              </button>
              <span className="preshow-count">
                {p.at} of {p.of}
              </span>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  if (isLast(s)) setPlaying(false);
                  setS(next);
                }}
              >
                {isLast(s) ? 'Let me read' : 'Next ›'}
              </button>
            </div>
          </>
        ) : null}
      </Overlay>

      {/* Once she has been heard she is not gone, only quiet. A student
          who wants the introduction again should not have to clear their
          browser storage to get it. */}
      {!turn && wasHeard(s, talkKey) ? (
        <button
          type="button"
          className="btn ghost hear-again"
          onClick={() => {
            setPlaying(false);
            setS((cur) => speak(cur, talkKey, turns, { again: true }));
          }}
        >
          <span aria-hidden="true">↻ </span>
          What Wren said
        </button>
      ) : null}
    </>
  );
}
