import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchStock, fetchPrice } from '../../api/data';
import { quotePrice } from '../../api/normalize';
import useRemote from '../../hooks/useRemote';
import useAuth from '../../hooks/useAuth';
import { won } from '../../utils/format';

export default function StockQuote({ code }) {
  const { isAuthenticated } = useAuth();
  const loader = useCallback(async (signal) => {
    const stock = await fetchStock(code, signal);
    const quote = await fetchPrice(code, signal);
    return { stock, quote };
  }, [code]);
  const resource = useRemote(loader, isAuthenticated);
  const price = quotePrice(resource.data?.quote);
  return <div className="min-w-0">
    <Link className="font-bold text-brand-700 hover:underline" to={`/trading?code=${encodeURIComponent(code)}`}>{resource.data?.stock.name || code}</Link>
    <p className="text-xs text-gray-500">{!isAuthenticated ? '로그인 후 시세 조회' : resource.loading ? '시세 조회 중…' : resource.error ? <button onClick={resource.reload} className="underline">조회 실패 · 재시도</button> : price === null ? '시세 이용 불가' : won(price)}</p>
  </div>;
}
