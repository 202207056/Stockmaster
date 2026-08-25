import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import { CATEGORIES, getTerm } from '../../constants/glossary';

/**
 * 용어 도움말 아이콘 (F-9) ★
 *
 * 사용법 — 어려운 용어 옆에 한 줄씩 붙입니다.
 *   <label>지정가 <HelpIcon termId="limit_order" /></label>
 *   <span>평균단가 <HelpIcon termId="avg_price" /></span>
 *
 * Doc/13 §9 예제에서 보강한 부분
 *  - 키보드로 열고 닫힘 (ESC), aria-expanded 로 상태를 스크린리더에 알림
 *  - 화면 오른쪽 끝에서 팝오버가 잘리지 않도록 좌우 정렬을 자동으로 뒤집음
 *  - 연관 용어를 눌러 팝오버 안에서 바로 이동 (뒤로가기 지원)
 */
export default function HelpIcon({ termId, className = '', label }) {
  const [open, setOpen] = useState(false);
  const [stack, setStack] = useState([termId]);
  const [alignRight, setAlignRight] = useState(false);

  const wrapRef = useRef(null);
  const popoverId = useId();

  const activeId = stack[stack.length - 1];
  const term = getTerm(activeId);

  const close = useCallback(() => {
    setOpen(false);
    setStack([termId]);
  }, [termId]);

  /* 바깥 클릭 · ESC 로 닫기 */
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) close();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  /* 오른쪽 여백이 부족하면 팝오버를 오른쪽 정렬로 뒤집습니다. */
  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;
    const { left } = wrapRef.current.getBoundingClientRect();
    setAlignRight(left + 320 > window.innerWidth);
  }, [open]);

  // 용어집에 없는 id 를 넘기면 조용히 아무것도 렌더링하지 않습니다.
  // (화면이 깨지는 것보다 낫고, 개발 중에는 콘솔로 알려 줍니다.)
  if (!term) {
    if (import.meta.env.DEV) {
      console.warn(`[HelpIcon] 용어집에 없는 termId: "${termId}"`);
    }
    return null;
  }

  const root = getTerm(termId);

  return (
    <span ref={wrapRef} className={`relative inline-block align-middle ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label ?? `${root.term} 설명 보기`}
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] leading-none font-bold transition ${
          open
            ? 'border-brand-600 bg-brand-600 text-white'
            : 'border-gray-300 text-gray-400 hover:border-brand-500 hover:text-brand-600'
        }`}
      >
        ?
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label={`${term.term} 설명`}
          className={`absolute top-6 z-50 w-72 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-xl ${
            alignRight ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              {stack.length > 1 && (
                <button
                  type="button"
                  onClick={() => setStack((s) => s.slice(0, -1))}
                  className="mb-1 flex items-center gap-0.5 text-xs font-medium text-gray-400 hover:text-gray-700"
                >
                  <ChevronLeft size={12} strokeWidth={2} aria-hidden="true" />
                  뒤로
                </button>
              )}
              <h4 className="text-sm font-extrabold text-gray-900">{term.term}</h4>
              {term.category && (
                <span className="mt-1 inline-block rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                  {CATEGORIES[term.category]}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="설명 닫기"
              className="-mt-1 -mr-1 rounded p-1 text-gray-300 hover:text-gray-600"
            >
              <X size={14} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          <p className="mt-2 text-sm leading-relaxed font-normal text-gray-600">{term.desc}</p>

          {term.example && (
            <p className="mt-2 rounded-lg bg-gray-50 p-2 text-xs leading-relaxed text-gray-500">
              예: {term.example}
            </p>
          )}

          {term.related?.length > 0 && (
            <div className="mt-3 border-t border-gray-100 pt-2">
              <span className="text-[10px] font-bold text-gray-400">함께 보면 좋아요</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {term.related.map((rid) => {
                  const r = getTerm(rid);
                  if (!r) return null;
                  return (
                    <button
                      key={rid}
                      type="button"
                      onClick={() => setStack((s) => [...s, rid])}
                      className="rounded-full border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 transition hover:border-brand-400 hover:text-brand-700"
                    >
                      {r.term}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </span>
  );
}
