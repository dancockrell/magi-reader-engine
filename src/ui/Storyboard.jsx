import { useEffect, useRef } from 'react';
import Overlay from './Overlay.jsx';

/**
 * Getting around the book.
 *
 * The old reader put a dot per segment under the picture. Twelve dots
 * were readable; the moment a book has forty they are a grey smear you
 * cannot aim at on a tablet, and this reader is meant to hold more than
 * one book. So: the picture and the title, which is what a reader
 * actually recognises, laid out as a storyboard — plus how far through
 * each one they are, so it doubles as the record of where they have been.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {ReturnType<typeof import('../lib/reader/track.js').segmentsOf>} props.segments
 * @param {ReturnType<typeof import('../lib/reader/track.js').whereIn>} props.where
 * @param {(at:number)=>void} props.onJump
 */
export default function Storyboard({ open, onClose, segments, where, onJump }) {
  const hereRef = useRef(/** @type {HTMLButtonElement|null} */ (null));

  /* Open onto where the reader is, not onto the top of the book. With
     forty segments the one they want is usually the one they are in. */
  useEffect(() => {
    if (open) hereRef.current?.scrollIntoView({ block: 'center' });
  }, [open]);

  return (
    <Overlay open={open} onClose={onClose} title="Segments" className="storyboard">
      <ol className="segs">
        {segments.map((s, i) => {
          const here = i === where.index;
          /* "behind", not "done": .done is already the finished-screen
             class, and sharing it centred every read segment's text. */
          const behind = where.index > i;
          const through = here ? where.through / where.span : behind ? 1 : 0;
          return (
            <li key={s.id}>
              <button
                type="button"
                ref={here ? hereRef : null}
                className={'seg' + (here ? ' here' : '') + (behind ? ' behind' : '')}
                aria-current={here ? 'step' : undefined}
                onClick={() => {
                  onJump(s.from);
                  onClose();
                }}
              >
                <span className="seg-plate">
                  {s.plate?.src ? (
                    <img src={s.plate.src} alt="" loading="lazy" decoding="async" />
                  ) : (
                    <span className="seg-noplate" aria-hidden="true">
                      {i + 1}
                    </span>
                  )}
                </span>
                <span className="seg-words">
                  <span className="seg-act">{s.act || `Segment ${i + 1}`}</span>
                  <span className="seg-title">{s.title}</span>
                  <span className="seg-meta">
                    {s.lines ? `${s.lines} ${s.lines === 1 ? 'line' : 'lines'}` : 'no reading'}
                    {s.said ? ` · ${s.said} spoken` : ''}
                    {s.asks ? ` · ${s.asks} to answer` : ''}
                  </span>
                </span>
                <progress className="seg-through" value={through} max={1}>
                  {Math.round(through * 100)}%
                </progress>
              </button>
            </li>
          );
        })}
      </ol>
    </Overlay>
  );
}
