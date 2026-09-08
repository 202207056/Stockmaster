import LoginNotice from './LoginNotice';
import ErrorState from './ErrorState';
import useAuth from '../../hooks/useAuth';

export default function RemoteState({ resource, authenticated = true, empty = false, children }) {
  const { isLoading, sessionError, refresh, logout } = useAuth();
  if (isLoading) return <p role="status" className="py-8 text-sm text-gray-500">로그인 상태를 확인하고 있어요…</p>;
  if (sessionError) return <div><ErrorState error={sessionError} onRetry={() => refresh().catch(() => {})} /><button onClick={logout} className="text-sm underline">다시 로그인하기</button></div>;
  if (!authenticated) return <LoginNotice message="로그인하면 최신 데이터를 확인할 수 있어요." />;
  if (resource.loading) return <p role="status" className="py-8 text-sm text-gray-500">불러오는 중이에요…</p>;
  if (resource.error) return <ErrorState error={resource.error} onRetry={resource.reload} />;
  if (empty) return <div className="py-8 text-sm text-gray-500">현재 표시할 데이터가 없어요. <button className="underline" onClick={resource.reload}>다시 조회</button></div>;
  return children;
}
