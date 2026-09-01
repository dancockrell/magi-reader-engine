import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import Overlay from './Overlay.jsx';
import { UiLanguage, T } from './useUi.jsx';
import { useBook } from './useBook.jsx';
import { load, save, documentState, PACES } from '../lib/settings.js';

const READING_SETTINGS = [
  ['contrast', 'Higher contrast'],
  ['bigText', 'Larger text'],
  ['ruler', 'Reading ruler'],
];

function useSettings() {
  const [settings, setSettings] = useState(() => load());
  const [couldNotSave, setCouldNotSave] = useState(false);

  const set = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      setCouldNotSave(!save(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const reduced =
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    const state = documentState(settings, { reducedMotion: reduced });
    const root = document.documentElement;
    for (const c of ['hicontrast', 'bigtext', 'ruler', 'stillness']) root.classList.remove(c);
    for (const c of state.classes) root.classList.add(c);
  }, [settings]);

  return { settings, set, couldNotSave };
}

export default function Shell() {
  const { book, id, title } = useBook();
  const { settings, set, couldNotSave } = useSettings();
  const [panel, setPanel] = useState(/** @type {null|'settings'|'language'} */ (null));
  const location = useLocation();

  useEffect(() => setPanel(null), [location.pathname]);

  const languages = useMemo(() => book.languages || [], [book]);
  const reading = location.pathname.includes('/read');
  const home = `/book/${id}`;

  return (
    <UiLanguage book={book} lang={settings.language}>
      <div className="app solo-app">
        <header className="bar">
          <div className="brand-wrap">
            <Link to="/" className="shelf-link" aria-label="Back to bookshelf">
              ‹ Bookshelf
            </Link>
            <Link to={home} className="brand">
              <b>{title}</b>
              <span className="sub">Read with Wren & Ambrose</span>
            </Link>
          </div>

          <nav className="doors" aria-label="Book sections">
            <NavLink to={`${home}/read/0`} className="btn ghost">
              <T>Read</T>
            </NavLink>
            <NavLink to={`${home}/words`} className="btn ghost">
              <T>Vocabulary</T>
            </NavLink>
            <NavLink to={`${home}/explore`} className="btn ghost">
              <T>Explore</T>
            </NavLink>
            <button
              type="button"
              className="btn ghost"
              aria-haspopup="dialog"
              onClick={() => setPanel('language')}
            >
              <T>Language</T>
            </button>
            <button
              type="button"
              className="btn ghost"
              aria-haspopup="dialog"
              onClick={() => setPanel('settings')}
            >
              <T>Settings</T>
            </button>
          </nav>
        </header>

        <Outlet context={{ settings, set }} />

        <Overlay open={panel === 'language'} onClose={() => setPanel(null)} title="Language">
          <p className="note">
            The original text stays in English. Your language can appear underneath it and in word
            definitions.
          </p>
          <ul className="pick">
            <li>
              <button
                type="button"
                className={'opt' + (settings.language === '' ? ' on' : '')}
                aria-pressed={settings.language === ''}
                onClick={() => set({ language: '' })}
              >
                English only
              </button>
            </li>
            {languages.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  className={'opt' + (settings.language === l.code ? ' on' : '')}
                  aria-pressed={settings.language === l.code}
                  onClick={() => set({ language: l.code })}
                  lang={l.code}
                >
                  {l.name} <small lang="en">{l.en}</small>
                </button>
              </li>
            ))}
          </ul>
        </Overlay>

        <Overlay open={panel === 'settings'} onClose={() => setPanel(null)} title="Reading settings">
          {couldNotSave && (
            <p className="note warn" role="status">
              This device will not let the reader remember settings, so these last only until you
              close the page.
            </p>
          )}

          <fieldset className="set">
            <legend>Reading</legend>
            {READING_SETTINGS.map(([key, label]) => (
              <label key={key} className="check">
                <input
                  type="checkbox"
                  checked={!!settings[key]}
                  onChange={(e) => set({ [key]: e.target.checked })}
                />
                <T>{label}</T>
              </label>
            ))}
          </fieldset>

          <fieldset className="set">
            <legend>Sound and motion</legend>
            <label className="check">
              <input
                type="checkbox"
                checked={!!settings.sound}
                onChange={(e) => set({ sound: e.target.checked })}
              />
              Narration on
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={!!settings.motion}
                onChange={(e) => set({ motion: e.target.checked })}
              />
              Animated scenes on
            </label>

            <div className="pace" role="group" aria-label="Narration pace">
              {PACES.map(([rate, label]) => (
                <button
                  key={label}
                  type="button"
                  className={'opt' + (settings.pace === rate ? ' on' : '')}
                  aria-pressed={settings.pace === rate}
                  onClick={() => set({ pace: rate })}
                >
                  <T>{label}</T>
                </button>
              ))}
            </div>
          </fieldset>

          {reading && <p className="note">Changes apply to the reading immediately.</p>}
        </Overlay>
      </div>
    </UiLanguage>
  );
}
