import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Overlay from './Overlay.jsx';
import { UiLanguage, T } from './useUi.jsx';
import { readJoin, saveApi } from '../lib/class/key.js';
import { load, save, documentState, PACES } from '../lib/settings.js';
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

/** @type {[string, string][]} */
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

/**
 * A link the teacher handed out points this device at their Sheet.
 *
 * Applied once and then taken out of the URL, so that a student who
 * bookmarks the reading does not carry the join code around with them,
 * and so a reload does not keep re-applying it.
 *
 * It can only ever set where work is sent — a join code carries no
 * identity, so no link can make anybody the teacher.
 */
function useJoinLink() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const code = new URLSearchParams(location.search).get('join');
    if (!code) return;

    const read = readJoin(code);
    if (read?.api) saveApi(read.api);

    const rest = new URLSearchParams(location.search);
    rest.delete('join');
    navigate({ pathname: location.pathname, search: rest.toString() }, { replace: true });
  }, [location.search, location.pathname, navigate]);
}

export default function Shell() {
  const { settings, set, couldNotSave } = useSettings();
  const [panel, setPanel] = useState(/** @type {null|'settings'|'language'} */ (null));
  const location = useLocation();
  useJoinLink();

  /* A route change closes any panel: leaving a screen with a modal still
     open is how the legacy reader ended up with a guide that would not
     shut. */
  useEffect(() => setPanel(null), [location.pathname]);

  const languages = useMemo(() => book.languages || [], []);
  const reading = location.pathname.startsWith('/read');

  return (
    <UiLanguage book={book} lang={settings.language}>
      <div className="app">
        <header className="bar">
          <Link to="/" className="brand">
            <b>{book.meta.title}</b>
            <span className="sub">An illustrated reading</span>
          </Link>

          <nav className="doors" aria-label="Sections">
            <NavLink to="/practise" className="btn ghost">
              <T>Vocabulary</T>
            </NavLink>
            <NavLink to="/guide" className="btn ghost">
              <T>Learning guide</T>
            </NavLink>
            <NavLink to="/class" className="btn ghost">
              <T>Class</T>
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
            The story stays in English. Your language appears underneath it, and on the words
            you look up.
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
              This device will not let the reader remember settings, so these last only until
              you close the page.
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

          {reading && (
            <p className="note">
              Changes apply to the reading behind this panel straight away.
            </p>
          )}
        </Overlay>
      </div>
    </UiLanguage>
  );
}
