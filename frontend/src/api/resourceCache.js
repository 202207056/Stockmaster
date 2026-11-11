// Bounded best-effort storage; persistence must never break a successful read.
export const CACHE_STORAGE_KEY = 'stockmaster:resources:v1';
// Retain snapshots until replaced, evicted for storage space, or cleared on logout.
export const CACHE_MAX_AGE = Infinity;
export const MAX_ENTRIES = 500;
const MAX_CHARS = 3_000_000;
function entries() {
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_STORAGE_KEY));
    if (!Array.isArray(value)) return [];
    const now = Date.now();
    return value.filter(item => typeof item?.key === 'string' && typeof item.private === 'boolean'
      && Number.isFinite(item.savedAt) && item.savedAt <= now && now - item.savedAt < CACHE_MAX_AGE && item.data != null);
  } catch { return []; }
}
export function resourceKey(api, scope, key) { return JSON.stringify([api, scope, key]); }
export function readResource(key) { return key ? entries().find(item => item.key === key) ?? null : null; }
export function writeResource(key, data, isPrivate = false) {
  if (!key || data == null) return;
  try {
    const entry = { key, data, private: isPrivate, savedAt: Date.now() };
    if (JSON.stringify(entry).length > MAX_CHARS) return;
    const next = [...entries().filter(item => item.key !== key), entry].slice(-MAX_ENTRIES);
    while (JSON.stringify(next).length > MAX_CHARS) next.shift();
    while (next.length) {
      try { localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(next)); break; }
      catch { next.shift(); }
    }
  } catch { /* Disabled storage, quota limits or non-serializable data. */ }
}
export function removeResource(key) {
  try { localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(entries().filter(item => item.key !== key))); } catch { /* Optional storage. */ }
}
export function clearPrivateResources() {
  try { localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(entries().filter(item => !item.private))); } catch { /* Optional storage. */ }
}
export function canRetainResource(error) {
  const status = error?.response?.status;
  // Only a definitive denial/deletion invalidates the last successful read.
  return ![401, 403, 404, 410].includes(status);
}
