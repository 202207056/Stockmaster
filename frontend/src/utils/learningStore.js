import { safeRecord } from './learning.js';

const PREFIX = 'stockmaster.learning.v1:';
const stores = new Map();
const empty = () => ({ version: 1, records: {}, persistent: true, notice: '' });

export function decodeLearning(raw) {
  if (!raw) return empty();
  const parsed = JSON.parse(raw);
  if (parsed.version !== 1 || !parsed.records || typeof parsed.records !== 'object' || Array.isArray(parsed.records)) throw new Error('Invalid learning data');
  const records = Object.fromEntries(Object.entries(parsed.records).filter(([key, value]) => key.length <= 200 && value && typeof value === 'object' && !Array.isArray(value)).slice(-500));
  return { ...empty(), records };
}

export function createLearningStore(scope, storage = () => localStorage) {
  const key = PREFIX + scope;
  let snapshot;
  try { snapshot = decodeLearning(storage().getItem(key)); }
  catch { snapshot = { ...empty(), persistent: false, notice: '기기 기록을 읽지 못했습니다. 이번 방문 동안만 유지됩니다.' }; }
  const listeners = new Set();
  const emit = () => listeners.forEach((listener) => listener());
  const persist = (records) => {
    snapshot = { ...snapshot, records };
    try {
      storage().setItem(key, JSON.stringify({ version: 1, records }));
      snapshot = { ...snapshot, persistent: true, notice: '' };
    } catch { snapshot = { ...snapshot, persistent: false, notice: '기기 저장에 실패했습니다. 이번 방문 동안만 유지됩니다.' }; }
    emit();
    return snapshot.persistent;
  };
  return {
    key,
    getSnapshot: () => snapshot,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    read(recordKey, defaults) { return safeRecord(snapshot.records[recordKey], defaults); },
    write(recordKey, value) {
      const entries = Object.entries(snapshot.records).filter(([name]) => name !== recordKey).slice(-499);
      return persist(Object.fromEntries([...entries, [recordKey, value]]));
    },
    remove(recordKey) { return persist(Object.fromEntries(Object.entries(snapshot.records).filter(([name]) => name !== recordKey))); },
    clear() {
      try { storage().removeItem(key); snapshot = empty(); }
      catch { snapshot = { ...empty(), persistent: false, notice: '기기에서 삭제하지 못했습니다. 브라우저 저장 설정을 확인해 주세요.' }; }
      emit();
    },
    reload() {
      try { snapshot = decodeLearning(storage().getItem(key)); emit(); }
      catch { /* Keep the current session if a concurrent or corrupted write cannot be read. */ }
    },
  };
}

export function getLearningStore(scope) {
  if (!stores.has(scope)) stores.set(scope, createLearningStore(scope));
  return stores.get(scope);
}

if (typeof window !== 'undefined') window.addEventListener('storage', (event) => {
  for (const store of stores.values()) if (event.key === store.key || event.key === null) store.reload();
});
