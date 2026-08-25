import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext } from './auth-context';
import { clearToken, getToken, setToken, EVT_UNAUTHORIZED } from '../api/client';
import * as authApi from '../api/auth';

const ACCOUNT_KEY = 'gp_account_id';

const readStoredAccountId = () => {
  try {
    const v = localStorage.getItem(ACCOUNT_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
};

const storeAccountId = (id) => {
  try {
    if (id == null) localStorage.removeItem(ACCOUNT_KEY);
    else localStorage.setItem(ACCOUNT_KEY, String(id));
  } catch {
    /* 무시 */
  }
};

/**
 * 로그인 상태 · 계좌 정보를 앱 전역에 제공합니다. (F-7)
 *
 * 계좌를 여기 두는 이유: account_id 가 주문·포트폴리오 조회에 계속 필요한데,
 * 화면마다 /trading/accounts 를 다시 부르면 콜드스타트 지연이 그만큼 늘어납니다.
 * (Doc/13 §3-2 권고)
 *
 * 로그인하지 않아도 화면은 전부 열립니다(config/features.js 의 REQUIRE_AUTH=false).
 * 이때 user 와 account 는 null 이고, 각 화면은 "로그인하면 표시돼요" 안내를 대신 보여 줍니다.
 */
export function AuthProvider({ children }) {
  const [status, setStatus] = useState(() => (getToken() ? 'loading' : 'unauthenticated'));
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState(readStoredAccountId);

  // StrictMode 의 이중 마운트로 부트스트랩이 두 번 도는 것을 막습니다.
  const bootstrapped = useRef(false);

  const applyAccounts = useCallback((list) => {
    setAccounts(list);
    setAccountId((prev) => {
      const stillValid = list.some((a) => a.account_id === prev);
      const next = stillValid ? prev : (list[0]?.account_id ?? null);
      storeAccountId(next);
      return next;
    });
  }, []);

  const clearSession = useCallback(() => {
    clearToken();
    storeAccountId(null);
    setUser(null);
    setAccounts([]);
    setAccountId(null);
    setStatus('unauthenticated');
  }, []);

  /**
   * 토큰으로 사용자·계좌를 채웁니다.
   *
   * 첫 줄부터 await 로 시작하는 것이 중요합니다. 여기서 상태를 동기적으로 바꾸면
   * 아래 부트스트랩 useEffect 가 "이펙트 본문에서 setState 를 동기 호출"하는 모양이 되어
   * 연쇄 렌더가 발생합니다. (eslint react-hooks/set-state-in-effect)
   * 토큰이 없거나 만료면 fetchMe 가 401 로 throw 하므로 사전 검사도 필요 없습니다.
   */
  const refresh = useCallback(async () => {
    const me = await authApi.fetchMe();
    setUser(me);
    setStatus('authenticated');

    // 계좌 조회가 실패해도 로그인 자체는 유효합니다. 화면이 통째로 막히면 안 되므로 분리합니다.
    try {
      applyAccounts(await authApi.fetchAccounts());
    } catch {
      setAccounts([]);
    }
  }, [applyAccounts]);

  /* 앱 시작 시 저장된 토큰으로 세션 복구 */
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    // 토큰이 없으면 초기 status 가 이미 'unauthenticated' 이므로 할 일이 없습니다.
    if (!getToken()) return;

    let cancelled = false;
    const bootstrap = async () => {
      try {
        await refresh();
      } catch {
        // 401 이면 인터셉터가 이미 토큰을 지웠습니다. 그 외 오류(서버 다운 등)도
        // 사용자 정보를 못 받은 이상 비로그인으로 취급하는 편이 안전합니다.
        if (!cancelled) clearSession();
      }
    };
    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [refresh, clearSession]);

  /* 어떤 요청이든 401 이 오면 즉시 로그아웃 (Doc/13 §4-3) */
  useEffect(() => {
    const onUnauthorized = () => clearSession();
    window.addEventListener(EVT_UNAUTHORIZED, onUnauthorized);
    return () => window.removeEventListener(EVT_UNAUTHORIZED, onUnauthorized);
  }, [clearSession]);

  const login = useCallback(
    async (loginId, passwd) => {
      const { access_token } = await authApi.login({ login_id: loginId, passwd });
      if (!access_token) throw new Error('로그인 응답에 토큰이 없습니다.');
      setToken(access_token);
      setStatus('loading');
      try {
        await refresh();
      } catch (err) {
        clearSession();
        throw err;
      }
    },
    [refresh, clearSession],
  );

  const signup = useCallback(
    async ({ loginId, passwd, userName, email }) => {
      await authApi.register({
        login_id: loginId,
        passwd,
        user_name: userName,
        email,
      });
      // 가입 직후 바로 로그인시켜 설문/대시보드로 이어지게 합니다.
      await login(loginId, passwd);
    },
    [login],
  );

  const logout = useCallback(() => clearSession(), [clearSession]);

  const selectAccount = useCallback((id) => {
    setAccountId(id);
    storeAccountId(id);
  }, []);

  const value = useMemo(
    () => ({
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      user,
      accounts,
      accountId,
      account: accounts.find((a) => a.account_id === accountId) ?? null,
      login,
      signup,
      logout,
      refresh,
      selectAccount,
      setUser,
    }),
    [status, user, accounts, accountId, login, signup, logout, refresh, selectAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
