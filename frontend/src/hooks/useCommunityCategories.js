import { useCallback, useMemo, useSyncExternalStore } from 'react';

const EVENT = 'community:categories';
const keyFor = owner => `community:categories:${owner}`;
function subscribe(callback) {
  window.addEventListener(EVENT, callback); window.addEventListener('storage', callback);
  return () => { window.removeEventListener(EVENT, callback); window.removeEventListener('storage', callback); };
}

export default function useCommunityCategories(owner) {
  const read = useCallback(() => {
    if (owner == null) return '[]';
    try { return localStorage.getItem(keyFor(owner)) || '[]'; } catch { return '[]'; }
  }, [owner]);
  const snapshot = useSyncExternalStore(subscribe, read, () => '[]');
  const categories = useMemo(() => {
    try { const value = JSON.parse(snapshot); return Array.isArray(value) ? value.filter(item => item && typeof item.symbol_code === 'string' && typeof item.name === 'string') : []; } catch { return []; }
  }, [snapshot]);
  const save = next => {
    if (owner == null) return;
    localStorage.setItem(keyFor(owner), JSON.stringify(next));
    window.dispatchEvent(new window.Event(EVENT));
  };
  return { categories, save };
}

