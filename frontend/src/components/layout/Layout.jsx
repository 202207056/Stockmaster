import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

/**
 * 공통 레이아웃 (F-5)
 *
 * 라우터의 레이아웃 라우트로 씁니다. 헤더/네비/푸터가 여기 한 곳에만 정의되고,
 * 각 페이지는 본문만 그립니다. (기존에는 Dashboard 안에만 헤더가 있어서
 * 다른 화면으로 이동하면 메뉴가 사라졌습니다.)
 */
export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-white"
      >
        본문 바로가기
      </a>

      <Header />

      <main id="main" className="mx-auto w-full max-w-page flex-1 px-8 py-8">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
