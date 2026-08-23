import { useEffect, useRef } from 'react';

/**
 * A modal, using the element the platform provides.
 *
 * The legacy reader hand-rolls its overlays, and the bill came due: the
 * arrow keys drove the reading *behind* the guide, because the list of
 * "is a modal open" selectors had to be maintained by hand and `#gdoc`
 * was missing from it. The fix at the time was to add it to the list.
 *
 * `<dialog showModal()>` removes the list. The browser puts the element
 * in the top layer, traps focus inside it, makes everything behind it
 * inert, closes on Escape, and restores focus to whatever opened it. All
 * of that is behaviour we would otherwise be writing, testing and
 * forgetting to update.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.title
 * @param {import('react').ReactNode} props.children
 * @param {string} [props.className]
 */
export default function Overlay({ open, onClose, title, children, className = '' }) {
  const ref = useRef(/** @type {HTMLDialogElement|null} */ (null));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  /* Escape, the × and the backdrop all end up here, so the caller's
     state cannot drift out of step with the element.

     Bound with addEventListener rather than as a JSX onClick because a
     click handler on the <dialog> element trips the a11y rules asking
     for a keyboard equivalent — and the keyboard equivalent already
     exists, natively, as Escape. Better to bind it where the rules are
     not being asked a question they cannot answer than to silence
     them. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const close = () => onClose?.();
    /* the backdrop is the dialog itself; anything inside it is a child */
    const onClick = (e) => {
      if (e.target === el) onClose?.();
    };
    el.addEventListener('close', close);
    el.addEventListener('click', onClick);
    return () => {
      el.removeEventListener('close', close);
      el.removeEventListener('click', onClick);
    };
  }, [onClose]);

  return (
    <dialog ref={ref} className={`overlay ${className}`.trim()} aria-label={title}>
      <div className="overlay-inner">
        <header className="overlay-head">
          <h2>{title}</h2>
          <button
            type="button"
            className="btn ghost close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <div className="overlay-body">{children}</div>
      </div>
    </dialog>
  );
}
