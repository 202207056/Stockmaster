import { comma } from '../../utils/format';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { fetchPopularStocks } from '../../api/data';
import useRemote from '../../hooks/useRemote';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import RankingRow from './PopularStockRow';

export default function PopularStocks() {
  const resource = useRemote(useCallback(signal => fetchPopularStocks(signal), []), true, { cacheKey: 'popular-stocks', publicCache: true });
  useAutoRefresh(resource, 60_000);
  const rows = resource.data || [];
  const status = resource.loading ? 'loading' : resource.error ? 'error' : 'ready';
  const [position, setPosition] = useState({ index: 0, previous: null });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || rows.length < 2) return;
    const timer = setInterval(() => setPosition(value => ({
      index: (value.index + 1) % rows.length, previous: value.index % rows.length,
    })), 4000);
    return () => clearInterval(timer);
  }, [paused, rows.length]);

  const stock = rows[position.index % rows.length];
  const previous = position.previous === null ? null : rows[position.previous];
  return <div className="flex min-w-0 items-center gap-2 text-xs sm:text-sm"
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
    <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-gray-500" title="네이버 증권 인기 검색 종목 기준">
      <TrendingUp size={14} aria-hidden="true" /><span>인기 검색어</span>
    </span>
    {stock ? <Link className="relative h-9 min-w-0 flex-1 overflow-hidden rounded px-1 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600"
      to={`/trading?${new URLSearchParams({ code: stock.symbol_code })}`}
      aria-label={`${stock.rank}위 ${stock.name}${Number.isFinite(stock.change_rate) ? `, 등락률 ${stock.change_rate > 0 ? '+' : ''}${comma(stock.change_rate, 2)}%` : ''}`}
      title={`${stock.rank}위 · ${stock.name}`}>
      {previous && <span key={`out-${stock.symbol_code}`} aria-hidden="true" className="ticker-out pointer-events-none absolute inset-0 flex items-center gap-1 px-1">
        <RankingRow stock={previous} compact />
      </span>}
      <span key={stock.symbol_code} className={`absolute inset-0 flex items-center gap-1 px-1 ${previous ? 'ticker-in' : ''}`}>
        <RankingRow stock={stock} compact />
      </span>
    </Link> : <span className="text-xs text-gray-400" role="status">{status === 'loading' ? '불러오는 중…' : status === 'error' ? '조회 불가' : '검색 순위 없음'}</span>}
  </div>;
}
