import React from 'react';

function Trading() {
  return (
    <div className="min-h-screen bg-gray-50 flex justify-center font-sans">
      <div className="w-full max-w-[1400px] bg-white min-h-screen px-8 py-4">
        {/* 상단 간략 헤더 (필요시 공통 컴포넌트로 분리) */}
        <header className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
          <h1 className="text-xl font-bold text-gray-800">트레이딩</h1>
        </header>

        {/* 3단 분할 메인 레이아웃 */}
        <main className="flex gap-4 h-[700px]">
          {/* 왼쪽: 호가창 / 종목 리스트 영역 */}
          <div className="w-1/4 bg-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-gray-400">
            호가창 / 종목 리스트 영역
          </div>

          {/* 중앙: 주식 차트 영역 */}
          <div className="w-2/4 bg-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-gray-400">
            주식 차트 (Recharts 또는 TradingView 라이브러리 연동)
          </div>

          {/* 오른쪽: 매수/매도 주문 영역 */}
          <div className="w-1/4 bg-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-gray-400">
            매수 / 매도 주문 폼
            <p className="text-sm mt-2">POST /api/trading/orders 연동</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Trading;