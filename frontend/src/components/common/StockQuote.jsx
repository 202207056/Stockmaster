import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchStock, fetchPrice } from '../../api/data';
import { numberOrNull, quotePrice } from '../../api/normalize';
import useRemote from '../../hooks/useRemote';
import { rate, won } from '../../utils/format';
import StockLogo from './StockLogo';

export default function StockQuote({ code, variant }) {
  const loader = useCallback(async (signal) => {
    const stock = await fetchStock(code, signal);
    const quote = await fetchPrice(code, signal);
    return { stock, quote };
  }, [code]);
  const resource = useRemote(loader, !!code, { cacheKey: JSON.stringify(['stock-quote', code]), publicCache: true });
  const price = quotePrice(resource.data?.quote);
  if (variant === 'favorites') {
    const name = resource.data?.stock.name;
    const changeRate = numberOrNull(resource.data?.quote.change_rate);
    const changeClass = changeRate > 0 ? 'text-blue-600' : changeRate < 0 ? 'text-red-600' : 'text-gray-500';
    return <div className="flex w-full min-w-0 items-center gap-3">
      <StockLogo code={code} name={name || '·'} />
      <Link className="min-w-0 flex-1 truncate text-left text-sm font-bold text-gray-800 hover:underline" title={name} to={`/trading?code=${encodeURIComponent(code)}`}>
        {name || (resource.loading ? '조회 중…' : '종목명 이용 불가')}
      </Link>
      <div className="shrink-0 text-right">
        <p className="tabular text-sm font-bold text-gray-800">{resource.loading && resource.data == null ? '시세 조회 중…' : resource.error && resource.data == null ? <button onClick={resource.reload} className="underline">조회 실패 · 재시도</button> : price === null ? '—' : won(price)}</p>
        <p className={`tabular text-xs ${changeClass}`}>{changeRate === null ? '—' : rate(changeRate)}</p>
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
