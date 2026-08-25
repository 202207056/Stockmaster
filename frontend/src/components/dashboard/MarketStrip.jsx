import { useCallback, useEffect, useRef } from 'react';
import { ChartLine } from 'lucide-react';
import MockBadge from '../common/MockBadge';
import { MOCK_INDICES } from '../../constants/mockData';
import {
  marketChange,
  marketValue,
  rateWithMark,
  signBgClass,
  signBorderClass,
  signTextClass,
} from '../../utils/format';

/**
 * 주요 시세 스트립 — 홈 상단
 *
 * 지수(코스피·코스닥·나스닥·S&P 500)와 금·환율을 카드로 늘어놓습니다.
 * 카드마다 우측에 추이 그래프가 들어갈 정사각형 자리를 잡아 두었습니다.
 *
 * 움직임 — 한 칸씩 "휙" 넘어감 + 마우스로 끌기
 *  · 2.5초마다 카드 한 장만큼 왼쪽으로 넘어갑니다. (연속으로 흐르지 않음)
 *  · `scroll-snap` 이 항상 카드 경계에 맞춰 세워 주므로 어중간하게 걸치지 않습니다.
 *  · 마우스로 좌우로 끌 수 있습니다. 끄는 동안에는 snap 을 잠시 꺼서 손을 그대로
 *    따라오게 하고, 놓으면 다시 켜서 가장 가까운 카드로 붙습니다.
 *
 * 끊김 없는 순환 — 마지막(달러) 다음에 코스피가 바로 이어집니다
 *  목록을 **두 벌** 이어 붙여 두고, 스크롤 위치가 절반을 넘어가면 그만큼 빼서
 *  첫 벌의 같은 자리로 되돌립니다. 두 벌이 완전히 같은 내용이라 눈에 보이지 않습니다.
 *  (반대로 끌어서 맨 앞을 지나면 절반을 더해 뒤쪽으로 넘깁니다)
 *
 *  ⚠️ 카드 간격을 flex 의 `gap` 이 아니라 카드의 `mr-4` 로 준 이유
 *     gap 은 마지막 카드 뒤에는 붙지 않습니다. 그러면 "절반"이 카드 경계와
 *     반 칸 어긋나 되돌리는 순간 덜컥 튑니다.
 *
 * 멈추는 경우
 *  · 마우스를 올렸을 때 (값을 읽는 중)
 *  · 끄는 중일 때
 *  · 카드 안 요소에 키보드 포커스가 있을 때
 *  · `prefers-reduced-motion` 이 켜져 있을 때 (자동 이동 안 함, 드래그는 그대로 동작)
 *
 * 🔴 값은 전부 목업입니다. TODO(F-지수): GET /api/market/indices
 *    TODO(F-지수): 정사각형 자리에 종목별 추이 스파크라인 차트를 넣습니다.
 */
const STEP_MS = 2500;

export default function MarketStrip() {
  const items = MOCK_INDICES;

  const stripRef = useRef(null);
  const pausedRef = useRef(false);
  const dragRef = useRef({ active: false, lastX: 0, moved: 0 });

  /** 카드 한 장 + 오른쪽 여백 = 한 칸 이동 거리 */
  const stepSize = useCallback(() => {
    const card = stripRef.current?.firstElementChild;
    if (!card) return 0;
    const style = window.getComputedStyle(card);
    return card.getBoundingClientRect().width + parseFloat(style.marginRight || 0);
  }, []);

  /** 두 벌 중 한 벌의 폭 */
  const halfWidth = useCallback(() => (stripRef.current?.scrollWidth ?? 0) / 2, []);

  /**
   * 스크롤 위치를 첫 벌 범위 안으로 되돌립니다.
   * 두 벌이 같은 내용이라 위치만 바뀌고 화면은 그대로입니다.
   */
  const wrap = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    const half = halfWidth();
    if (half <= 0) return;
    if (el.scrollLeft >= half) el.scrollLeft -= half;
    else if (el.scrollLeft <= 0) el.scrollLeft += half;
  }, [halfWidth]);

  /* 자동으로 한 칸씩 넘기기 */
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;

    const id = setInterval(() => {
      const el = stripRef.current;
      if (!el || pausedRef.current || dragRef.current.active) return;

      // 넘기기 직전에 위치를 되돌려 두면, 이어지는 smooth 스크롤 중에는
      // 위치를 건드리지 않아도 되어 튀지 않습니다.
      if (el.scrollLeft >= halfWidth()) el.scrollLeft -= halfWidth();
      el.scrollBy({ left: stepSize(), behavior: 'smooth' });
    }, STEP_MS);

    return () => clearInterval(id);
  }, [stepSize, halfWidth]);

  /* ---- 마우스로 끌기 ---- */
  const onPointerDown = (e) => {
    // 마우스 왼쪽 버튼 / 터치 / 펜만
    if (e.button !== 0) return;
    const el = stripRef.current;
    if (!el) return;
    dragRef.current = { active: true, lastX: e.clientX, moved: 0 };
    el.classList.add('is-dragging');
    el.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    const el = stripRef.current;
    if (!drag.active || !el) return;

    const dx = e.clientX - drag.lastX;
    drag.lastX = e.clientX;
    drag.moved += Math.abs(dx);

    // 상대 이동량으로 움직이므로 되돌림(wrap)이 일어나도 기준점이 어긋나지 않습니다.
    el.scrollLeft -= dx;
    wrap();
  };

  const endDrag = (e) => {
    const el = stripRef.current;
    if (!el || !dragRef.current.active) return;
    dragRef.current.active = false;
    el.classList.remove('is-dragging'); // snap 이 다시 켜지며 가장 가까운 카드로 붙습니다
    el.releasePointerCapture?.(e.pointerId);
  };

  return (
    <section
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
      onFocusCapture={() => {
        pausedRef.current = true;
      }}
      onBlurCapture={() => {
        pausedRef.current = false;
      }}
    >
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-800">
        주요 시세
        <MockBadge />
      </h2>

      <div
        ref={stripRef}
        className="card-strip -mx-1 px-1 py-1"
        aria-label="주요 시세"
        title="좌우로 끌어서 볼 수 있어요"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDragStart={(e) => e.preventDefault()}
      >
        {items.map((idx) => (
          <MarketCard key={idx.name} item={idx} />
        ))}
        {/* 이음매 없는 순환을 위한 두 번째 벌.
            스크린리더가 같은 내용을 두 번 읽지 않도록 숨깁니다. */}
        {items.map((idx) => (
          <MarketCard key={`dup-${idx.name}`} item={idx} aria-hidden="true" />
        ))}
      </div>
    </section>
  );
}

function MarketCard({ item, ...rest }) {
  return (
    <article
      className={`mr-4 flex h-36 w-72 shrink-0 items-center justify-between gap-4 rounded-xl border p-5 ${signBgClass(item.rate)} ${signBorderClass(item.rate)}`}
      {...rest}
    >
      <div className="flex min-w-0 flex-col justify-between self-stretch">
        <span className="truncate text-sm font-bold text-gray-800">{item.name}</span>
        <div>
          <div className={`tabular text-2xl font-extrabold ${signTextClass(item.rate)}`}>
            {marketValue(item.value, item.decimals, item.unit)}
          </div>
          <div className={`tabular mt-1 text-xs font-medium ${signTextClass(item.rate)}`}>
            {marketChange(item.change, item.decimals, item.unit)} ({rateWithMark(item.rate)})
          </div>
        </div>
      </div>

      {/* 추이 그래프가 들어갈 정사각형 자리 */}
      <div
        className="pointer-events-none flex aspect-square h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white/60"
        aria-hidden="true"
      >
        <ChartLine size={22} strokeWidth={1.5} className="text-gray-300" />
      </div>
    </article>
  );
}
