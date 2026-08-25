import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FAVORITES_EVENT, getFavorites } from '../utils/favorites';
import HelpIcon from '../components/learn/HelpIcon';

/**
 * 트레이딩 (Doc/13 §1, §5-3)
 *
 * 좌측 패널 변경
 * 시안은 좌측이 호가창인데 호가 API 가 없습니다. 회색 박스로 비워 두는 대신
 * 지금 동작하는 관심종목(localStorage) 목록을 넣었습니다.
 * 호가 API 가 생기면 이 자리를 호가창으로 바꾸면 됩니다.
 *
 * TODO(F-15): 중앙 — GET /api/stocks/{code}/chart 로 캔들차트 (lightweight-charts)
 * TODO(F-13): 우측 — POST /api/trading/orders 주문 폼
 *             주문 폼을 만들 때 utils/tickSize.js 의 validateOrderPrice() 를 반드시 쓰세요.
 *             백엔드가 클라이언트가 보낸 가격을 그대로 신뢰하므로, 입력 단계 방어가
 *             지금으로선 유일한 안전장치입니다. (§5-3)
 */
export default function Trading() {
  const [favorites, setFavorites] = useState(getFavorites);

  useEffect(() => {
    const sync = () => setFavorites(getFavorites());
    window.addEventListener(FAVORITES_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(FAVORITES_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-xl font-extrabold text-gray-900">트레이딩</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-4 lg:items-start">
        {/* 좌측 — 관심종목 (호가 API 가 없어 대체) */}
        <aside className="rounded-xl border border-gray-200 p-4 lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">관심종목</h2>
            <Link to="/favorites" className="text-xs text-gray-400 hover:text-gray-700">
              관리 &gt;
            </Link>
          </div>

          {favorites.length === 0 ? (
            <p className="py-8 text-center text-xs leading-relaxed text-gray-400">
              담아 둔 종목이 없어요.
              <br />
              종목을 담으면 여기에 표시됩니다.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {favorites.map((code) => (
                <li key={code} className="flex items-center justify-between py-2.5">
                  <span className="tabular rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">
                    {code}
                  </span>
                  {/* TODO(F-12): 종목명·현재가 */}
                  <span className="text-xs text-gray-300">시세 대기</span>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* 중앙 — 차트 */}
        <section className="rounded-xl border border-gray-200 p-4 lg:col-span-2">
          <h2 className="mb-3 flex items-center text-sm font-bold text-gray-700">
            차트
            <HelpIcon termId="candle" />
          </h2>
          <div className="flex h-[420px] items-center justify-center rounded-lg border border-dashed border-gray-200">
            <p className="text-center text-sm leading-relaxed text-gray-400">
              캔들차트 연동 준비 중이에요
              <br />
              <span className="text-xs text-gray-300">
                차트 API 는 현재 약 30일치만 제공됩니다
              </span>
            </p>
          </div>
        </section>

        {/* 우측 — 주문 */}
        <section className="rounded-xl border border-gray-200 p-4 lg:col-span-1">
          <h2 className="mb-3 text-sm font-bold text-gray-700">주문</h2>

          {/* 주문 폼이 붙기 전이지만, 사용자가 미리 개념을 익힐 수 있도록
              용어 도움말은 지금부터 배치해 둡니다. */}
          <ul className="flex flex-col gap-2 text-sm text-gray-500">
            {[
              { term: '매수', id: 'buy' },
              { term: '매도', id: 'sell' },
              { term: '지정가', id: 'limit_order' },
              { term: '시장가', id: 'market_order' },
              { term: '호가 단위', id: 'tick_size' },
            ].map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
              >
                <span className="flex items-center">
                  {row.term}
                  <HelpIcon termId={row.id} />
                </span>
                <span className="text-xs text-gray-300">준비 중</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs leading-relaxed text-gray-400">
            주문 기능은 곧 열려요. 그동안 용어 설명(?)을 눌러 개념을 먼저 익혀 보세요.
          </p>
        </section>
      </div>
    </div>
  );
}
