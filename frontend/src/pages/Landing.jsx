import { Link } from 'react-router-dom';
import Footer from '../components/layout/Footer';
import { GLOSSARY_COUNT } from '../constants/glossary';

/**
 * 첫 화면 (F-2)
 *
 * 고친 것
 *  1) "가입" 링크가 /register 를 가리켰는데 그런 라우트가 없어 흰 화면이 떴습니다. -> /signup
 *  2) "먼저 둘러보기"가 설문(/survey)으로 갔습니다. 지금은 로그인 없이도 모든 화면이
 *     열리므로 대시보드로 바로 보냅니다. (config/features.js 의 REQUIRE_AUTH=false)
 *  3) 아무 데도 가지 않는 자리표시 링크("주제 / 페이지 / 페이지")로 채워져 있던 푸터를
 *     공통 Footer 컴포넌트로 교체했습니다.
 */
export default function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* 배경 그라데이션 */}
        <div
          className="absolute top-[-150px] left-[-150px] z-0 h-[600px] w-[600px] rounded-full bg-brand-200 opacity-40 mix-blend-multiply blur-[120px]"
          aria-hidden="true"
        />

        <header className="relative z-10 mx-auto flex w-full max-w-page items-center justify-between px-10 py-6">
          <span className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-extrabold text-white">
              MI
            </span>
            <span className="text-base font-extrabold text-gray-900">모의투자</span>
          </span>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
            >
              로그인
            </Link>
            <Link
              to="/signup"
              className="rounded-md border border-gray-400 px-5 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              가입
            </Link>
          </div>
        </header>

        <main className="relative z-10 mx-auto flex w-full max-w-page flex-1 flex-col justify-center px-10 py-20">
          <h1 className="inline-block max-w-2xl border-b-4 border-gray-900 pb-3 text-5xl leading-tight font-extrabold text-gray-900">
            잃을 걱정 없이
            <br />
            투자를 배우는 곳
          </h1>
          <p className="mt-8 max-w-xl text-xl leading-relaxed text-gray-700">
            진짜 시세로 모의투자를 하고, 모르는 용어는 그 자리에서 바로 확인하세요.
          </p>

          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Link
              to="/dashboard"
              className="rounded-lg bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              둘러보기
            </Link>
            <Link
              to="/signup"
              className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
            >
              가입하고 시작하기
            </Link>
            <Link
              to="/learn"
              className="text-sm font-bold text-gray-500 underline underline-offset-4 transition hover:text-gray-900"
            >
              투자 용어사전 {GLOSSARY_COUNT}개 보기 &gt;
            </Link>
          </div>

          <p className="mt-8 text-sm text-gray-400">
            로그인하지 않아도 모든 화면을 둘러볼 수 있어요.
          </p>
        </main>
      </div>

      <Footer />
    </div>
  );
}
