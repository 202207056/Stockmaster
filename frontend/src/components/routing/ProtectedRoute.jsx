import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { SkeletonCard } from '../common/Skeleton';
import { REQUIRE_AUTH } from '../../config/features';

/** 화면 접근 정책. 실제 API 데이터의 권한은 서버가 검사합니다. */
export default function ProtectedRoute({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  const content = children ?? <Outlet />;

  // 접근 제어가 꺼져 있으면 로그인 상태와 무관하게 화면을 보여 줍니다.
  if (!REQUIRE_AUTH) return content;

  if (status === 'loading') {
    return (
      <div className="mx-auto flex w-full max-w-page flex-col gap-4 px-8 py-10">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return content;
}
