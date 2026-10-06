/**
 * 관심종목 — localStorage 임시 구현 (Doc/13 §5-2)
 *
 * 백엔드에 favorites API 가 없습니다. 기능 자체는 프론트만으로 만들 수 있으므로
 * 저장소만 localStorage 로 대체합니다.
 * 나중에 API 가 생기면 이 파일의 함수 본문만 교체하면 되고, 호출하는 화면은
 * 그대로 둘 수 있습니다. (버려지는 작업이 아님)
 *
 * ⚠️ 기기 간 동기화가 되지 않습니다. 발표에서는 "임시 구현"임을 밝히세요.
 */

const KEY = 'gp_favorites';
let owner = null;
const storageKey = () => owner == null ? KEY : `${KEY}:user:${owner}`;
export const setFavoritesOwner = (id) => {
  owner = id ?? null;
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT));
};

/** 같은 탭 안에서도 변경을 감지할 수 있도록 커스텀 이벤트를 씁니다. */
export const FAVORITES_EVENT = 'favorites:change';

const read = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey()) || '[]');
    return Array.isArray(raw) ? raw.filter((c) => typeof c === 'string') : [];
  } catch {
    return [];
  }
};

const write = (list) => {
  localStorage.setItem(storageKey(), JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT, { detail: list }));
  return list;
};

export const getFavorites = () => read();

export const isFavorite = (code) => read().includes(code);

export const addFavorite = (code) => {
  const list = read();
  return list.includes(code) ? list : write([...list, code]);
};

export const removeFavorite = (code) => {
  writeExtra('groups', getFavoriteGroups().map(group => ({ ...group, codes: group.codes.filter(item => item !== code) })));
  return write(read().filter((c) => c !== code));
};

export const toggleFavorite = (code) => {
  const list = read();
  return list.includes(code) ? removeFavorite(code) : addFavorite(code);
};

export const clearFavorites = () => {
  writeExtra('groups', getFavoriteGroups().map(group => ({ ...group, codes: [] })));
  return write([]);
};

const readExtra = (type) => {
  try {
    const value = JSON.parse(localStorage.getItem(`${storageKey()}:${type}`) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
};
const writeExtra = (type, value) => {
  localStorage.setItem(`${storageKey()}:${type}`, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT));
};

export const getFavoriteGroups = () => readExtra('groups')
  .filter(group => group && typeof group.id === 'string' && typeof group.name === 'string' && Array.isArray(group.codes))
  .map(group => ({ ...group, codes: [...new Set(group.codes.filter(code => typeof code === 'string'))] }));

export const createFavoriteGroup = (value) => {
  const name = validateGroupName(value);
  const group = { id: crypto.randomUUID(), name, codes: [] };
  writeExtra('groups', [...getFavoriteGroups(), group]);
  return group;
};
function validateGroupName(value, id) {
  const name = value.trim();
  if (!name || name.length > 30) throw new Error('그룹 이름은 1~30자로 입력해 주세요.');
  if (getFavoriteGroups().some(group => group.id !== id && group.name === name)) throw new Error('이미 있는 그룹 이름입니다.');
  return name;
}
export const renameFavoriteGroup = (id, value) => {
  const name = validateGroupName(value, id);
  writeExtra('groups', getFavoriteGroups().map(group => group.id === id ? { ...group, name } : group));
};
export const deleteFavoriteGroup = (id) => writeExtra('groups', getFavoriteGroups().filter(group => group.id !== id));
export const saveFavoriteGroups = (code, ids) => {
  writeExtra('groups', getFavoriteGroups().map(group => ({
    ...group, codes: ids.includes(group.id) ? [...new Set([...group.codes, code])] : group.codes.filter(item => item !== code),
  })));
  return addFavorite(code);
};

export const getRecentStocks = () => [...new Set(readExtra('recent').filter(code => typeof code === 'string'))].slice(0, 10);
export const recordRecentStock = (code) => {
  if (!code) return;
  try { writeExtra('recent', [code, ...getRecentStocks().filter(item => item !== code)].slice(0, 10)); }
  catch { /* Browsing remains available when storage is full or blocked. */ }
};
export const clearRecentStocks = () => writeExtra('recent', []);
