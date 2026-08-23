import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import Overlay from './Overlay.jsx';
import { load, save, documentState, SCHEMA } from '../lib/settings.js';
import book from '../books/magi/book.json';

/**
 * The frame every screen sits in.
 *
 * The doors are the ones the legacy reader has, in the same place and
 * the same order — Vocabulary, Learning guide, Class, Language, Settings
 * — because that arrangement is already familiar to anyone using it. The
 * difference is underneath: each is a route with a URL, so Back works,
 * a page can be bookmarked, and a teacher can send a link to exactly the
 * screen they mean.
 */

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

  /* The document reflects the settings; nothing else reads them off it. */
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
  const { settings, set, couldNotSave } = useSettings();
  const [panel, setPanel] = useState(/** @type {null|'settings'|'language'} */ (null));
  const location = useLocation();

  /* A route change closes any panel: leaving a screen with a modal still
     open is how the legacy reader ended up with a guide that would not
     shut. */
  useEffect(() => setPanel(null), [location.pathname]);

  const languages = useMemo(() => book.languages || [], []);
  const reading = location.pathname.startsWith('/read');

  return (
    <div className="app">
      <header className="bar">
        <Link to="/" className="brand">
          <b>{book.meta.title}</b>
          <span className="sub">An illustrated reading</span>
        </Link>

        <nav className="doors" aria-label="Sections">
          <NavLink to="/practise" className="btn ghost">
            Vocabulary
          </NavLink>
          <NavLink to="/guide" className="btn ghost">
            Learning guide
          </NavLink>
          <NavLink to="/class" className="btn ghost">
            Class
          </NavLink>
          <button
            type="button"
            className="btn ghost"
            aria-haspopup="dialog"
            onClick={() => setPanel('language')}
          >
            Language
          </button>
          <button
            type="button"
            className="btn ghost"
            aria-haspopup="dialog"
            onClick={() => setPanel('settings')}
          >
            Settings
          </button>
        </nav>
      </header>

      <Outlet context={{ settings, set }} />

      <Overlay open={panel === 'language'} onClose={() => setPanel(null)} title="Language">
        <p className="note">
          The story stays in English. Your language appears underneath it, and on the words you
          look up.
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

      <Overlay open={panel === 'settings'} onClose={() => setPanel(null)} title="Settings">
        {couldNotSave && (
          <p className="note warn" role="status">
            This device will not let the reader remember settings, so these last only until you
            close the page.
          </p>
        )}

        <fieldset className="set">
          <legend>Reading</legend>
          {[
            ['contrast', 'Higher contrast'],
            ['bigText', 'Larger text'],
            ['ruler', 'Reading ruler'],
          ].map(([key, label]) => (
            <label key={key} className="check">
              <input
                type="checkbox"
                checked={!!settings[key]}
                onChange={(e) => set({ [key]: e.target.checked })}
              />
              {label}
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
            Sound on
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={!!settings.motion}
              onChange={(e) => set({ motion: e.target.checked })}
            />
            Movement in the pictures
          </label>

          <div className="pace" role="group" aria-label="Reading pace">
            {SCHEMA.pace.def !== undefined &&
              [
                [0.85, 'Slower'],
                [1, 'Normal'],
                [1.18, 'Faster'],
              ].map(([rate, label]) => (
                <button
                  key={label}
                  type="button"
                  className={'opt' + (settings.pace === rate ? ' on' : '')}
                  aria-pressed={settings.pace === rate}
                  onClick={() => set({ pace: rate })}
                >
                  {label}
                </button>
              ))}
          </div>
        </fieldset>

        {reading && (
          <p className="note">Changes apply to the reading behind this panel straight away.</p>
        )}
      </Overlay>
    </div>
  );
}
