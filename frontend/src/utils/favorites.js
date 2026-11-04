/** Account libraries live on the server; guest favorites and recent views stay local. */
const KEY = 'gp_favorites';
export const FAVORITES_EVENT = 'favorites:change';
let owner = null;
let session = null;
const storageKey = () => owner == null ? KEY : `${KEY}:user:${owner}`;
const notify = () => window.dispatchEvent(new CustomEvent(FAVORITES_EVENT));
const empty = () => ({ revision: 0, codes: [], groups: [] });
const readArray = key => {
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
};
const localLibrary = key => ({
  revision: 0,
  codes: [...new Set(readArray(key).filter(code => typeof code === 'string'))],
  groups: readArray(`${key}:groups`)
    .filter(group => group && typeof group.id === 'string' && typeof group.name === 'string' && Array.isArray(group.codes))
    .map(group => ({ id: group.id, name: group.name, codes: [...new Set(group.codes.filter(code => typeof code === 'string'))] })),
});
const current = () => session ? session.data : localLibrary(storageKey());
const checkSession = state => {
  if (state !== session || state.controller.signal.aborted) throw new Error('로그인 상태가 변경되었습니다. 다시 시도해 주세요.');
};
const api = () => import('../api/favorites.js');

export function setFavoritesOwner(id) {
  const next = id ?? null;
  if (next === owner && session) return;
  session?.controller.abort();
  owner = next;
  session = next == null ? null : { data: empty(), ready: false, loading: false, error: '', controller: new AbortController(), queue: Promise.resolve(), loadingPromise: null };
  notify();
  if (session) void syncFavorites().catch(() => {});
}

// Import only the legacy library owned by this user; guest data is never claimed.
function mergeLegacy(data, legacy) {
  data.codes = [...new Set([...data.codes, ...legacy.codes])];
  for (const group of legacy.groups) {
    const found = data.groups.find(item => item.id === group.id || item.name === group.name);
    const codes = group.codes.filter(code => data.codes.includes(code));
    if (found) found.codes = [...new Set([...found.codes, ...codes])];
    else data.groups.push({ ...group, codes });
  }
}

async function saveChange(state, change) {
  const remote = await api();
  for (let attempt = 0; attempt < 4; attempt++) {
    checkSession(state);
    const draft = structuredClone(state.data);
    const result = change(draft);
    try {
      const saved = await remote.putFavoriteLibrary(draft, state.controller.signal);
      checkSession(state);
      state.data = saved;
      return result;
    } catch (error) {
      checkSession(state);
      if (error.response?.status !== 409 || attempt === 3) throw error;
      const latest = await remote.fetchFavoriteLibrary(state.controller.signal);
      checkSession(state);
      state.data = latest;
    }
  }
}

export function syncFavorites() {
  const state = session;
  if (!state) return Promise.resolve();
  if (state.loadingPromise) return state.loadingPromise;
  const key = storageKey();
  state.loading = true;
  state.error = '';
  notify();
  const task = state.queue.then(async () => {
    checkSession(state);
    const remote = await api();
    checkSession(state);
    const data = await remote.fetchFavoriteLibrary(state.controller.signal);
    checkSession(state);
    state.data = data;
    let migrated = false;
    try { migrated = localStorage.getItem(`${key}:migrated`) === 'true'; } catch { /* No legacy storage. */ }
    if (!migrated) {
      const legacy = localLibrary(key);
      if (legacy.codes.length || legacy.groups.length) await saveChange(state, draft => mergeLegacy(draft, legacy));
      checkSession(state);
      try {
        localStorage.setItem(`${key}:migrated`, 'true');
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}:groups`);
      } catch { /* Account persistence does not require local storage. */ }
    }
    state.ready = true;
  }).catch(error => {
    if (state === session) state.error = error.userMessage || '관심종목을 불러오지 못했습니다. 다시 시도해 주세요.';
    throw error;
  }).finally(() => {
    state.loading = false;
    state.loadingPromise = null;
    if (state === session) notify();
  });
  state.loadingPromise = task;
  state.queue = task.catch(() => {});
  return task;
}

function mutate(change) {
  const state = session;
  if (!state) {
    const data = current();
    const result = change(data);
    localStorage.setItem(storageKey(), JSON.stringify(data.codes));
    localStorage.setItem(`${storageKey()}:groups`, JSON.stringify(data.groups));
    notify();
    return result;
  }
  const task = state.queue.then(async () => {
    checkSession(state);
    if (!state.ready) throw new Error('관심종목을 먼저 불러와 주세요. 새로고침 후 다시 시도해 주세요.');
    const result = await saveChange(state, change);
    state.error = '';
    notify();
    return result;
  }).catch(error => {
    if (state === session) {
      state.error = error.userMessage || error.message || '관심종목을 저장하지 못했습니다. 다시 시도해 주세요.';
      notify();
    }
    throw error;
  });
  state.queue = task.catch(() => {});
  return task;
}

export const getFavoritesStatus = () => ({ loading: session?.loading || false, error: session?.error || '' });
export const getFavorites = () => [...current().codes];
export const getFavoriteGroups = () => structuredClone(current().groups);
export const isFavorite = code => current().codes.includes(code);
const add = (data, code) => { if (!data.codes.includes(code)) data.codes.push(code); return data.codes; };
const remove = (data, code) => {
  data.codes = data.codes.filter(item => item !== code);
  data.groups.forEach(group => { group.codes = group.codes.filter(item => item !== code); });
  return data.codes;
};
export const addFavorite = code => mutate(data => add(data, code));
export const removeFavorite = code => mutate(data => remove(data, code));
export const toggleFavorite = code => mutate(data => data.codes.includes(code) ? remove(data, code) : add(data, code));
export const clearFavorites = () => mutate(data => { data.codes = []; data.groups.forEach(group => { group.codes = []; }); return []; });

function validateGroupName(data, value, id) {
  const name = value.trim();
  if (!name || name.length > 30) throw new Error('그룹 이름은 1~30자로 입력해 주세요.');
  if (data.groups.some(group => group.id !== id && group.name === name)) throw new Error('이미 있는 그룹 이름입니다.');
  return name;
}
export const createFavoriteGroup = value => {
  const id = crypto.randomUUID();
  return mutate(data => { const group = { id, name: validateGroupName(data, value), codes: [] }; data.groups.push(group); return group; });
};
export const renameFavoriteGroup = (id, value) => mutate(data => {
  const group = data.groups.find(item => item.id === id);
  if (!group) throw new Error('그룹이 삭제되었습니다. 목록을 다시 확인해 주세요.');
  group.name = validateGroupName(data, value, id);
  return group;
});
export const deleteFavoriteGroup = id => mutate(data => { data.groups = data.groups.filter(group => group.id !== id); });
export const saveFavoriteGroups = (code, ids) => mutate(data => {
  if (ids.some(id => !data.groups.some(group => group.id === id))) throw new Error('그룹이 변경되었습니다. 목록을 다시 확인해 주세요.');
  data.groups.forEach(group => { group.codes = ids.includes(group.id) ? [...new Set([...group.codes, code])] : group.codes.filter(item => item !== code); });
  return add(data, code);
});

export const getRecentStocks = () => [...new Set(readArray(`${storageKey()}:recent`).filter(code => typeof code === 'string'))].slice(0, 10);
const writeRecent = codes => { localStorage.setItem(`${storageKey()}:recent`, JSON.stringify(codes)); notify(); };
export const recordRecentStock = code => {
  if (!code) return;
  try { writeRecent([code, ...getRecentStocks().filter(item => item !== code)].slice(0, 10)); }
  catch { /* Browsing remains available when storage is full or blocked. */ }
};
export const clearRecentStocks = () => writeRecent([]);
export const deleteFavoritesForUser = userId => {
  if (userId == null) return;
  const key = `${KEY}:user:${userId}`;
  try { [key, `${key}:groups`, `${key}:recent`, `${key}:migrated`].forEach(item => localStorage.removeItem(item)); }
  catch { /* Session cleanup must still proceed. */ }
};
