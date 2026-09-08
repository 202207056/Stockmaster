import axios from 'axios';

/**
 * API 클라이언트 (F-6)
 *
 * - baseURL 은 .env 의 VITE_API_BASE_URL 에서 읽습니다. (하드코딩 금지)
 * - 요청마다 access_token 을 Authorization 헤더에 붙입니다.
 * - 401 이면 토큰을 지우고 `auth:unauthorized` 이벤트를 쏩니다. (Doc/13 §4-3)
 * - 응답이 늦으면 `api:slow` 이벤트를 쏩니다. (Render 콜드스타트, Doc/13 §4-2)
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:8000/api';

/** baseURL 에서 /api 를 뗀 서버 루트 (헬스체크·워밍업용) */
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');

export const TOKEN_KEY = 'access_token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* 저장 실패는 무시 — 이번 세션 동안만 동작 */
  }
};

export const clearToken = () => setToken(null);

/* ---------------------------------------------------------------------------
 * 이벤트 이름
 * ------------------------------------------------------------------------- */
export const EVT_SLOW = 'api:slow';           // 응답이 느림 (서버 기동 중일 가능성)
export const EVT_RECOVERED = 'api:recovered'; // 느리다고 알린 뒤 응답이 돌아옴
export const EVT_UNAUTHORIZED = 'auth:unauthorized';

/* ---------------------------------------------------------------------------
 * axios 인스턴스
 *
 * timeout 을 60초로 잡은 이유:
 * Render 무료 티어는 유휴 상태에서 잠들고, 첫 요청이 15초 이상 걸립니다.
 * 기본 타임아웃(무제한)이나 짧은 타임아웃(10초) 둘 다 사용자 경험이 나빠서
 * "충분히 기다리되 무한정은 아닌" 값으로 60초를 씁니다.
 * ------------------------------------------------------------------------- */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
  headers: { 'Content-Type': 'application/json' },
});

/* ---------------------------------------------------------------------------
 * 콜드스타트 안내
 *
 * Doc/13 §4-2 예제는 모듈 전역 타이머 변수 하나를 쓰는데, 요청이 동시에 여러 개
 * 나가면 나중 요청이 앞선 타이머를 덮어써서 안내가 조기에 사라집니다.
 * 여기서는 "진행 중인 요청 수"를 세고, 하나라도 남아 있으면 안내를 유지합니다.
 * ------------------------------------------------------------------------- */
const SLOW_THRESHOLD_MS = 3000;

let inFlight = 0;
let slowTimer = null;
let slowNotified = false;

const startTracking = () => {
  inFlight += 1;
  if (slowTimer === null) {
    slowTimer = setTimeout(() => {
      slowNotified = true;
      window.dispatchEvent(new CustomEvent(EVT_SLOW));
    }, SLOW_THRESHOLD_MS);
  }
};

const stopTracking = () => {
  inFlight = Math.max(0, inFlight - 1);
  if (inFlight > 0) return;
  if (slowTimer !== null) {
    clearTimeout(slowTimer);
    slowTimer = null;
  }
  if (slowNotified) {
    slowNotified = false;
    window.dispatchEvent(new CustomEvent(EVT_RECOVERED));
  }
};

/* ---------------------------------------------------------------------------
 * 인터셉터
 * ------------------------------------------------------------------------- */
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    config.sessionToken = token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    startTracking();
    return config;
  },
  (error) => {
    stopTracking();
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => {
    stopTracking();
    return response;
  },
  (error) => {
    stopTracking();

    const status = error.response?.status;

    // 토큰 만료 / 무효 -> 자동 로그아웃.
    // 리프레시 토큰이 없으므로 재발급 시도는 불가능하고, 재로그인이 유일한 수단입니다.
    if (status === 401 && error.config?.sessionToken && error.config.sessionToken === getToken()) {
      clearToken();
      window.dispatchEvent(new CustomEvent(EVT_UNAUTHORIZED));
    }

    // 화면에서 바로 쓸 수 있도록 메시지를 정규화해 붙여 둡니다.
    error.userMessage = toUserMessage(error);
    return Promise.reject(error);
  },
);

/**
 * axios 에러를 사용자에게 보여줄 한 문장으로 바꿉니다.
 * FastAPI 는 오류를 { "detail": "..." } 형태로 돌려줍니다. (Doc/13 §3-4)
 * detail 이 검증 오류일 때는 배열로도 옵니다.
 */
export function toUserMessage(error) {
  if (error instanceof Error && !error.isAxiosError) return error.message;
  if (error?.code === 'ECONNABORTED') {
    return '서버 응답이 너무 오래 걸립니다. 잠시 후 다시 시도해 주세요.';
  }
  if (!error?.response) {
    return '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.';
  }

  const { status, data } = error.response;
  const detail = data?.detail;

  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail[0]?.msg || '입력값을 다시 확인해 주세요.';
  }
  if (typeof data?.message === 'string' && data.message.trim()) return data.message;

  const byStatus = {
    400: '요청 내용을 다시 확인해 주세요.',
    401: '로그인이 필요합니다. 다시 로그인해 주세요.',
    403: '접근 권한이 없습니다.',
    404: '요청한 정보를 찾을 수 없습니다.',
    422: '입력값 형식이 올바르지 않습니다.',
    500: '서버에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    502: '서버가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.',
    503: '아직 준비되지 않은 기능입니다.',
  };
  return byStatus[status] || `요청에 실패했습니다. (오류 코드 ${status})`;
}

/**
 * 앱 진입 시 서버를 미리 깨웁니다. (Doc/13 §4-2)
 * 실패해도 앱 동작에 영향이 없어야 하므로 조용히 무시합니다.
 * axios 인스턴스를 쓰지 않는 이유: 콜드스타트 안내 배너가 진입하자마자 뜨는 것을 막기 위함.
 */
export function warmUpServer() {
  try {
    fetch(`${API_ORIGIN}/`, { method: 'GET', mode: 'cors', cache: 'no-store' }).catch(() => {});
  } catch {
    /* 무시 */
  }
}

export default api;
