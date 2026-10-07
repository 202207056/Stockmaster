import { useSyncExternalStore } from 'react';

const KEY = 'stockmaster:tutorials-enabled';
const EVENT = 'tutorials:setting-changed';
let sessionValue;

function read() {
  if (sessionValue !== undefined) return sessionValue;
  try { return localStorage.getItem(KEY) !== 'false'; }
  catch { return true; }
}

function subscribe(listener) {
  const onStorage = (event) => {
    if (event.key === KEY || event.key === null) {
      sessionValue = undefined;
      listener();
    }
  };
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener('storage', onStorage);
  };
}

function setEnabled(enabled) {
  sessionValue = enabled;
  try { localStorage.setItem(KEY, String(enabled)); } catch { /* Keep the setting for this session. */ }
  window.dispatchEvent(new Event(EVENT));
}

export default function useTutorialSetting() {
  const enabled = useSyncExternalStore(subscribe, read, () => true);
  return [enabled, setEnabled];
}
