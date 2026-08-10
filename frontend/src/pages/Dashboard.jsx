import React from 'react';

function Dashboard() {
  // 실시간 랭킹 목업 데이터 (임시 데이터)
  const rankData = [
    { id: 1, name: '삼성전자', price: '327,000원', rate: '+10.6%' },
    { id: 2, name: 'SK하이닉스', price: '2,236,000원', rate: '+17.0%' },
    { id: 3, name: 'LG전자', price: '246,500원', rate: '-8.0%', isBlue: true },
    { id: 4, name: 'NAVER', price: '254,000원', rate: '-8.9%', isBlue: true },
    { id: 5, name: '삼성전자', price: '327,000원', rate: '+10.6%' },
  ];

  return (
    /* 1. 중앙 정렬(justify-center)을 없애고 전체 화면을 쓰도록 변경했습니다. */
    <div className="min-h-screen bg-white font-sans text-gray-800">
      
      {/* 2. 가로 길이 제한(max-w-...)을 없애고 w-full로 꽉 채웠습니다. 좌우 여백(px-8)만 유지합니다. */}
      <div className="w-full bg-white min-h-screen px-8 py-4">
        
        {/* 상단 네비게이션 헤더 */}
        <header className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div className="flex items-center gap-6">
            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs font-bold text-gray-500">로고</div>
            <div className="relative">
              <input 
                type="text" 
                placeholder="종목, 키워드 검색" 
                /* 3. 다크모드 충돌 방지를 위해 배경색(bg-white)과 글자색(text-black)을 강제 지정했습니다. */
                className="border border-gray-300 bg-white text-black rounded-sm py-2 px-4 w-64 text-sm focus:outline-none focus:border-blue-500"
              />
              <span className="absolute right-3 top-2 text-gray-400">🔍</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-500 font-medium mr-2">코스피</span>
              <span className="text-red-500 font-bold">8,096.93</span>
              <span className="text-red-500 text-xs ml-1">+612.52(8.1%)</span>
            </div>
          </div>
          
          <nav className="flex gap-8 text-sm font-medium text-gray-500">
            <a href="#" className="flex flex-col items-center gap-1 hover:text-black"><span className="text-lg">🏠</span>홈</a>
            <a href="#" className="flex flex-col items-center gap-1 hover:text-black"><span className="text-lg">⭐</span>즐겨찾기</a>
            <a href="#" className="flex flex-col items-center gap-1 hover:text-black"><span className="text-lg">📈</span>트레이딩</a>
            <a href="#" className="flex flex-col items-center gap-1 hover:text-black"><span className="text-lg">💰</span>내 자산</a>
            <a href="#" className="flex flex-col items-center gap-1 hover:text-black"><span className="text-lg">👥</span>커뮤니티</a>
            <a href="#" className="flex flex-col items-center gap-1 hover:text-black"><span className="text-lg">✏️</span>학습</a>
          </nav>

          <div className="flex items-center gap-4">
            <button className="text-sm text-gray-400 hover:text-black">로그인</button>
            <button className="text-gray-400 hover:text-black">⚙️</button>
          </div>
        </header>

        {/* 메인 컨텐츠 영역 */}
        <main className="py-8 flex flex-col gap-14">
          
          {/* 상단 지수 카드 영역 */}
          <section className="grid grid-cols-4 gap-4">
             <div className="h-28 bg-red-50/50 rounded-lg p-4 border border-red-100 flex flex-col justify-between cursor-pointer">
                <span className="font-bold text-gray-800 text-sm">코스피</span>
                <div>
                  <div className="text-red-500 font-bold text-xl">8,096.93</div>
                  <div className="text-red-500 text-xs mt-1">+612.52(8.1%)</div>
                </div>
             </div>
             <div className="h-28 bg-gray-100 rounded-lg p-4 text-sm font-bold text-gray-600 cursor-pointer hover:bg-gray-200 transition">코스닥</div>
             <div className="h-28 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition"></div>
             <div className="h-28 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition"></div>
          </section>

          {/* 실시간 랭킹 영역 */}
          <section>
            {/* 4. 안 보이던 글씨들을 text-gray-800으로 명확하게 보이도록 수정했습니다. */}
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">실시간 랭킹 <span className="text-gray-400 text-sm font-normal">&gt;</span></h2>
            <div className="grid grid-cols-3 gap-10">
              {['거래대금', '급상승', '급하락'].map((title, idx) => (
                <div key={idx}>
                  <h3 className="text-sm text-gray-500 mb-2">{title} &gt;</h3>
                  <div className="border-t border-gray-400 pt-1">
                    {rankData.map((item) => (
                      <div key={`${title}-${item.id}`} className="flex items-center justify-between py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-400 w-4">{item.id}</span>
                          <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                          <span className="font-bold text-sm text-gray-700">{item.name}</span>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-bold text-gray-700">{item.price}</span>
                            <span className={`text-xs ${item.isBlue ? 'text-blue-500' : 'text-red-500'}`}>{item.rate}</span>
                          </div>
                          <span className="text-gray-300 hover:text-red-400 text-lg">♡</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 실시간 뉴스 영역 */}
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">실시간 뉴스 <span className="text-gray-400 text-sm font-normal">&gt;</span></h2>
            <div className="bg-gray-50 p-6 rounded-lg flex flex-col gap-6 border border-gray-100">
              <div className="flex gap-5 cursor-pointer hover:opacity-80">
                 <div className="w-24 h-24 bg-gray-200 rounded flex-shrink-0"></div>
                 <div className="flex flex-col justify-center gap-1.5">
                   <h3 className="font-bold text-gray-800 text-sm">'반도체 호조'에 1분기 경제성장률 1.8% ...속보치보다 0.1%p↑</h3>
                   <p className="text-sm text-gray-500 line-clamp-1">올해 1분기 한국 경제가 반도체 수출 호조 등에 힘입어 큰 폭으로 성장했다. 9일 한국은행...</p>
                   <span className="text-xs text-gray-400 mt-1">노컷뉴스</span>
                 </div>
              </div>
              <div className="flex gap-5 cursor-pointer hover:opacity-80">
                 <div className="w-24 h-24 bg-gray-200 rounded flex-shrink-0"></div>
                 <div className="flex flex-col justify-center gap-1.5">
                   <h3 className="font-bold text-gray-800 text-sm">"삼성 DNA 송두리째 바꾼다"...이재용 'AI 대전환' 선포</h3>
                   <p className="text-sm text-gray-500 line-clamp-1">삼성이 전 관계사의 모든 업무에 외부 인공지능(AI)을 전면 도입한다. 삼성이 전사적으로...</p>
                   <span className="text-xs text-gray-400 mt-1">디지털타임스</span>
                 </div>
              </div>
            </div>
            <button className="mt-4 text-sm font-bold text-gray-700 flex items-center gap-1 hover:text-blue-600 transition">
              <span className="text-blue-500 text-base">✨</span> 오늘의 AI 뉴스 리포트 보기 &gt;
            </button>
          </section>
          
          {/* 커뮤니티 영역 */}
          <section className="mb-20">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">커뮤니티 <span className="text-gray-400 text-sm font-normal">&gt;</span></h2>
            <div className="border-t border-gray-400 pt-1">
              <div className="py-3 border-b border-gray-100 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">가치투자 같이 하실 분 구합니다~</div>
              <div className="py-3 border-b border-gray-100 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">삼성전자 지금 매수 타이밍인가요? AI 분석 결과 공유합니다.</div>
              <div className="py-3 border-b border-gray-100 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer">오늘 코스피 왜 이렇게 떨어지나요 ㅠㅠ</div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}

export default Dashboard;