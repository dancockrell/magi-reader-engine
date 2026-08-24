import { createContext, useContext, useMemo } from 'react';
import { uiTranslation, hasLanguage } from '../lib/book/translate.js';

/**
 * The interface, in the reader's language.
 *
 * The book carries 129 translated phrases — the doors, the buttons, the
 * headings — and nothing used a single one of them. A student who reads
 * no English could have the story translated under every line and still
 * not know which button starts it.
 *
 * The English is the key, so the call site reads as English and a
 * missing translation falls back to it rather than to a blank or to a
 * key. Nothing here can make the interface worse than it was.
 *
 * Shown as a second line rather than as a replacement: the words on the
 * buttons are also words this student is learning, and a class where the
 * teacher says "press Vocabulary" should still work.
 */

const UiContext = createContext(
  /** @type {{lang:string, t:(s:string)=>string|null}} */ ({
    lang: '',
    t: () => null,
  })
);

/**
 * @param {object} props
 * @param {import('../lib/types.js').Book} props.book
 * @param {string} props.lang
 * @param {import('react').ReactNode} props.children
 */
export function UiLanguage({ book, lang, children }) {
  const value = useMemo(() => {
    const on = hasLanguage(book, lang);
    return {
      lang: on ? lang : '',
      t: (s) => (on ? uiTranslation(book, lang, s) : null),
    };
  }, [book, lang]);
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export const useUi = () => useContext(UiContext);

/**
 * An English phrase, with its translation under it when there is one.
 *
 * @param {object} props
 * @param {string} props.children  the English, which is also the key
 */
export function T({ children }) {
  const { lang, t } = useUi();
  const other = typeof children === 'string' ? t(children) : null;
  if (!other) return children;
  return (
    <>
      {children}
      <span className="ui-tr" lang={lang}>
        {other}
      </span>
    </>
  );
}
