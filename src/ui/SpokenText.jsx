import { useId } from 'react';

/**
 * A line, with the word being said lit and the hard words tappable.
 *
 * Both the reading and the two characters render their text through
 * this, because a student should be able to tap a word wherever they
 * meet it, and because the highlighting rule is the same in both places.
 *
 * The pop-up is the platform's: `popover` gives the top layer, light
 * dismiss, Escape, and the focus behaviour, none of which we then have
 * to write or forget to update. The legacy reader's tooltip is 200 lines
 * of positioning code and it still opens behind the picture.
 *
 * A glossed word is a button — it does something when you press it, and
 * that is what a button is. It is styled as an underline rather than as
 * a control, because forty buttons in a sentence would look like a form.
 */

/**
 * @param {object} props
 * @param {string[]} props.tokens          the book's words, punctuation and all
 * @param {number} props.lit               which token is being said, or -1
 * @param {Record<string,string>} [props.gloss]  word (lowercase) to meaning
 * @param {(w:string)=>string|null} [props.wordIn] the meaning in the reader's language
 * @param {string} [props.className]
 * @param {string} [props.lang]
 */
export default function SpokenText({
  tokens,
  lit,
  gloss = {},
  wordIn,
  className = 'sub-line',
  lang = 'en',
}) {
  const id = useId();
  const has = Object.keys(gloss).length > 0;

  /* "cents." and "hair," are the same words as "cents" and "hair". The
     apostrophe stays in, because "It'll" is one word. */
  const bare = (t) =>
    String(t)
      .toLowerCase()
      .replace(/[’]/g, "'")
      .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '');

  return (
    <p className={className} lang={lang}>
      {tokens.map((t, i) => {
        const key = has ? bare(t) : '';
        const meaning = key ? gloss[key] : null;
        const cls = i === lit ? 'w on' : 'w';

        if (!meaning) {
          return (
            <span key={`${i}-${t}`} className={cls}>
              {t}{' '}
            </span>
          );
        }

        const pop = `${id}-${i}`;
        const other = wordIn ? wordIn(key) : null;
        return (
          <span key={`${i}-${t}`} className={cls}>
            {/* React 19 knows these as camelCase props and writes the
                lowercase attributes the platform actually reads. */}
            <button
              type="button"
              className="gl"
              popoverTarget={pop}
              popoverTargetAction="toggle"
            >
              {t}
            </button>
            <span className="glossbox" popover="auto" id={pop}>
              <b>{key}</b>
              <span className="gl-mean">{meaning}</span>
              {other ? (
                <span className="gl-tr" lang={undefined}>
                  {other}
                </span>
              ) : null}
            </span>{' '}
          </span>
        );
      })}
    </p>
  );
}
