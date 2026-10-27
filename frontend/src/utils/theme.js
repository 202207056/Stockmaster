export const THEME_KEY = 'stockmaster:theme';
const EVENT = 'stockmaster:theme-change';
let preference;

function readPreference() {
  if (preference === undefined) {
    try { preference = window.localStorage.getItem(THEME_KEY); } catch { /* Keep in-memory choice. */ }
  }
  return preference === 'light' || preference === 'dark' ? preference : null;
}

export function getTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function apply(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function setTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') return;
  preference = theme;
  try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* Still works for this session. */ }
  apply(theme);
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeTheme(listener) {
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const sync = () => { apply(readPreference() ?? (media?.matches ? 'dark' : 'light')); listener(); };
  const storage = event => {
    if (event.key === THEME_KEY || event.key === null) { preference = undefined; sync(); }
  };
  sync();
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', storage);
  media?.addEventListener('change', sync);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener('storage', storage);
    media?.removeEventListener('change', sync);
  };
}
