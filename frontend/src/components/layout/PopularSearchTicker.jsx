import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import MockBadge from '../common/MockBadge';
import { MOCK_SEARCH_KEYWORDS } from '../../constants/mockData';

/**
 * 헤더 인기 검색어 티커 — 한 번에 하나만, 주기적으로 위로 밀려 올라가며 교체
 *
 * (원래 이 자리에는 지수가 있었습니다. 지수는 홈 상단 시세 카드로 옮겼습니다.)
 *
 * 왜 하나만 보여 주나
 *  헤더에는 로고·검색·메뉴·로그인 버튼이 이미 들어가 있어 목록을 늘어놓으면
 *  좁은 화면에서 줄이 깨집니다. 한 칸만 쓰고 순환시키면 폭을 고정한 채
 *  8개를 모두 보여 줄 수 있습니다.
 *
 * 애니메이션
 *  나가는 항목은 위로 빠지고(ticker-out), 새 항목은 아래에서 올라옵니다(ticker-in).
 *  두 노드를 겹쳐 두고 keyframe 으로 처리합니다. 끝나는 시점은 별도 타이머 없이
 *  onAnimationEnd 로 잡습니다. (타이머가 둘이면 어긋나서 잔상이 남습니다)
 *
 *  `prefers-reduced-motion` 설정 시 index.css 의 전역 규칙이 애니메이션을 사실상 끕니다.
 *
 * 접근성
 *  주기적으로 바뀌는 값이라 스크린리더가 계속 읽으면 방해가 됩니다.
 *  aria-live 를 켜지 않고, 대신 마우스를 올리면 순환이 멈춥니다.
 *
 * 🔴 데이터는 더미입니다. 검색 로그를 쌓는 곳이 없어 실제 인기 검색어를 만들 수 없습니다.
 *    TODO(F-검색어): GET /api/search/trending — 백엔드에 테이블·집계·엔드포인트가 모두 필요
 */
const ROTATE_MS = 3000;

export default function PopularSearchTicker({ className = '' }) {
  const items = MOCK_SEARCH_KEYWORDS;

  const [cur, setCur] = useState(0);
  const [prev, setPrev] = useState(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || items.length < 2) return undefined;
    const id = setInterval(() => {
      setCur((c) => {
        setPrev(c);
        return (c + 1) % items.length;
      });
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, items.length]);

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-gray-400">
        <TrendingUp size={14} strokeWidth={2} aria-hidden="true" />
        인기 검색어
      </span>

      {/* 폭을 고정해 항목이 바뀔 때 헤더 레이아웃이 흔들리지 않게 합니다. */}
      <div
        className="relative h-7 w-40 overflow-hidden"
        aria-label="인기 검색어"
        title="마우스를 올리면 멈춰요"
      >
        {prev !== null && (
          <KeywordRow
            item={items[prev]}
            className="ticker-out"
            onAnimationEnd={() => setPrev(null)}
          />
        )}
        <KeywordRow item={items[cur]} className={prev !== null ? 'ticker-in' : ''} />
      </div>

      <MockBadge />
    </div>
  );
}

function KeywordRow({ item, className = '', ...rest }) {
  return (
    <div className={`absolute inset-0 flex items-center gap-2 ${className}`} {...rest}>
      <span className="tabular w-3 shrink-0 text-sm font-extrabold text-brand-600">
        {item.rank}
      </span>
      <span className="truncate text-sm font-medium text-gray-700">{item.keyword}</span>
      <RankDelta delta={item.delta} />
    </div>
  );
}

/** 순위 변동 — 상승은 빨강, 하락은 파랑, 유지는 회색 (한국 증시 관례와 동일) */
function RankDelta({ delta }) {
  if (delta === null) {
    return <span className="shrink-0 text-[10px] font-bold text-up-600">NEW</span>;
  }
  if (delta === 0) {
    return (
      <span className="shrink-0 text-[10px] text-gray-300" aria-label="변동 없음">
        –
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span className={`tabular shrink-0 text-[10px] ${up ? 'text-up-600' : 'text-down-600'}`}>
      {up ? '▲' : '▼'} {Math.abs(delta)}
    </span>
  );
}
