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
import { useBook } from './useBook.jsx';

/** A short framing conversation before or after the literary work. */
export default function Preshow({ talkKey, turns, title = 'Before we start' }) {
  const { book, id: bookId, media } = useBook();
  const [s, setS] = useState(() => createSpeech(loadHeard(bookId)));
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setS((cur) => speak(cur, talkKey, turns));
  }, [talkKey, turns]);

  useEffect(() => {
    saveHeard(bookId, s.heard);
  }, [bookId, s.heard]);

  const turn = speaking(s);
  const p = progressOf(s);
  const recorded = !!turn?.clip;

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
              key={turn.clip || `${talkKey}-${p.at}`}
              turn={turn}
              who={speaker(book, turn.who)}
              audioBase={media.audio}
              cuesUrl={media.cues}
              playing={playing && recorded}
              onEnded={() => {
                if (isLast(s)) setPlaying(false);
                setS(next);
              }}
            />

            <div className="preshow-foot">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setPlaying(false);
                  setS(back);
                }}
                disabled={s.at === 0}
              >
                ‹ Back
              </button>

              {recorded ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPlaying((v) => !v)}
                  aria-pressed={playing}
                >
                  {playing ? 'Pause' : 'Listen'}
                </button>
              ) : (
                <span className="preshow-textonly">Voice recording to come</span>
              )}

              <span className="preshow-count">
                {p.at} of {p.of}
              </span>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  setPlaying(false);
                  setS(next);
                }}
              >
                {isLast(s) ? (talkKey === 'final-thoughts' ? 'Close' : 'Let me read') : 'Next ›'}
              </button>
            </div>
          </>
        ) : null}
      </Overlay>

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
          {talkKey === 'final-thoughts' ? 'Wren & Ambrose’s final thoughts' : 'What Wren & Ambrose said'}
        </button>
      ) : null}
    </>
  );
}
