import { useCallback, useEffect, useRef } from 'react';
import { ChartLine } from 'lucide-react';

/** 기존 주요 시세 카드와 자동 스크롤·드래그를 유지합니다. 지표 API가 없어 값은 준비 중으로 표시합니다. */
const STEP_MS = 2500;

export default function MarketStrip() {
  // Keep the original indicator slots; the backend has no indicator endpoint yet.
  const items = ['코스피', '코스닥', '나스닥', 'S&P 500', '금', '달러'].map((name) => ({ name }));

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
      className="mr-4 flex h-36 w-72 shrink-0 items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-5"
      {...rest}
    >
      <div className="flex min-w-0 flex-col justify-between self-stretch">
        <span className="truncate text-sm font-bold text-gray-800">{item.name}</span>
        <div>
          <div className="tabular text-2xl font-extrabold text-gray-500">
            —
          </div>
          <div className="tabular mt-1 text-xs font-medium text-gray-400">
            준비 중
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
