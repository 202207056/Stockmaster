import { useContext } from 'react';
import { AuthContext } from '../contexts/auth-context';

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth 는 <AuthProvider> 안에서만 사용할 수 있습니다.');
  }
  return ctx;
}

export default useAuth;
