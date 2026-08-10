import React from 'react';
import { useNavigate } from 'react-router-dom';

function Survey() {
  // 페이지 이동을 도와주는 React Router의 기능입니다.
  const navigate = useNavigate();

  const questions = [
    "1. 투자 경험이 있나요?",
    "2. 투자할 자금의 성격이 어떻게 되나요?",
    "3. 손실을 얼마나 감당할 수 있나요?",
    "4. 원금을 얼마나 보존하고자 하나요?",
    "5. 투자 예정기간은 어느 정도인가요?",
    "6. 투자의 목표가 무엇인가요?"
  ];

  // 제출하기 버튼을 눌렀을 때 실행되는 함수
  const handleSubmit = (e) => {
    e.preventDefault(); // 페이지가 새로고침되는 것을 막아줍니다.
    
    // 실무에서는 여기에 POST /api/ai/survey 통신 코드가 들어갑니다.
    alert("설문이 완료되었습니다! 맞춤형 대시보드로 이동합니다.");
    
    // 설문 제출 후 대시보드 화면으로 자동 이동시킵니다.
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-10 font-sans">
      <div className="w-full max-w-3xl bg-white shadow-sm relative overflow-hidden">
        
        {/* 우측 상단 보라색 그라데이션 배경 효과 */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 z-0 translate-x-1/3 -translate-y-1/3"></div>

        {/* 상단 타이틀 영역 */}
        <div className="relative z-10 px-12 pt-16 pb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 leading-snug">
            <span className="text-blue-500">사용자</span>님의<br />
            성향을 파악하고 싶어요!
          </h1>
          <p className="text-sm text-gray-600 mt-4 leading-relaxed">
            AI가 사용자님께 더 나은 맞춤형 분석을 해드리기 위한 질문이에요.<br />
            투자에 대해 잘 몰라도 괜찮아요. 설문 결과는 나중에 변경할 수 있습니다.
          </p>
        </div>

        {/* 설문 폼 영역 */}
        <div className="relative z-10 px-12 pb-16">
          <form onSubmit={handleSubmit} className="flex flex-col gap-10">
            {questions.map((q, idx) => (
              <div key={idx}>
                <h3 className="text-sm font-bold text-gray-800 mb-3">{q}</h3>
                <div className="flex flex-col gap-2">
                  
                  {/* 각 질문당 4개의 선택지 */}
                  {[1, 2, 3, 4].map((opt, optIdx) => {
                    // 시안처럼 첫 번째 문항의 첫 번째 선택지가 체크된 스타일을 임시로 보여줍니다.
                    const isSelected = idx === 0 && optIdx === 0;
                    
                    return (
                      <label 
                        key={optIdx} 
                        className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition ${
                          isSelected ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name={`question_${idx}`} 
                          defaultChecked={isSelected}
                          className="w-4 h-4 text-indigo-500 border-gray-300 focus:ring-indigo-500" 
                        />
                        <span className="text-sm text-gray-500">설문 선택지 내용이 들어갑니다.</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* 하단 제출 버튼 */}
            <div className="mt-4">
              <button
                type="submit"
                className="px-8 py-2.5 text-sm font-bold text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-50 transition"
              >
                제출하기
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

export default Survey;