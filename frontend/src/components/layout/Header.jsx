import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import Nav from './Nav';
import StockSearch from '../common/StockSearch';
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
    <header className="app-header relative z-30 border-b border-gray-200 bg-white/95 backdrop-blur md:sticky md:top-0">
      <div className="mx-auto flex w-full max-w-page items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-5">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-extrabold text-white">
              MI
            </span>
            <span className="hidden text-base font-extrabold text-gray-900 sm:inline">프로젝트</span>
          </Link>

          <div className="hidden md:block"><StockSearch /></div>

          {/* 인기 검색어 — 하나씩 순환 */}
          <div className="hidden items-center gap-2 2xl:flex">
            <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-gray-400">
              <TrendingUp size={14} strokeWidth={2} aria-hidden="true" />
              인기 검색어
            </span>
            <div className="relative flex h-7 w-40 items-center overflow-hidden text-sm text-gray-400" aria-label="인기 검색어">준비 중</div>
          </div>
        </div>

        <Nav className="hidden xl:flex" />

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/mypage"
                className="max-w-20 truncate py-3 text-sm font-medium text-gray-700 hover:text-gray-900 sm:max-w-28"
              >
                {user?.user_name ?? '내 정보'}님
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="min-h-11 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="py-3 text-sm font-medium text-gray-600 transition hover:text-gray-900"
              >
                로그인
              </Link>
              <Link
                to="/signup"
                className="flex min-h-11 items-center rounded-md bg-brand-600 px-4 py-1.5 text-sm font-bold text-white transition hover:bg-brand-700"
              >
                가입
              </Link>
            </>
          )}
        </div>
      </div>

      {/* 좁은 화면에서는 메뉴를 아래줄로 내려 가로 스크롤로 봅니다. */}
      <div className="border-t border-gray-100 xl:hidden">
        <Nav className="mobile-nav mx-auto w-full max-w-page overflow-x-auto px-2 py-2 sm:px-8 sm:py-3" />
      </div>
      <div className="px-4 pb-3 md:hidden"><StockSearch /></div>
    </header>
  );
}
