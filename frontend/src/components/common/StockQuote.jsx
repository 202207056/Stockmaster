import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchStock, fetchPrice } from '../../api/data';
import { numberOrNull, quotePrice } from '../../api/normalize';
import useRemote from '../../hooks/useRemote';
import { rate, won, signTextClass } from '../../utils/format';
import { useSitePractice } from '../../contexts/site-practice';
import StockLogo from './StockLogo';

export default function StockQuote({ code, variant, stock: knownStock, onSelect }) {
  const practice = useSitePractice();
  const loader = useCallback(async (signal) => {
    const stock = knownStock || await fetchStock(code, signal);
    const quote = await fetchPrice(code, signal);
    return { stock, quote };
  }, [code, knownStock]);
  const resource = useRemote(loader, !!code && !practice, { cacheKey: JSON.stringify(['stock-quote', code]), publicCache: true });
  const quote = practice ? { ...practice.resource('quote'), change_amount: 0 } : resource.data?.quote;
  const price = quotePrice(quote);
  if (variant === 'favorites' || variant === 'trading') {
    const name = knownStock?.name || resource.data?.stock.name || (practice ? '예시전자' : null);
    const changeRate = numberOrNull(quote?.change_rate);
    const changeAmount = numberOrNull(quote?.change_amount);
    const changeClass = variant === 'trading' ? signTextClass(changeRate) : changeRate > 0 ? 'text-blue-600' : changeRate < 0 ? 'text-red-600' : 'text-gray-500';
    const nameClass = 'min-w-0 flex-1 truncate text-left text-sm font-bold text-gray-800 hover:underline';
    const label = name || (resource.loading ? '조회 중…' : '종목명 이용 불가');
    return <div className="flex w-full min-w-0 items-center gap-3">
      <StockLogo code={code} name={name || '·'} />
      {onSelect ? <button type="button" className={nameClass} title={name} onClick={onSelect}>{label}</button> : <Link className={nameClass} title={name} to={`/trading?code=${encodeURIComponent(code)}`}>{label}</Link>}
      <div className="shrink-0 text-right">
        <p className="tabular text-sm font-bold text-gray-800">{resource.loading && resource.data == null ? '시세 조회 중…' : resource.error && resource.data == null ? <button onClick={resource.reload} className="underline">조회 실패 · 재시도</button> : price === null ? '—' : variant === 'trading' ? Number(price).toLocaleString('ko-KR') : won(price)}</p>
        <p className={`tabular text-xs ${changeClass}`}>{changeRate === null ? '—' : variant === 'trading' ? `${changeAmount === null ? '—' : `${changeRate > 0 ? '+' : changeRate < 0 ? '-' : ''}${Math.round(Math.abs(changeAmount))}`}(${Math.abs(changeRate).toFixed(2)}%)` : rate(changeRate)}</p>
      </div>
    </div>;
  }
  return <div className="flex min-w-0 items-center gap-2">
    <StockLogo code={code} name={resource.data?.stock.name} />
    <div className="min-w-0">
    <Link className="font-bold text-brand-700 hover:underline" to={`/trading?code=${encodeURIComponent(code)}`}>{resource.data?.stock.name || code}</Link>
    <p className="text-xs text-gray-500">{resource.loading && resource.data == null ? '시세 조회 중…' : resource.error && resource.data == null ? <button onClick={resource.reload} className="underline">조회 실패 · 재시도</button> : price === null ? '시세 이용 불가' : won(price)}</p>
    </div>
  </div>;
}
