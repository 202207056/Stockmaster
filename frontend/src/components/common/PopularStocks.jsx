import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { fetchPopularStocks } from '../../api/data';

export default function PopularStocks() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let timer;
    const refresh = async () => {
      try {
        const data = await fetchPopularStocks(controller.signal);
        if (controller.signal.aborted) return;
        setRows(data);
        setStatus(data.length ? 'ready' : 'empty');
      } catch {
        if (controller.signal.aborted) return;
        setRows([]);
        setStatus('error');
      }
      timer = setTimeout(refresh, 60_000);
    };
    refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (paused || rows.length < 2) return;
    const timer = setInterval(() => setIndex(value => (value + 1) % rows.length), 4000);
    return () => clearInterval(timer);
  }, [paused, rows.length]);

  const stock = rows[index % rows.length];
  return <div className="flex min-w-0 items-center gap-2 text-xs sm:text-sm"
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
    <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-gray-500" title="네이버 증권 인기 검색 종목 기준">
      <TrendingUp size={14} aria-hidden="true" /><span>인기 검색어</span>
    </span>
    {stock ? <Link className="flex min-h-9 min-w-0 items-center gap-2 rounded px-1 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600"
      to={`/trading?${new URLSearchParams({ code: stock.symbol_code })}`}
      title={`네이버 인기 검색 ${stock.rank}위 · ${stock.name}`}>
      <span className="font-bold text-brand-600">{stock.rank}</span>
      <span className="max-w-28 truncate font-medium text-gray-800">{stock.name}</span>
    </Link> : <span className="text-xs text-gray-400" role="status">{status === 'loading' ? '불러오는 중…' : status === 'error' ? '조회 불가' : '검색 순위 없음'}</span>}
  </div>;
}
