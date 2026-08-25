/**
 * @deprecated `src/api/client.js` 를 사용하세요.
 *
 * 기존 코드가 `import api from '../api/axios'` 로 이 파일을 가져다 쓰고 있어
 * 곧바로 삭제하면 다른 사람의 작업이 깨집니다. 당분간 재수출만 합니다.
 * (하드코딩된 localhost:8000 baseURL 은 제거되었습니다 — client.js 가 .env 를 읽습니다.)
 */
export { default, API_BASE_URL, API_ORIGIN, getToken, setToken, clearToken } from './client';
