import { Link, useNavigate } from 'react-router-dom';
import Nav from './Nav';
import useAuth from '../../hooks/useAuth';

/**
 * 공통 헤더 (F-5)
 *
 * 설계 판단 두 가지:
 *
 * 1) 코스피/코스닥 지수 표시를 뺐습니다.
 *    지수 API 가 없어서 기존 코드는 "8,096.93 +612.52(8.1%)" 를 하드코딩해 두었는데,
 *    시연 중에 이 숫자를 실제 지수로 오해하기 쉽습니다. 가짜 숫자를 띄우느니
 *    없는 편이 낫다고 보고 제거했습니다. (Doc/13 §6)
 *
 * 2) 검색창은 남기되 비활성 상태입니다.
 *    GET /api/stocks 연동(F-12)이 아직이라 지금 눌러도 갈 곳이 없습니다.
 *    자리를 비우면 레이아웃이 흔들리므로 "준비 중"으로 표시만 해 둡니다.
 */
export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-page items-center justify-between gap-6 px-8 py-3">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-extrabold text-white">
              MI
            </span>
            <span className="hidden text-base font-extrabold text-gray-900 sm:inline">모의투자</span>
          </Link>

          {/* TODO(F-12): /api/stocks 연동 후 활성화 */}
          <div className="relative hidden md:block">
            <input
              type="search"
              disabled
              placeholder="종목 검색 (준비 중)"
              aria-label="종목 검색 (준비 중)"
              title="종목 검색은 곧 열립니다"
              className="w-56 cursor-not-allowed rounded-md border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-400 placeholder:text-gray-400"
            />
            <span className="absolute top-2 right-3 text-gray-300" aria-hidden="true">
              🔍
            </span>
          </div>
        </div>

        <Nav className="hidden lg:flex" />

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/mypage"
                className="hidden text-sm font-medium text-gray-700 hover:text-gray-900 sm:inline"
              >
                {user?.user_name ?? '내 정보'}님
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
              >
                로그인
              </Link>
              <Link
                to="/signup"
                className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-brand-700"
              >
                가입
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 좁은 화면에서는 메뉴를 아래줄로 내려 가로 스크롤로 봅니다. */}
      <div className="border-t border-gray-100 lg:hidden">
        <Nav className="mx-auto w-full max-w-page overflow-x-auto px-8 py-2" />
      </div>
    </header>
  );
}
