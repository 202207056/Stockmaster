import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { SkeletonCard } from '../common/Skeleton';
import { REQUIRE_AUTH } from '../../config/features';

/**
 * 로그인이 필요한 화면을 감쌉니다. (F-7)
 *
 * ⚠️ 현재는 `REQUIRE_AUTH = false` 라서 **아무도 막지 않고 그대로 통과시킵니다.**
 *    백엔드를 붙이지 않은 지금은 로그인 자체가 불가능하고, 붙인 뒤에도
 *    "로그인 없이 둘러보기"를 지원할 계획이기 때문입니다.
 *    보호를 켜려면 config/features.js 의 값 하나만 true 로 바꾸면 됩니다.
 *
 * 보호가 켜졌을 때의 동작:
 *  - 토큰으로 세션을 복구하는 동안(status === 'loading') 곧바로 로그인으로 보내면
 *    새로고침할 때마다 로그인 화면이 번쩍 지나갑니다. 그래서 로딩 중에는
 *    자리표시자를 보여 주고 판단을 미룹니다.
 *  - state.from 을 넘겨 두면 로그인 후 원래 가려던 화면으로 되돌릴 수 있습니다.
 */
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
