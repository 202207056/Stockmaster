import { Link, useNavigate } from 'react-router-dom';
import { Search, TrendingUp } from 'lucide-react';
import Nav from './Nav';
import useAuth from '../../hooks/useAuth';

/** 공통 헤더. 검색어를 거래 화면에 전달하고 인증 상태를 표시합니다. */
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
            <span className="hidden text-base font-extrabold text-gray-900 sm:inline">프로젝트</span>
          </Link>

          {/* 검색 결과는 거래 화면에서 조회합니다. */}
          <form className="relative hidden md:block" onSubmit={(event) => { event.preventDefault(); const query = new FormData(event.currentTarget).get('search'); navigate(`/trading?search=${encodeURIComponent(query || '')}`); }}>
            <input
              type="search"
              name="search"
              placeholder="종목명 또는 코드"
              aria-label="종목 검색"
              className="w-56 rounded-full border border-gray-300 bg-white py-2 pr-10 pl-4 text-sm text-gray-700 placeholder:text-gray-400"
            />
            <Search
              size={16}
              strokeWidth={1.75}
              aria-hidden="true"
              className="absolute top-1/2 right-3.5 -translate-y-1/2 text-gray-400"
            />
          </form>

          {/* 인기 검색어 — 하나씩 순환 */}
          <div className="hidden items-center gap-2 lg:flex">
            <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-gray-400">
              <TrendingUp size={14} strokeWidth={2} aria-hidden="true" />
              인기 검색어
            </span>
            <div className="relative flex h-7 w-40 items-center overflow-hidden text-sm text-gray-400" aria-label="인기 검색어">준비 중</div>
          </div>
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
