import { Link } from 'react-router-dom';
import { ChartCandlestick, ClipboardList, Target } from 'lucide-react';
import Footer from '../components/layout/Footer';

/**
 * 첫 화면
 *
 * 변경 이력
 *  - "가입" 링크가 존재하지 않는 /register 를 가리켜 흰 화면이 뜨던 것 수정 → /signup
 *  - 주 버튼을 "가입하고 시작하기"(파란 배경)로 두고, "둘러보기"를 보조 버튼으로 배치
 *  - 용어사전 바로가기 링크와 "로그인 없이 둘러볼 수 있어요" 문구는 제거
 *  - 카피 전면 교체 (Doc/17 §12-4)
 *  - 특징 카드의 이모지를 lucide 선 아이콘으로 교체
 */
const FEATURES = [
  {
    Icon: ChartCandlestick,
    title: '실전처럼 투자하기',
    desc: '한국투자증권 시세를 그대로 반영해 코스피 대표 종목을 사고팔아 보세요. 수익과 손실은 가상으로, 투자 경험은 실제처럼 쌓을 수 있어요.',
  },
  {
    Icon: ClipboardList,
    title: '내 투자 돌아보기',
    desc: '내가 어떤 종목을 사고팔았는지, 수익률은 어땠는지 한눈에 확인해 보세요. 투자 기록을 돌아보며 나만의 투자 습관을 만들어갈 수 있어요.',
  },
  {
    Icon: Target,
    title: '나에게 맞는 투자 시작',
    desc: '간단한 투자성향 진단을 통해 나에게 맞는 투자 방식과 학습 방향을 확인해 보세요. 처음 시작하는 투자도 내 성향에 맞춰 차근차근 배울 수 있어요.',
  },
];

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
            <span className="text-base font-extrabold text-gray-900">프로젝트</span>
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

        <main className="relative z-10 mx-auto flex w-full max-w-page flex-1 flex-col px-10 pb-16">
          {/* 부제가 화면 세로 한가운데에 오도록 위쪽 여백을 잡습니다.
              빼는 값 두 가지
                5.25rem — 이 화면 헤더 높이 (py-6 + 로고 h-9 = 84px)
                3rem    — 제목 밑줄에서 부제 한가운데까지
                          (mt-8 32px + 한 줄 높이의 절반 약 16px)
              이 블록은 justify-end 라 블록 하단 = 제목 밑줄 위치입니다. */}
          <div className="flex min-h-[calc(50vh-8.25rem)] flex-col justify-end">
            <p className="text-sm font-bold text-brand-600">투자, 배우면서 시작하세요</p>

            <h1 className="mt-4 inline-block max-w-3xl border-b-4 border-gray-900 pb-3 text-5xl leading-tight font-extrabold text-gray-900">
              (가제)모의투자 프로젝트
            </h1>
          </div>

          {/* max-w 를 두지 않아 넓은 화면에서는 한 줄로 나옵니다.
              (화면이 좁아지면 자연스럽게 줄바꿈됩니다) */}
          <p className="mt-8 text-xl leading-relaxed text-gray-700">
            실제 증권 시세와 연동된 모의투자로 투자 감각을 익히고, 맞춤형 투자 학습을 경험해 보세요.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              to="/signup"
              className="rounded-lg bg-brand-600 px-7 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              가입하고 시작하기
            </Link>
            <Link
              to="/dashboard"
              className="rounded-lg border border-gray-300 px-7 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
            >
              둘러보기
            </Link>
          </div>

          {/* 특징 3가지 — 첫 화면이 비어 보이지 않도록 채우면서 서비스 설명도 겸합니다 */}
          <ul className="mt-20 grid gap-6 md:grid-cols-3">
            {FEATURES.map(({ Icon, title, desc }) => (
              <li key={title} className="rounded-2xl border border-gray-200 p-6">
                <Icon size={24} strokeWidth={1.5} aria-hidden="true" className="text-gray-400" />
                <h2 className="mt-3 text-base font-extrabold text-gray-900">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{desc}</p>
              </li>
            ))}
          </ul>
        </main>
      </div>

      <Footer />
    </div>
  );
}
