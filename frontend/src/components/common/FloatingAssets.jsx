import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { GripVertical, RefreshCw, Wallet, X } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import useRemote from '../../hooks/useRemote';
import useMiniAssetsSetting from '../../hooks/useMiniAssetsSetting';
import { fetchValuedPortfolio } from '../../api/data';
import { numberOrNull, portfolioTotals, quotePrice } from '../../api/normalize';
import { rate, signTextClass, won, wonSigned } from '../../utils/format';
import StockLogo from './StockLogo';
import AccountPicker from './AccountPicker';
import './FloatingAssets.css';

const POSITION_KEY = 'stockmaster:mini-assets-position';
function initialPosition() {
  try {
    const value = JSON.parse(localStorage.getItem(POSITION_KEY));
    if (Number.isFinite(value?.x) && Number.isFinite(value?.y)) return value;
  } catch { /* Storage may be unavailable. */ }
  return { x: Math.max(8, window.innerWidth - 140), y: 180 };
}

export default function FloatingAssets() {
  const [enabled] = useMiniAssetsSetting();
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  return enabled && isAuthenticated && pathname !== '/' && !params.has('practice') ? <FloatingAssetsPanel /> : null;
}

function FloatingAssetsPanel() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const root = useRef(null);
  const trigger = useRef(null);
  const gesture = useRef(null);
  const suppressClick = useRef(false);
  const { isAuthenticated, hasCachedSession, accountId, account } = useAuth();
  const resource = useRemote(useCallback((signal) => fetchValuedPortfolio(accountId, signal), [accountId]), open && isAuthenticated && !!accountId, { keepPreviousData: true, cacheKey: JSON.stringify(['portfolio', accountId]), cachePreview: true });
  const { reload } = resource;
  const totals = portfolioTotals(resource.data);

  const clamp = useCallback((point) => {
    const rect = root.current?.getBoundingClientRect();
    return {
      x: Math.max(8, Math.min(point.x, window.innerWidth - (rect?.width ?? 120) - 8)),
      y: Math.max(8, Math.min(point.y, window.innerHeight - (rect?.height ?? 48) - 8)),
    };
  }, []);
  useLayoutEffect(() => {
    const fit = () => setPosition((previous) => {
      const next = clamp(previous);
      return next.x === previous.x && next.y === previous.y ? previous : next;
    });
    const observer = new ResizeObserver(fit);
    observer.observe(root.current);
    window.addEventListener('resize', fit);
    fit();
    return () => { observer.disconnect(); window.removeEventListener('resize', fit); };
  }, [clamp]);
  useEffect(() => {
    try { localStorage.setItem(POSITION_KEY, JSON.stringify(position)); } catch { /* Optional persistence. */ }
  }, [position]);
  useEffect(() => {
    if (!open || !isAuthenticated || !accountId) return;
    window.addEventListener('orders:changed', reload);
    const onFocus = () => {
      if (!resource.loading && (!resource.data || Date.now() - Date.parse(resource.data.fetchedAt) >= 30_000)) reload();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('orders:changed', reload);
      window.removeEventListener('focus', onFocus);
    };
  }, [open, isAuthenticated, accountId, reload, resource.loading, resource.data]);

  const startDrag = (event) => {
    if (event.button !== 0 || !event.isPrimary) return;
    suppressClick.current = false;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, position, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event) => {
    const drag = gesture.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x; const dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) > 5) drag.moved = true;
    if (drag.moved) {
      suppressClick.current = true;
      setPosition(clamp({ x: drag.position.x + dx, y: drag.position.y + dy }));
    }
  };
  const endDrag = () => { gesture.current = null; };
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const pending = resource.loading ? '조회 중…' : '—';
  const amount = (value) => value == null ? pending : won(value);
  const percentage = totals?.cost > 0 && totals?.unrealized != null ? rate(totals.unrealized / totals.cost * 100) : null;

  return <aside ref={root} className={`mini-assets ${open ? 'is-open' : ''}`} style={{ left: position.x, top: position.y }} aria-label="미니 내 자산" onKeyDown={(event) => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); close(); }
  }}>
    <div className="mini-assets-header">
      <button ref={trigger} type="button" className="mini-assets-handle" aria-expanded={open} aria-controls="mini-assets-panel"
        title="클릭하여 열기/접기 · 드래그 또는 방향키로 이동"
        onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}
        onClick={(event) => { if (event.detail !== 0 && suppressClick.current) { suppressClick.current = false; return; } setOpen((value) => !value); }}
        onKeyDown={(event) => {
          const offsets = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
          if (offsets[event.key]) { event.preventDefault(); const [dx, dy] = offsets[event.key]; setPosition((previous) => clamp({ x: previous.x + dx, y: previous.y + dy })); }
        }}>
        <Wallet size={17} /><span>내 자산</span><GripVertical size={16} className="mini-assets-grip" />
      </button>
      {open && <button type="button" className="mini-assets-close" aria-label="내 자산 접기" onClick={close}><X size={18} /></button>}
    </div>
    {open && <section id="mini-assets-panel" className="mini-assets-panel" tabIndex={0} aria-label="내 자산 정보 스크롤 영역">
      {!isAuthenticated && !hasCachedSession ? <div className="mini-assets-message"><Wallet size={28} /><p>로그인하고 내 자산을 확인하세요.</p><Link to="/login">로그인하기</Link></div> : <>
        <div className="mini-assets-account"><AccountPicker /></div>
        {!accountId ? <p className="mini-assets-message">계좌를 선택해 주세요.</p> : <>
          <div className="mini-assets-summary" aria-busy={resource.loading}>
            <section className="mini-assets-card"><h2>총 자산 <span>({account?.account_name || '선택 계좌'})</span></h2><strong className="mini-assets-total">{amount(totals?.total)}</strong><div className="mini-assets-cash"><span>주문가능금액 · 원화</span><b>{amount(totals?.cash)}</b></div></section>
            <section className="mini-assets-card"><h2>내 투자 <span>평가금액</span></h2><strong className="mini-assets-total">{amount(totals?.market)}</strong><p className="mini-assets-cost">매입금액 {amount(totals?.cost)}</p><p className={`mini-assets-profit ${signTextClass(totals?.unrealized)}`}>평가손익 {totals?.unrealized == null ? pending : wonSigned(totals.unrealized)}{percentage && ` (${percentage})`}</p></section>
          </div>
          <div className="mini-assets-list-heading"><h2>보유종목 <span>{resource.data?.holdings.length ?? '—'}</span></h2><div className="mini-assets-currency" aria-label="표시 통화"><button type="button" aria-pressed="true">원</button><button type="button" disabled title="달러 환산에 필요한 환율 정보가 제공되지 않습니다">달러</button></div></div>
          <div className="mini-assets-holdings" aria-label="보유종목 목록" aria-busy={resource.loading}>
            {resource.data?.holdings.length === 0 && <div className="mini-assets-message"><p>보유한 종목이 없어요.</p><Link to="/trading">종목 둘러보기</Link></div>}
            {resource.data?.holdings.map((holding) => {
              const quantity = numberOrNull(holding.hold_quantity);
              const average = numberOrNull(holding.avg_price);
              const price = quotePrice(holding.quote);
              const market = price != null && quantity != null ? price * quantity : null;
              const pnl = market != null && average != null ? market - average * quantity : null;
              const percent = pnl != null && average > 0 && quantity > 0 ? rate(pnl / (average * quantity) * 100, 1) : null;
              const name = holding.security_name || holding.symbol_code;
              return <Link key={holding.portfolio_id ?? holding.symbol_code} to={`/trading?code=${encodeURIComponent(holding.symbol_code)}`} className="mini-assets-holding"><StockLogo code={holding.symbol_code} name={name} className="h-9 w-9" /><div className="mini-assets-stock"><b>{name}</b><span>{quantity == null ? '수량 미제공' : `${quantity.toLocaleString('ko-KR')}주`}</span></div><div className="mini-assets-value"><b>{market == null ? '시세 미제공' : won(market)}</b><span className={signTextClass(pnl)}>{pnl == null ? '손익 미제공' : wonSigned(pnl)}{percent && ` (${percent})`}</span></div></Link>;
            })}
          </div>
          <footer className="mini-assets-footer"><span>{resource.data ? `${new Date(resource.data.fetchedAt).toLocaleTimeString('ko-KR')} 조회` : '조회 시점의 평가액'} · 원화 기준</span><button type="button" aria-label="자산 새로고침" disabled={resource.loading} onClick={reload}><RefreshCw size={14} /></button><Link to="/assets">전체 보기</Link></footer>
        </>}
      </>}
    </section>}
  </aside>;
}
