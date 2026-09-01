import { createContext } from 'react';

/**
 * AuthContext 의 값 모양
 * {
 *   status: 'loading' | 'authenticated' | 'unauthenticated',
 *   isAuthenticated: boolean,
 *   user: UserResponse | null,
 *   accounts: Account[],
 *   accountId: number | null,
 *   account: Account | null,
 *   login(loginId, passwd): Promise<void>,
 *   signup({...}): Promise<void>,
 *   logout(): void,
 *   refresh(): Promise<void>,
 * }
 *
 * Provider 는 AuthContext.jsx, 소비용 훅은 hooks/useAuth.js 에 있습니다.
 * (파일을 나눈 이유: 한 파일에서 컴포넌트와 훅을 함께 export 하면
 *  Vite 의 Fast Refresh 가 매번 전체 리로드로 떨어집니다.)
 */
export const AuthContext = createContext(null);
