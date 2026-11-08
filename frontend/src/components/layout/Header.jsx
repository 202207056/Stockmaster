import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { UserRound, LogIn, LogOut, UserPlus } from 'lucide-react';
import Modal from '../common/Modal';
import PopularStocks from '../common/PopularStocks';
import Nav from './Nav';
import StockSearch from '../common/StockSearch';
import useAuth from '../../hooks/useAuth';

/** 공통 헤더. 검색어를 거래 화면에 전달하고 인증 상태를 표시합니다. */
export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);

  const handleLogout = () => {
    setAccountOpen(false);
    logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="app-header relative z-30 border-b border-gray-200 bg-white/95 backdrop-blur md:sticky md:top-0">
      <div className="mx-auto flex w-full max-w-page flex-nowrap items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-5">
        <div className="flex min-w-0 flex-1 items-center gap-3 md:flex-none md:gap-4">
          <Link to="/dashboard" aria-label="홈" className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-extrabold text-white">
              MI
            </span>
            <span className="hidden text-base font-extrabold text-gray-900 sm:inline">프로젝트</span>
          </Link>

          <div className="min-w-0 flex-1 md:flex-none"><StockSearch /></div>

          <div className="hidden w-[244px] shrink-0 2xl:block"><PopularStocks /></div>
        </div>

        <Nav className="hidden xl:flex" />

        <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 md:hidden"
          aria-label={isAuthenticated ? '회원정보 메뉴' : '로그인 및 회원가입 메뉴'} aria-haspopup="dialog" aria-expanded={accountOpen} onClick={() => setAccountOpen(true)}>
          <UserRound size={22} strokeWidth={1.75} aria-hidden="true" />
        </button>

        <div className="hidden min-w-0 items-center gap-2 md:flex sm:gap-3">
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

      <Modal open={accountOpen} onClose={() => setAccountOpen(false)} title={isAuthenticated ? '회원정보' : '로그인 · 회원가입'} size="sm">
        {isAuthenticated && <p className="mb-3 break-words text-base font-bold text-gray-900">{user?.user_name ?? '회원'}님</p>}
        <nav className="mobile-menu-list" aria-label="회원 메뉴">
          {isAuthenticated ? <>
            <Link to="/mypage" onClick={() => setAccountOpen(false)}><UserRound size={20} aria-hidden="true" />내 정보 · 설정</Link>
            <button type="button" className="flex min-h-13 items-center gap-3.5 rounded-md px-3 py-2 text-left text-base" onClick={handleLogout}><LogOut size={20} aria-hidden="true" />로그아웃</button>
          </> : <>
            <Link to="/login" onClick={() => setAccountOpen(false)}><LogIn size={20} aria-hidden="true" />로그인</Link>
            <Link to="/signup" onClick={() => setAccountOpen(false)}><UserPlus size={20} aria-hidden="true" />회원가입</Link>
          </>}
        </nav>
      </Modal>

      {/* 태블릿은 두 번째 줄, 모바일은 Layout의 하단 메뉴를 사용합니다. */}
      <div className="hidden border-t border-gray-100 md:block xl:hidden">
        <Nav className="mobile-nav mx-auto w-full max-w-page overflow-x-auto px-2 py-2 sm:px-8 sm:py-3" />
      </div>
    </header>
  );
}
