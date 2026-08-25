import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import Nav from './Nav';
import PopularSearchTicker from './PopularSearchTicker';
import useAuth from '../../hooks/useAuth';

/**
 * 공통 헤더 (F-5)
 *
 * 인기 검색어
 *  한 칸만 쓰고 주기적으로 교체됩니다. 자세한 내용은 PopularSearchTicker.jsx 참고.
 *  (원래 이 자리에 있던 지수는 홈 상단 "주요 시세" 카드로 옮겼습니다)
 *
 * 검색창
 *  GET /api/stocks 연동(F-12)이 아직이라 지금 눌러도 갈 곳이 없습니다.
 *  자리를 비우면 F-12 때 레이아웃이 다시 흔들리므로 비활성 상태로 유지합니다.
 *  아이콘은 메뉴와 같은 lucide 선 아이콘(회색)으로 통일했습니다.
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
      <div className="mx-auto flex w-full max-w-page items-center justify-between gap-6 px-8 py-5">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-extrabold text-white">
              MI
            </span>
            <span className="hidden text-base font-extrabold text-gray-900 sm:inline">인생한방</span>
          </Link>

          {/* TODO(F-12): /api/stocks 연동 후 활성화 */}
          <div className="relative hidden md:block">
            <input
              type="search"
              disabled
              placeholder="종목 검색 (준비 중)"
              aria-label="종목 검색 (준비 중)"
              title="종목 검색은 곧 열립니다"
              className="w-56 cursor-not-allowed rounded-full border border-gray-300 bg-white py-2 pr-10 pl-4 text-sm text-gray-500 placeholder:text-gray-400"
            />
            <Search
              size={16}
              strokeWidth={1.75}
              aria-hidden="true"
              className="absolute top-1/2 right-3.5 -translate-y-1/2 text-gray-400"
            />
          </div>

          {/* 인기 검색어 — 하나씩 순환 */}
          <PopularSearchTicker className="hidden lg:flex" />
        </div>

        <Nav className="hidden lg:flex" />

        <div className="flex shrink-0 items-center gap-3">
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
        <Nav className="mx-auto w-full max-w-page overflow-x-auto px-8 py-3" />
      </div>
    </header>
  );
}
