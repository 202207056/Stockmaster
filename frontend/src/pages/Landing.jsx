import React from 'react';
import { Link } from 'react-router-dom';

function Landing() {
  return (
    <div className="min-h-screen bg-gray-50 flex justify-center font-sans">
      <div className="w-full max-w-[1200px] bg-white min-h-screen flex flex-col relative overflow-hidden shadow-sm">
        
        {/* 은은한 보라색 배경 그라데이션 효과 (Tailwind blur 활용) */}
        <div className="absolute top-[-150px] left-[-150px] w-[600px] h-[600px] bg-purple-200 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 z-0"></div>

        {/* 상단 네비게이션 (로그인, 가입) */}
        <header className="relative z-10 flex justify-end items-center py-6 px-10 gap-4">
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-black transition">
            로그인
          </Link>
          <Link to="/register" className="text-sm font-medium border border-gray-400 text-gray-700 rounded-md px-5 py-1.5 hover:bg-gray-50 transition">
            가입
          </Link>
        </header>

        {/* 메인 히어로 섹션 */}
        <main className="relative z-10 flex-1 flex flex-col justify-center px-20">
          <div>
            <h1 className="text-5xl font-extrabold text-gray-900 mb-6 inline-block border-b-4 border-black pb-2">
              프로젝트
            </h1>
            <p className="text-xl text-gray-700 mb-12">
              이곳에서 모의투자 및 맞춤형 투자학습을 경험해 보세요.
            </p>
            
            {/* 먼저 둘러보기 버튼 -> 대시보드로 이동 */}
            <Link 
              to="/survey" 
              className="text-sm font-bold text-gray-500 underline underline-offset-4 hover:text-gray-900 transition"
            >
              먼저 둘러보기 &gt;
            </Link>
          </div>
        </main>

        {/* 하단 푸터 영역 */}
        <footer className="relative z-10 border-t border-gray-100 mx-10 py-12 flex justify-between items-start">
          {/* 좌측: 로고 및 SNS 아이콘 */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-6">프로젝트</h2>
            <div className="flex gap-4 text-gray-400">
              {/* 임시 SNS 아이콘 (이모지 대체) */}
              <a href="#" className="hover:text-gray-600 text-xl">📘</a>
              <a href="#" className="hover:text-gray-600 text-xl">🔗</a>
              <a href="#" className="hover:text-gray-600 text-xl">▶️</a>
              <a href="#" className="hover:text-gray-600 text-xl">📷</a>
            </div>
          </div>

          {/* 우측: 사이트맵 링크 */}
          <div className="flex gap-16 text-sm">
            <div className="flex flex-col gap-4">
              <span className="font-bold text-gray-800 mb-2">주제</span>
              <a href="#" className="text-gray-500 hover:text-gray-900">페이지</a>
              <a href="#" className="text-gray-500 hover:text-gray-900">페이지</a>
              <a href="#" className="text-gray-500 hover:text-gray-900">페이지</a>
            </div>
            <div className="flex flex-col gap-4">
              <span className="font-bold text-gray-800 mb-2">주제</span>
              <a href="#" className="text-gray-500 hover:text-gray-900">페이지</a>
              <a href="#" className="text-gray-500 hover:text-gray-900">페이지</a>
              <a href="#" className="text-gray-500 hover:text-gray-900">페이지</a>
            </div>
            <div className="flex flex-col gap-4">
              <span className="font-bold text-gray-800 mb-2">주제</span>
              <a href="#" className="text-gray-500 hover:text-gray-900">페이지</a>
              <a href="#" className="text-gray-500 hover:text-gray-900">페이지</a>
              <a href="#" className="text-gray-500 hover:text-gray-900">페이지</a>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}

export default Landing;