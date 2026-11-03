import { useSyncExternalStore } from 'react';

// Experimental feature switch on the My page. Off until the user turns it on in this browser.
export const ENABLED_KEY = 'stockmaster:term-analyzer-enabled';
const EVENT = 'term-analyzer:setting-changed';
let sessionValue;

export function readEnabled(storage = globalThis.localStorage) {
  if (sessionValue !== undefined) return sessionValue;
  try { return storage.getItem(ENABLED_KEY) === 'true'; }
  catch { return false; }
}

function subscribe(listener) {
  const onStorage = (event) => {
    if (event.key === ENABLED_KEY || event.key === null) {
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
  try { localStorage.setItem(ENABLED_KEY, String(enabled)); } catch { /* Keep the setting for this session. */ }
  window.dispatchEvent(new Event(EVENT));
}

export default function useTermAnalyzerSetting() {
  const enabled = useSyncExternalStore(subscribe, () => readEnabled(), () => false);
  return [enabled, setEnabled];
}
