import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useRemote from '../hooks/useRemote';
import { fetchStocks, fetchStock, fetchPrice, fetchChart, fetchOrders, submitOrder } from '../api/data';
import { numberOrNull, quotePrice } from '../api/normalize';
import { won, rateWithMark } from '../utils/format';
import { addFavorite, FAVORITES_EVENT, getFavorites } from '../utils/favorites';
import RemoteState from '../components/common/RemoteState';
import AccountPicker from '../components/common/AccountPicker';
import CandleChart from '../components/common/CandleChart';
import { InlineError } from '../components/common/ErrorState';
import { ENABLE_ORDER_SUBMISSION } from '../config/features';
import { getToken } from '../api/client';
import StockQuote from '../components/common/StockQuote';
import HelpIcon from '../components/learn/HelpIcon';

export default function Trading() {
  const [params, setParams] = useSearchParams();
  const code = params.get('code') || '';
  const search = params.get('search') || '';
  const { user, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState(getFavorites);
  useEffect(() => {
    const sync = () => setFavorites(getFavorites());
    window.addEventListener(FAVORITES_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(FAVORITES_EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  const stocks = useRemote(useCallback((signal) => fetchStocks(search, signal), [search]), isAuthenticated);
  return <div className="flex flex-col gap-6">
    <h1 className="border-b border-gray-200 pb-4 text-xl font-extrabold">트레이딩</h1>
    <div className="grid gap-4 lg:grid-cols-4 lg:items-start">
      <aside className="rounded-xl border border-gray-200 p-4 lg:col-span-1">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold text-gray-700">관심종목</h2><Link to="/favorites" className="text-xs text-gray-400 hover:text-gray-700">관리 &gt;</Link></div>
        {favorites.length ? <ul className="mb-4 divide-y divide-gray-100">{favorites.map((favoriteCode) => <li key={favoriteCode} className="py-2.5"><StockQuote code={favoriteCode} /></li>)}</ul> : <p className="py-8 text-center text-xs leading-relaxed text-gray-400">담아 둔 종목이 없어요.<br />종목을 담으면 여기에 표시됩니다.</p>}
    <form className="mb-4 flex gap-2" onSubmit={(event) => { event.preventDefault(); const next = new URLSearchParams(params); next.set('search', new FormData(event.currentTarget).get('search').trim()); setParams(next); }}>
      <input key={search} name="search" defaultValue={search} aria-label="종목명 또는 코드 검색" placeholder="종목명 또는 코드 검색" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2" maxLength={100} />
      <button className="rounded-lg bg-brand-600 px-5 py-2 font-bold text-white">검색</button>
    </form>
        <h2 className="mb-3 text-sm font-bold text-gray-700">종목 목록</h2>
        <RemoteState resource={stocks} authenticated={isAuthenticated} empty={!stocks.data?.length}>
          <ul className="max-h-[500px] overflow-y-auto divide-y divide-gray-100">{stocks.data?.map((stock) => <li key={stock.symbol_code}><button onClick={() => { const next = new URLSearchParams(params); next.set('code', stock.symbol_code); setParams(next); }} className={`w-full px-2 py-3 text-left text-sm ${stock.symbol_code === code ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-50'}`}><span className="block font-bold">{stock.name}</span><span className="text-xs text-gray-500">{stock.symbol_code}</span></button></li>)}</ul>
          {stocks.data?.length === 100 && <p className="mt-2 text-xs text-gray-500">최대 100개입니다. 검색어를 입력해 범위를 줄여 주세요.</p>}
        </RemoteState>
      </aside>
      <StockPanel key={`${user?.user_id ?? 'guest'}:${code}`} code={code} />
      {isAuthenticated && <div className="lg:col-span-4"><OrderHistory key={user?.user_id} /></div>}
    </div>
  </div>;
}

function StockPanel({ code }) {
  const { isAuthenticated, accountId, account, refresh } = useAuth();
  const detail = useRemote(useCallback((signal) => fetchStock(code, signal), [code]), isAuthenticated && !!code);
  const quote = useRemote(useCallback((signal) => fetchPrice(code, signal), [code]), isAuthenticated && !!code);
  const chart = useRemote(useCallback((signal) => fetchChart(code, signal), [code]), isAuthenticated && !!code);
  const [favorite, setFavorite] = useState(false);
  const [kind, setKind] = useState('매수');
  const [quantity, setQuantity] = useState('1');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const price = quotePrice(quote.data);
  const qty = Number(quantity);
  const validQuantity = Number.isSafeInteger(qty) && qty > 0 && qty <= 1_000_000;
  const total = price !== null && validQuantity && Number.isSafeInteger(price * qty) ? price * qty : null;
  const place = async (event) => {
    event.preventDefault();
    if (submitting.current || !ENABLE_ORDER_SUBMISSION || !accountId || !code || !validQuantity || uncertain) return;
    submitting.current = true; setBusy(true); setError(null); setMessage('');
    let sent = false;
    const token = getToken();
    try {
      const latest = quotePrice(await fetchPrice(code));
      if (token !== getToken()) throw new Error('로그인 계정이 바뀌어 주문을 중단했습니다.');
      if (latest === null) throw new Error('현재 시세를 확인할 수 없어 주문하지 않았습니다.');
      if (!Number.isSafeInteger(latest * qty)) throw new Error('주문 금액이 허용 범위를 넘었습니다.');
      if (kind === '매수' && numberOrNull(account?.withdrawable_cash) !== null && latest * qty > Number(account.withdrawable_cash)) throw new Error('조회된 주문가능금액이 부족합니다.');
      sent = true;
      const result = await submitOrder({ account_id: accountId, symbol_code: code, order_type: kind, quantity: qty, price: latest });
      setMessage(`주문 #${result.order_id} · ${result.status} · ${result.quantity}주 · ${won(result.price)}`);
      window.dispatchEvent(new Event('orders:changed'));
      try { await refresh(); } catch { setMessage((value) => `${value} / 계좌 갱신에 실패했습니다. 자산 화면에서 다시 조회해 주세요.`); }
    } catch (err) {
      if (sent && (!err.response || err.response.status >= 500)) {
        setUncertain(true);
        setMessage('주문 처리 결과를 확인하지 못했습니다. 중복 주문을 피하려면 아래 주문내역을 확인해 주세요. 이 화면에서는 재전송하지 않습니다.');
        window.dispatchEvent(new Event('orders:changed'));
      }
      setError(err);
    } finally { submitting.current = false; setBusy(false); }
  };
  return <><section className="rounded-xl border border-gray-200 p-4 lg:col-span-2">
    <h2 className="mb-3 flex items-center text-sm font-bold text-gray-700">차트<HelpIcon termId="candle" /></h2>
    {code && <div className="mb-5 flex flex-wrap justify-between gap-3"><h3 className="text-lg font-bold">{detail.data?.name || code} <span className="text-sm font-normal text-gray-500">{code}</span></h3><button onClick={() => { addFavorite(code); setFavorite(true); }} className="text-sm font-bold text-brand-700">{favorite ? '관심종목에 담았어요' : '☆ 관심종목 담기'}</button></div>}
    {detail.error && <InlineError error={detail.error} />}
    {code && <RemoteState resource={quote} authenticated={isAuthenticated}>
      <div className="mb-4 flex flex-wrap items-center gap-3"><p className="text-2xl font-extrabold">{price === null ? '시세 이용 불가' : won(price)}</p><span className="text-sm">{numberOrNull(quote.data?.change_rate) === null ? '—' : rateWithMark(quote.data.change_rate)}</span><button className="text-xs text-gray-500 underline" onClick={quote.reload}>시세 새로고침</button></div>
    </RemoteState>}
    {code ? <RemoteState resource={chart} authenticated={isAuthenticated} empty={!chart.data?.length}><CandleChart rows={chart.data} /></RemoteState> : <div className="flex h-[420px] items-center justify-center rounded-lg border border-dashed border-gray-200"><p className="text-center text-sm leading-relaxed text-gray-400">조회할 종목을 선택해 주세요.</p></div>}
    <p className="mt-3 text-xs text-gray-500">제공된 일봉만 표시합니다. 시세는 자동 갱신되지 않으며 기준시각을 제공받지 못해 지연 여부를 확인할 수 없습니다.</p>
  </section><section className="rounded-xl border border-gray-200 p-4 lg:col-span-1">
    <h2 className="mb-3 text-sm font-bold text-gray-700">주문</h2>
    {isAuthenticated ? <form onSubmit={place} className="flex flex-col gap-3">
      <AccountPicker />
      <fieldset disabled={busy || uncertain} className="flex flex-wrap gap-3"><legend className="mb-2 font-bold">모의 주문</legend><label className="text-sm">구분<select value={kind} onChange={(event) => setKind(event.target.value)} className="ml-2 rounded border border-gray-300 px-3 py-2"><option>매수</option><option>매도</option></select></label><label className="text-sm">수량<input type="number" min="1" max="1000000" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} className="ml-2 w-28 rounded border border-gray-300 px-3 py-2" /></label></fieldset>
      <p className="text-sm text-gray-600">조회 가격 기준 예상 금액: {total === null ? '—' : won(total)} · 전송 직전 가격을 다시 조회합니다.</p>
      {!ENABLE_ORDER_SUBMISSION && <p className="text-sm text-gray-500">모의 주문은 점검 중입니다. 시세·차트와 기존 주문내역을 확인할 수 있어요.</p>}
      <button disabled={!ENABLE_ORDER_SUBMISSION || !accountId || total === null || busy || uncertain} className="rounded-lg bg-brand-600 px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">{busy ? '주문 처리 중…' : `모의 ${kind}`}</button>
      <InlineError error={error} />{message && <p role="status" className="text-sm text-gray-700">{message} <Link to="/assets" className="underline">내 자산 보기</Link></p>}
    </form> : <p className="text-sm text-gray-400">로그인 후 주문 정보를 확인할 수 있어요.</p>}
  </section></>;
}

function OrderHistory() {
  const { accountId } = useAuth();
  const orders = useRemote(useCallback((signal) => fetchOrders(accountId, signal), [accountId]), !!accountId);
  return <section className="rounded-xl border border-gray-200 p-5"><div className="mb-4 flex justify-between"><h2 className="font-bold">주문내역</h2><button disabled={orders.loading || !accountId} onClick={orders.reload} className="text-sm underline">내역 새로고침</button></div>
    <OrderUpdates reload={orders.reload} />
    {!accountId ? <p className="text-sm text-gray-500">계좌를 선택해 주세요.</p> : <RemoteState resource={orders} empty={!orders.data?.length}><div className="max-h-80 overflow-auto"><table className="w-full min-w-[480px] text-right text-sm"><thead><tr>{['번호', '종목', '구분', '수량', '체결가', '상태'].map((label) => <th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{orders.data?.map((order) => <tr key={order.order_id} className="border-t border-gray-100"><td className="p-2">{order.order_id}</td><td className="p-2">{order.symbol_code}</td><td className="p-2">{order.order_type}</td><td className="p-2">{order.quantity}</td><td className="p-2">{numberOrNull(order.price) === null ? '—' : won(order.price)}</td><td className="p-2">{order.status}</td></tr>)}</tbody></table></div></RemoteState>}
  </section>;
}

// Keeps order notifications separate from the fetch lifecycle.
function OrderUpdates({ reload }) {
  useEffect(() => { window.addEventListener('orders:changed', reload); return () => window.removeEventListener('orders:changed', reload); }, [reload]);
  return null;
}
