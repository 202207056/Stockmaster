import React from 'react';

function Assets() {
  return (
    <div className="min-h-screen bg-gray-50 flex justify-center font-sans">
      <div className="w-full max-w-[1200px] bg-white min-h-screen px-8 py-4">
        <header className="flex items-center justify-between pb-4 border-b border-gray-200 mb-10">
          <h1 className="text-xl font-bold text-gray-800">내 자산</h1>
        </header>

        <main className="max-w-3xl mx-auto flex flex-col gap-12">
          {/* 총 자산 영역 */}
          <section>
            <h2 className="text-lg font-bold text-gray-700">내 자산</h2>
            <div className="text-4xl font-extrabold text-gray-900 mt-2 mb-6">22,616,925원</div>
            <div className="flex gap-4">
              <div className="flex-1 bg-gray-50 rounded-lg p-6 border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">원화</div>
                <div className="text-xl font-bold text-gray-800">15,000,000원</div>
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg p-6 border border-gray-100 flex justify-between items-end">
                <div>
                  <div className="text-sm text-gray-500 mb-1">달러</div>
                  <div className="text-xl font-bold text-gray-800">$5,000</div>
                </div>
                <div className="text-sm text-gray-400">7,614,925원</div>
              </div>
            </div>
          </section>

          {/* 투자 수익 영역 */}
          <section>
            <h2 className="text-lg font-bold text-gray-700">내 투자</h2>
            <div className="text-3xl font-extrabold text-gray-900 mt-2 mb-6">12,616,925원</div>
            <div className="flex justify-between items-center border-t border-gray-100 pt-6">
              <div className="flex flex-col gap-4 text-sm font-medium text-gray-600">
                <div className="flex justify-between w-48"><span className="text-gray-400">원금</span> <span>- 원</span></div>
                <div className="flex justify-between w-48"><span className="text-gray-400">총 수익</span> <span className="text-red-500">+ - 원</span></div>
                <div className="flex justify-between w-48"><span className="text-gray-400">일간 수익</span> <span className="text-red-500">+ - 원</span></div>
              </div>
              {/* 파이 차트 들어갈 자리 */}
              <div className="w-32 h-32 bg-black rounded-full flex items-center justify-center text-white text-xs">
                차트 삽입
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Assets;