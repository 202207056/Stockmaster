import useTutorialSetting from '../hooks/useTutorialSetting';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useSiteResource from '../hooks/useSiteResource';
import { useSitePractice } from '../contexts/site-practice';
import { PracticeTarget } from '../components/learn/SitePractice';
import { fetchStocks, fetchStock, fetchPrice, fetchOrders, fetchMisu, submitOrder, cancelOrder, fetchOrderBook, checkPendingOrder } from '../api/data';
import { estimateOrderCosts } from '../utils/orderCosts';
import { fetchChartHistory } from '../api/chartHistory';
import { numberOrNull, quotePrice } from '../api/normalize';
import { won, signMark, signTextClass } from '../utils/format';
import { recordRecentStock, FAVORITES_EVENT, getFavorites } from '../utils/favorites';
import RemoteState from '../components/common/RemoteState';
import AccountPicker from '../components/common/AccountPicker';
import ChartWorkspace from '../components/common/ChartWorkspace';
import { CHART_EXAMPLE } from '../utils/chartTypes';
import { InlineError } from '../components/common/ErrorState';
import { ENABLE_ORDER_SUBMISSION, ALWAYS_SHOW_BUY_TUTORIAL } from '../config/features';
import { getToken } from '../api/client';
import FavoriteButton from '../components/common/FavoriteButton';
import GroupedFavoriteButton from '../components/common/GroupedFavoriteButton';
import StockQuote from '../components/common/StockQuote';
import StockLogo from '../components/common/StockLogo';
import StockCoach from '../components/common/StockCoach';
import StockNewsSummary from '../components/common/StockNewsSummary';
import HelpIcon from '../components/learn/HelpIcon';
import TradingLearning from '../components/learn/TradingLearning';
import OrderReflection from '../components/learn/OrderReflection';
import OrderDialog from '../components/common/OrderDialog';
import { needsBook, resolveOrderPrice, hasCompletedBuyTutorial, buyTutorialKey } from '../utils/orderTypes';
import TradingOrderForm from '../components/common/TradingOrderForm';
import BuyTutorial from './BuyTutorial';
import MisuTutorial from './MisuTutorial';
import { estimateMisu } from '../utils/misu';
import MarketDetails from '../components/common/MarketDetails';
import { learningScope } from '../utils/learning';
import './Trading.css';

export default function Trading() {
  const practice = useSitePractice();
  const [params, setParams] = useSearchParams();
  const code = params.get('code') || '';
  const search = params.get('search') || '';
  const { user, isAuthenticated, hasCachedSession } = useAuth();
  const [savedFavorites, setFavorites] = useState(getFavorites);
  const favorites = practice ? practice.favorites : savedFavorites;
  useEffect(() => {
    const sync = () => setFavorites(getFavorites());
    window.addEventListener(FAVORITES_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(FAVORITES_EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  const stocks = useSiteResource('stocks', useCallback((signal) => fetchStocks(search, signal), [search]), true, { cacheKey: JSON.stringify(['stocks', search]), publicCache: true });
  return <div className="flex flex-col gap-6">
    <div className="border-b border-gray-200 pb-4"><h1 className="text-xl font-extrabold">트레이딩</h1></div>
    <div className="grid gap-4 lg:grid-cols-4 lg:items-start">
      <aside className="trading-stock-sidebar rounded-xl border border-gray-200 p-4 lg:col-span-1">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-gray-700">관심종목</h2><Link to="/favorites" className="text-xs text-gray-400 hover:text-gray-700">관리 &gt;</Link></div>
        {favorites.length ? <ul className="mb-4 divide-y divide-gray-100">{favorites.map((favoriteCode) => <li key={favoriteCode} className="py-2.5"><StockQuote code={favoriteCode} variant="trading" onSelect={() => { const next = new URLSearchParams(params); next.set('code', favoriteCode); setParams(next); }} /></li>)}</ul> : <p className="py-8 text-center text-xs leading-relaxed text-gray-400">담아 둔 종목이 없어요.<br />종목을 담으면 여기에 표시됩니다.</p>}
    <PracticeTarget id="search"><form className="mb-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); const next = new URLSearchParams(params); const query = new FormData(event.currentTarget).get('search').trim(); next.set('search', query); setParams(next); if (query && ('예시전자 990001'.includes(query))) practice?.event('search'); }}>
      <input key={search} name="search" defaultValue={search} aria-label="종목명 또는 코드 검색" placeholder="종목명 또는 코드 검색" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2" maxLength={100} />
      <button className="rounded-lg bg-brand-600 px-5 py-2 font-bold text-white">검색</button>
    </form></PracticeTarget>
        <h2 className="mb-3 text-sm font-bold text-gray-700">종목 목록</h2>
        <div className="trading-stock-list"><RemoteState resource={stocks} requiresAuth={false} empty={!stocks.data?.length}>
          <ul className="divide-y divide-gray-100">{stocks.data?.map((stock) => <li key={stock.symbol_code}><PracticeTarget id="stock"><div className={`w-full px-2 py-3 ${stock.symbol_code === code ? 'bg-brand-50' : 'hover:bg-gray-50'}`}><StockQuote code={stock.symbol_code} stock={stock} variant="trading" onSelect={() => { const next = new URLSearchParams(params); next.set('code', stock.symbol_code); setParams(next); practice?.event('stock'); }} /></div></PracticeTarget></li>)}</ul>
          {stocks.data?.length === 100 && <p className="mt-2 text-xs text-gray-500">최대 100개입니다. 검색어를 입력해 범위를 줄여 주세요.</p>}
        </RemoteState></div>
      </aside>
      <StockPanel key={`chart:${user?.user_id ?? 'guest'}:${code}`} code={code} favorite={favorites.includes(code)} onFavoriteChange={() => practice?.toggleFavorite(code)} />
      {code && !practice && <StockNewsSummary key={`news:${user?.user_id ?? 'guest'}:${code}`} code={code} />}
      {code && !practice && <StockCoach key={`coach:${user?.user_id ?? 'guest'}:${code}`} code={code} />}
      {(isAuthenticated || hasCachedSession) && <div className="lg:col-span-4"><OrderHistory key={user?.user_id} /></div>}
    </div>
  </div>;
}

function StockPanel({ code, favorite, onFavoriteChange }) {
  const [tutorialsEnabled] = useTutorialSetting();
  const practice = useSitePractice();
  const { user, isAuthenticated, accountId, account, refresh } = useAuth();
  const [tutorialParams, setTutorialParams] = useSearchParams();
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [misuOpen, setMisuOpen] = useState(false);
  const [funding, setFunding] = useState({ accountId: null, enabled: false });
  if (funding.enabled && funding.accountId !== accountId) setFunding({ accountId: null, enabled: false });
  const misuEnabled = funding.enabled && funding.accountId === accountId;
  const misuActive = !practice && (misuOpen || tutorialParams.get('misuTour') === '1');
  const misu = useSiteResource('misu', useCallback(signal => fetchMisu(accountId, signal), [accountId]), isAuthenticated && !!accountId && !practice);
  const closeMisu = () => {
    setMisuOpen(false);
    if (tutorialParams.get('misuTour') === '1') { const next = new URLSearchParams(tutorialParams); next.delete('misuTour'); setTutorialParams(next, { replace: true }); }
  };
  const cashMode = () => setFunding({ accountId: null, enabled: false });
  const openMisu = () => {
    if (busy) return;
    if (!tutorialsEnabled) { setFunding({ accountId, enabled:true }); setKind('매수'); setPriceType('시장가'); return; }
    cashMode(); setMisuOpen(true);
  };
  useEffect(() => { window.addEventListener('orders:changed', misu.reload); return () => window.removeEventListener('orders:changed', misu.reload); }, [misu.reload]);

  const tutorialActive = !practice && !misuActive && (tutorialOpen || tutorialParams.get('practice') === 'buy');
  const tutorialDismissed = useRef(false);
  const startFirstBuy = () => {
    if (!tutorialsEnabled || misuEnabled || misuActive || practice || tutorialActive) return false;
    if (!ALWAYS_SHOW_BUY_TUTORIAL && (tutorialDismissed.current || hasCompletedBuyTutorial(buyTutorialKey(user?.user_id)))) return false;
    setTutorialOpen(true);
    return true;
  };
  const closeTutorial = () => {
    tutorialDismissed.current = true;
    setTutorialOpen(false);
    if (tutorialParams.get('practice') === 'buy') {
      const next = new URLSearchParams(tutorialParams);
      next.delete('practice');
      setTutorialParams(next, { replace: true });
    }
  };
  const detail = useSiteResource('detail', useCallback((signal) => fetchStock(code, signal), [code]), !!code, { cacheKey: JSON.stringify(['stock', code]), publicCache: true });
  const recorded = useRef(false);
  useEffect(() => {
    if (!practice && code && detail.data?.name && !recorded.current) {
      recorded.current = true;
      recordRecentStock(code);
    }
  }, [code, detail.data, practice]);
  const quote = useSiteResource('quote', useCallback((signal) => fetchPrice(code, signal), [code]), !!code, { cacheKey: JSON.stringify(['price', code]), publicCache: true });
  const chartReplay = !practice && !misuActive && tutorialParams.get('chartTour') === '1';
  const closeChartReplay = () => { const next = new URLSearchParams(tutorialParams); next.delete('chartTour'); setTutorialParams(next, { replace: true }); };
  const [chartPeriod, setChartPeriod] = useState('D');
  const chart = useSiteResource(`chart:${chartPeriod}`, useCallback((signal) => fetchChartHistory(code, chartPeriod, signal), [code, chartPeriod]), !!code, { cacheKey: JSON.stringify(['chart', code, chartPeriod]), publicCache: true });
  const chartRows = chart.data?.rows;
  const periodLabel = { D: '1일', W: '1주', M: '3개월', Y: '1년' }[chartPeriod];
  const [kind, setKind] = useState('매수');
  const [priceType, setPriceType] = useState('시장가');
  const [limitPrice, setLimitPrice] = useState('');
  const book = useSiteResource('book', useCallback(signal => fetchOrderBook(code, signal), [code]), !!code && isAuthenticated && !practice && needsBook(priceType));
  const [quantity, setQuantity] = useState('1');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [orderResult, setOrderResult] = useState(null);
  const price = quotePrice(quote.data);
  const changeRate = numberOrNull(quote.data?.change_rate);
  const changeAmount = numberOrNull(quote.data?.change_amount);
  const qty = Number(quantity);
  const validQuantity = Number.isSafeInteger(qty) && qty > 0 && qty <= 1_000_000;
  const orderPrice = resolveOrderPrice(priceType, kind, limitPrice, price, book.data);
  const costs = validQuantity ? estimateOrderCosts(kind, orderPrice, qty) : null;
  const total = costs?.gross ?? null;
  const prepare = async (event) => {
    event.preventDefault();
    if (kind === '매수' && startFirstBuy()) return;
    if (practice && practice.current?.event !== 'prepare') return;
    if (submitting.current || (!practice && !ENABLE_ORDER_SUBMISSION) || !accountId || !code || !validQuantity || uncertain) return;
    submitting.current = true; setBusy(true); setError(null); setMessage('');
    const token = getToken();
    try {
      const latest = needsBook(priceType) ? resolveOrderPrice(priceType, kind, limitPrice, price, await fetchOrderBook(code)) : priceType === '지정가' ? orderPrice : quotePrice(practice ? practice.resource('quote') : await fetchPrice(code, undefined, { cache: false }));
      if (token !== getToken()) throw new Error('로그인 계정이 바뀌어 주문을 중단했습니다.');
      if (latest === null) throw new Error('현재 시세를 확인할 수 없어 주문하지 않았습니다.');
      if (!Number.isSafeInteger(latest * qty)) throw new Error('주문 금액이 허용 범위를 넘었습니다.');
      const estimate = estimateOrderCosts(kind, latest, qty);
      if (!estimate) throw new Error('주문 가격과 금액을 확인해 주세요.');
      const margin = misuEnabled ? estimateMisu(latest, qty, Number(account?.withdrawable_cash)) : null;
      if (misuEnabled && (!margin || !misu.data?.monitor_running || Number(misu.data.debt) > 0 || Number(misu.data.pending_proceeds) > 0 || misu.data.frozen_until)) throw new Error('미수 상태를 확인하거나 남은 결제를 처리해 주세요.');
      if (misuEnabled && margin.shortfall <= 0) throw new Error('현금으로 전액 결제할 수 있어요. 현금 주문을 이용해 주세요.');
      const requiredCash = misuEnabled ? margin.required : practice ? estimate.gross : estimate.settlement;
      if (kind === '매수' && numberOrNull(account?.withdrawable_cash) !== null && requiredCash > Number(account.withdrawable_cash)) throw new Error('매수 가능 현금이 부족합니다.');
      setOrderResult(null);
      setPendingOrder({ fundingType: misuEnabled ? '미수' : '현금', margin, requestId: misuEnabled ? crypto.randomUUID() : undefined, accountId, accountName: account?.account_name, accountNumber: account?.account_number, code, name: detail.data?.name || code, kind, priceType, quantity: qty, price: latest, token });
      practice?.event('prepare');
    } catch (err) { setError(err); }
    finally { submitting.current = false; setBusy(false); }
  };
  const place = async () => {
    if (submitting.current || !pendingOrder || orderResult || uncertain || (!practice && !ENABLE_ORDER_SUBMISSION)) return;
    submitting.current = true; setBusy(true); setError(null); setMessage('');
    let sent = false;
    try {
      if (pendingOrder.token !== getToken() || pendingOrder.accountId !== accountId) throw new Error('계좌가 바뀌어 주문을 중단했습니다. 창을 닫고 주문 정보를 다시 확인해 주세요.');
      sent = true;
      const result = await (practice ? practice.submit : submitOrder)({ account_id: pendingOrder.accountId, symbol_code: pendingOrder.code, order_type: pendingOrder.kind, price_type: pendingOrder.priceType, quantity: pendingOrder.quantity, price: pendingOrder.price, funding_type: pendingOrder.fundingType || '현금', ...(pendingOrder.fundingType === '미수' ? { client_request_id: pendingOrder.requestId, misu_risk_ack: true } : {}) });
      if (!result?.order_id || !['체결', '대기'].includes(result.status) || !quotePrice({ current_price: result.price }) || !Number.isSafeInteger(Number(result.quantity)) || Number(result.quantity) <= 0) throw new Error('주문 응답을 확인할 수 없습니다. 주문내역을 확인해 주세요.');
      setOrderResult(result);
      setMessage(result.message || `주문 #${result.order_id} · ${result.status} · ${result.quantity}주 · ${won(result.price)}`);
      if (!practice) { window.dispatchEvent(new Event('orders:changed')); misu.reload(); cashMode(); }
      try { await refresh(); } catch { setMessage((value) => `${value} / 계좌 갱신에 실패했습니다. 자산 화면에서 다시 조회해 주세요.`); }
    } catch (err) {
      if (!practice && sent && (!err.response || err.response.status >= 500)) {
        setUncertain(true);
        setMessage('주문 처리 결과를 확인하지 못했습니다. 중복 주문을 피하려면 아래 주문내역을 확인해 주세요. 이 화면에서는 재전송하지 않습니다.');
        window.dispatchEvent(new Event('orders:changed'));
      }
      setError(err);
    } finally { submitting.current = false; setBusy(false); }
  };
  return <><div className="trading-workspace lg:col-span-3"><section className="trading-chart-panel rounded-xl border border-gray-200 p-4 lg:col-span-2">
    <h2 className="mb-3 flex items-center text-sm font-bold text-gray-700">차트<HelpIcon termId="candle" /></h2>
    {code && <div className="mb-5 flex flex-wrap justify-between gap-3"><div className="flex items-center gap-2"><StockLogo code={code} name={detail.data?.name} /><h3 className="text-lg font-bold">{detail.data?.name || code} <span className="text-sm font-normal text-gray-500">{code}</span></h3></div>{practice ? <FavoriteButton selected={favorite} onClick={onFavoriteChange} /> : <GroupedFavoriteButton code={code} />}</div>}
    {detail.error && <InlineError error={detail.error} />}
    {code && <RemoteState resource={quote} requiresAuth={false}>
      <div className="mb-4 flex flex-wrap items-center gap-3"><p className="text-2xl font-extrabold">{price === null ? '시세 이용 불가' : won(price)}</p><span className={`text-sm ${signTextClass(changeRate)}`} aria-label={changeRate === null ? '등락 정보 없음' : `전일 대비 ${changeRate > 0 ? '상승' : changeRate < 0 ? '하락' : '보합'}`} >{changeRate === null ? '—' : `${signMark(changeRate)} ${changeAmount === null ? '—' : Math.round(changeRate < 0 ? -Math.abs(changeAmount) : Math.abs(changeAmount))}원(${changeRate.toFixed(2)}%)`}</span><button className="text-xs text-gray-500 underline" onClick={quote.reload} aria-label="시세 새로고침" title="시세 새로고침"><RefreshCw size={16} aria-hidden="true" /></button></div>
    </RemoteState>}
    {code ? <ChartWorkspace key={String(chartReplay)} emptyContent={<RemoteState resource={chart} requiresAuth={false} empty={!chartRows?.length} />} rows={chartRows} userId={user?.user_id} periodLabel={chart.data?.displayLabel || periodLabel} period={chartPeriod} onPeriod={setChartPeriod} replay={chartReplay} onReplayClose={closeChartReplay} allowTutorial={!practice} /> : chartReplay ? <ChartWorkspace rows={CHART_EXAMPLE} userId={user?.user_id} periodLabel="학습 예시" replay onReplayClose={closeChartReplay} demo /> : <div className="flex h-[420px] items-center justify-center rounded-lg border border-dashed border-gray-200"><p className="text-center text-sm leading-relaxed text-gray-400">조회할 종목을 선택해 주세요.</p></div>}
    {chart.data?.notice && <p className="mt-2 text-xs text-gray-500">{chart.data.notice}</p>}
    <p className="mt-3 text-xs text-gray-500">제공된 기간의 데이터만 표시되며, 꺾은선은 각 기간의 종가를 연결합니다. 시세는 자동 갱신되지 않으며 기준시각을 제공받지 못해 지연 여부를 확인할 수 없습니다.</p>
  </section><section className="trading-order-panel rounded-xl border border-gray-200 p-3 lg:col-span-1">
    <h2 className="sr-only">주문</h2>
    {tutorialActive && <BuyTutorial onClose={closeTutorial} completionKey={buyTutorialKey(user?.user_id)} />}
    {misuActive && <MisuTutorial key={accountId || 'guest'} onClose={closeMisu} onEnable={isAuthenticated && !!accountId ? () => { setFunding({ accountId, enabled: true }); setKind('매수'); setPriceType('시장가'); closeMisu(); } : undefined} />}
    <div hidden={tutorialActive || misuActive}>
    {isAuthenticated && !practice ? <TradingOrderForm key={`${accountId}:${misuEnabled}`} misu={misuEnabled} onMisu={openMisu} onCash={cashMode} code={code} book={book.data} resolvedPrice={orderPrice} onFirstInteraction={startFirstBuy} kind={kind} setKind={side => { setKind(side); if (side === '매도') cashMode(); }} priceType={priceType} setPriceType={setPriceType} limitPrice={limitPrice} setLimitPrice={setLimitPrice} quantity={quantity} setQuantity={setQuantity} price={price} costs={costs} account={account} disabled={busy || uncertain} canSubmit={ENABLE_ORDER_SUBMISSION && !!accountId && total !== null && !busy && !uncertain} busy={busy} enabled={ENABLE_ORDER_SUBMISSION} onSubmit={prepare} error={error || (needsBook(priceType) ? book.error : null)} message={message} /> : isAuthenticated ? <form onSubmit={prepare} className="flex flex-col gap-3">
      <AccountPicker />
      <PracticeTarget id="order-fields"><fieldset disabled={busy || uncertain} className="flex flex-wrap gap-3"><legend className="mb-2 font-bold">모의 주문</legend><label className="text-sm">구분<select value={kind} onChange={event => setKind(event.target.value)} className="ml-2 rounded border border-gray-300 px-3 py-2"><option>매수</option><option>매도</option></select></label><label className="text-sm">수량<input type="number" min="1" max="1000000" step="1" required value={quantity} onChange={event => setQuantity(event.target.value)} className="ml-2 w-28 rounded border border-gray-300 px-3 py-2" /></label></fieldset>{practice?.current?.target === 'order-fields' && <button type="button" disabled={!validQuantity || (practice.current.event === 'buy-fields' ? kind !== '매수' : kind !== '매도' || qty > practice.account.quantity)} onClick={() => practice.event(kind === '매수' ? 'buy-fields' : 'sell-fields')} className="tutorial-action mt-3 text-sm">입력 확인</button>}</PracticeTarget>
      {!practice && !ENABLE_ORDER_SUBMISSION && <p className="text-sm text-gray-500">모의 주문은 점검 중입니다. 시세·차트와 기존 주문내역을 확인할 수 있어요.</p>}
      {!practice && <fieldset disabled={busy || uncertain} className="flex flex-col gap-3"><label className="text-sm">가격 종류<select aria-label="가격 종류" value={priceType} onChange={event => setPriceType(event.target.value)} className="ml-2 rounded border border-gray-300 px-3 py-2"><option>시장가</option><option>지정가</option></select></label>{priceType === '지정가' && <label className="text-sm">지정가 (원)<input aria-label="지정가 (원)" type="number" min="1" step="1" required value={limitPrice} onChange={event => setLimitPrice(event.target.value)} className="mt-2 w-full rounded border border-gray-300 px-3 py-2" /></label>}</fieldset>}
      <PracticeTarget id="amount"><div className="space-y-2 text-sm text-gray-600"><p>예상 거래금액: {total === null ? '—' : won(total)}</p>{practice ? <p>학습 예시에서는 수수료·세금을 제외합니다.</p> : <><p>예상 수수료: {costs ? won(costs.commission) : '—'} · 거래세: {costs ? won(costs.tax) : '—'}</p><p className="font-bold">예상 {kind === '매수' ? '출금액' : '입금액'}: {costs ? won(costs.settlement) : '—'}</p><p className="text-xs">모의 수수료 0.015% · 매도 거래세 0.18% · 원 단위 반올림</p></>}</div></PracticeTarget>
      {!practice && <p className="text-xs text-gray-500">{priceType === '지정가' ? '지정가는 대기 주문으로 접수됩니다. 자동 체결되지 않으며 현금·보유 수량을 차감하거나 예약하지 않습니다. 내역에서 취소할 수 있습니다.' : '시장가는 서버 현재가로 즉시 체결됩니다. 실제 체결가와 비용은 예상값과 다를 수 있습니다.'}</p>}
      <PracticeTarget id="place"><button disabled={(!practice && !ENABLE_ORDER_SUBMISSION) || !accountId || total === null || busy || uncertain || (!!practice && practice.current?.event !== 'prepare')} className="w-full rounded-lg bg-brand-600 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">{busy ? '주문 처리 중…' : `모의 ${kind}`}</button></PracticeTarget>
      <InlineError error={error} />{message && <p role="status" className="text-sm text-gray-700">{message} <Link to={practice ? practice.href('/assets') : '/assets'} onClick={() => practice?.event('assets')} className="underline">내 자산 보기</Link></p>}
    </form> : <p className="text-sm text-gray-400">로그인 후 주문 정보를 확인할 수 있어요.</p>}
    </div>
    {!practice && <TradingLearning symbol={code} side={kind} quantity={qty} price={price} cash={account?.withdrawable_cash} busy={busy || uncertain} />}
  </section>{!practice && <div className="trading-market-panel lg:col-span-3"><MarketDetails key={code} code={code} /></div>}</div>{pendingOrder && <OrderDialog tutorial={!!practice} instruction={practice?.current} order={pendingOrder} result={orderResult} busy={busy} uncertain={uncertain} error={error} message={message} onConfirm={place} onClose={() => { if (!busy) { setPendingOrder(null); if (practice) { if (orderResult) practice.event('closed'); else if (practice.current?.event === 'cancelled') practice.event('cancelled'); else practice.event('dismissed'); } } }} />}</>;
}

function OrderStockName({ code }) {
  const stock = useSiteResource('detail', useCallback(signal => fetchStock(code, signal), [code]), !!code, { cacheKey: JSON.stringify(['stock', code]), publicCache: true });
  return <span>{stock.data?.name || (stock.loading ? '조회 중…' : '종목명 이용 불가')}</span>;
}

function OrderHistory() {
  const practice = useSitePractice();
  const { user, accountId, isAuthenticated } = useAuth();
  const [reviewId, setReviewId] = useState(null);
  const orders = useSiteResource('orders', useCallback((signal) => fetchOrders(accountId, signal), [accountId]), isAuthenticated && !!accountId, { cacheKey: JSON.stringify(['orders', accountId]), cachePreview: true });
  const scope = learningScope(user?.user_id, accountId);
  const review = !orders.loading && !orders.error && orders.data?.find((order) => `${accountId}:${order.order_id}` === reviewId && order.status === '체결');
  return <PracticeTarget id="history"><section className="rounded-xl border border-gray-200 p-5"><div className="mb-4 flex justify-between"><h2 className="font-bold">주문내역</h2><PracticeTarget id="history-refresh"><button disabled={orders.loading || !accountId} onClick={orders.reload} className="text-sm underline" aria-label="내역 새로고침" title="내역 새로고침"><RefreshCw size={16} aria-hidden="true" /></button></PracticeTarget></div>
    {!practice && <OrderUpdates reload={orders.reload} />}
    {!accountId ? <p className="text-sm text-gray-500">계좌를 선택해 주세요.</p> : <RemoteState resource={orders} empty={!orders.data?.length}><div className="max-h-80 overflow-auto"><table className="w-full min-w-[480px] text-right text-sm"><thead><tr>{['번호', '종목', '구분', '자금 방식', '가격 종류', '수량', '주문/체결가', '수수료', '거래세', '상태', '취소', '복기'].map((label) => <th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{orders.data?.map((order) => <tr key={order.order_id} className="border-t border-gray-100"><td className="p-2">{order.order_id}</td><td className="p-2"><OrderStockName code={order.symbol_code} /></td><td className="p-2">{order.order_type}</td><td className="p-2">{order.funding_type || '현금'}</td><td className="p-2">{order.price_type || '시장가'}</td><td className="p-2">{order.quantity}</td><td className="p-2">{numberOrNull(order.price) === null ? '—' : won(order.price)}</td><td className="p-2">{won(order.commission ?? 0)}{order.status !== '체결' && ' (예상)'}</td><td className="p-2">{won(order.tax ?? 0)}{order.status !== '체결' && ' (예상)'}</td><td className="p-2">{order.status}</td><td className="p-2">{order.status === '대기' && !practice && isAuthenticated ? <div className="flex gap-2"><CheckOrderButton orderId={order.order_id} /><CancelOrderButton key={accountId} orderId={order.order_id} /></div> : '—'}</td><td className="p-2">{order.status === '체결' && !practice ? <button type="button" onClick={() => setReviewId(`${accountId}:${order.order_id}`)} className="whitespace-nowrap text-xs text-brand-700 underline">돌아보기</button> : '—'}</td></tr>)}</tbody></table></div></RemoteState>}
    {!practice && <p className="mt-3 text-xs text-gray-500">대기·취소 주문의 비용은 예상값입니다. 체결 확인을 누를 때 서버 호가로 전량 체결 가능 여부를 확인하며 중간가도 갱신됩니다. 현금·수량은 예약되지 않아 부족하면 거부됩니다. 부분 체결·대기 순서·자동 감시는 재현하지 않습니다.</p>}
    {review && <OrderReflection key={`${scope}:${review.order_id}`} scope={scope} order={review} onClose={() => setReviewId(null)} />}
  </section></PracticeTarget>;
}

// Keeps order notifications separate from the fetch lifecycle.
function OrderUpdates({ reload }) {
  useEffect(() => { window.addEventListener('orders:changed', reload); return () => window.removeEventListener('orders:changed', reload); }, [reload]);
  return null;
}

function CancelOrderButton({ orderId }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const lock = useRef(false);
  const cancel = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try { await cancelOrder(orderId); }
    catch (err) { setError(err); }
    finally { window.dispatchEvent(new Event('orders:changed')); lock.current = false; setBusy(false); }
  };
  return <><button type="button" disabled={busy} onClick={cancel} className="whitespace-nowrap text-brand-700 underline disabled:opacity-50">{busy ? '취소 중…' : '주문 취소'}</button><InlineError error={error} /></>;
}

function CheckOrderButton({ orderId }) {
  const { refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const lock = useRef(false);
  const check = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try { await checkPendingOrder(orderId); await refresh(); }
    catch (err) { setError(err); }
    finally { window.dispatchEvent(new Event('orders:changed')); lock.current = false; setBusy(false); }
  };
  return <><button type="button" disabled={busy} onClick={check} className="whitespace-nowrap text-brand-700 underline">{busy ? '확인 중…' : '체결 확인'}</button><InlineError error={error} /></>;
}
