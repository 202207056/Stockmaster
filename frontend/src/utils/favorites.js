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
  try {
    localStorage.setItem(storageKey(), JSON.stringify(list));
  } catch {
    /* 사파리 프라이빗 모드 등에서 저장 실패 — 무시하고 메모리 값만 반환 */
  }
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT, { detail: list }));
  return list;
};

export const getFavorites = () => read();

export const isFavorite = (code) => read().includes(code);

export const addFavorite = (code) => {
  const list = read();
  return list.includes(code) ? list : write([...list, code]);
};

export const removeFavorite = (code) => write(read().filter((c) => c !== code));

export const toggleFavorite = (code) => {
  const list = read();
  return write(list.includes(code) ? list.filter((c) => c !== code) : [...list, code]);
};

export const clearFavorites = () => write([]);
