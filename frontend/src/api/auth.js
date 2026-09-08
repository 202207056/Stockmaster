import api from './client';

/**
 * 인증 · 계좌 관련 API 호출 모음 (Doc/13 §3-1, §3-2)
 * 화면 컴포넌트가 엔드포인트 문자열을 직접 알지 않도록 여기서 감쌉니다.
 */

/** POST /api/users/register — 가입 시 1,000만원 계좌가 자동 생성됩니다. */
export async function register({ login_id, passwd, user_name, email }) {
  const { data } = await api.post('/users/register', { login_id, passwd, user_name, email });
  return data;
}

/**
 * POST /api/users/login
 * 응답: { access_token, token_type }
 * ⚠️ 유저 정보가 없으므로 로그인 직후 /users/me 를 한 번 더 불러야 합니다.
 */
export async function login({ login_id, passwd }) {
  const { data } = await api.post('/users/login', { login_id, passwd });
  return data;
}

/** GET /api/users/me (Bearer 필요) */
export async function fetchMe() {
  const { data } = await api.get('/users/me');
  return data;
}

/**
 * GET /api/trading/accounts
 * ⚠️ balance / withdrawable_cash 가 문자열로 옵니다. 화면에서 num() 을 거치세요.
 */
export async function fetchAccounts() {
  const { data } = await api.get('/trading/accounts');
  if (!Array.isArray(data)) throw new Error('계좌 목록 응답 형식을 확인해 주세요.');
  return data;
}

/** PUT /api/users/survey — 투자성향 저장 */
export async function updateInvestmentStyle(investment_style) {
  const { data } = await api.put('/users/survey', { investment_style });
  return data;
}
