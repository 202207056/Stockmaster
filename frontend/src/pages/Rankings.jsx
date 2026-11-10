import { useCallback, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, RefreshCw } from 'lucide-react';
import { fetchRanking } from '../api/data';
import { numberOrNull } from '../api/normalize';
import useRemote from '../hooks/useRemote';
import RemoteState from '../components/common/RemoteState';
import StockLogo from '../components/common/StockLogo';
import GroupedFavoriteButton from '../components/common/GroupedFavoriteButton';
import { comma, rate, signTextClass, won, wonShort } from '../utils/format';
import { RANKING_CATEGORIES as categories } from '../constants/rankings';
import './Rankings.css';
import useMobileLayout from '../hooks/useMobileLayout';

export default function Rankings() {
  const [params] = useSearchParams();
  const category = categories.find(item => item.id === params.get('type')) || categories[0];
  return <RankingList category={category} />;
}

function RankingList({ category }) {
  const mobile = useMobileLayout();
  const tabs = useRef(null);
  useEffect(() => {
    const nav = tabs.current;
    const active = nav?.querySelector('[aria-current="page"]');
    if (active && nav.scrollWidth > nav.clientWidth) {
      nav.scrollLeft += active.getBoundingClientRect().left - nav.getBoundingClientRect().left - (nav.clientWidth - active.clientWidth) / 2;
    }
  }, [category.id]);
  const resource = useRemote(useCallback(signal => fetchRanking(category.id, signal, { limit: 30 }), [category.id]), true,
    { cacheKey: `ranking:${category.id}:30`, publicCache: true });
  const rows = resource.data || [];

  return <section className="rankings-page" aria-labelledby="rankings-title">
    <Link to="/dashboard" className="rankings-back"><ChevronLeft size={16} aria-hidden="true" />홈</Link>
    <div className="rankings-heading"><h1 id="rankings-title">실시간 국내주식 랭킹</h1></div>
    <div className="rankings-tabs-bar"><nav ref={tabs} className="rankings-tabs" aria-label="순위 종류">
      {categories.map(item => <Link key={item.id} to={`/dashboard/rankings?type=${item.id}`}
        aria-current={item.id === category.id ? 'page' : undefined}>{item.label}</Link>)}
    </nav>
      <button className="rankings-refresh" type="button" onClick={resource.reload} disabled={resource.loading} aria-label="순위 새로고침" title="새로고침"><RefreshCw size={17} aria-hidden="true" /></button>
    </div>
    {resource.error && rows.length > 0 && <p className="rankings-status" role="status">새로고침에 실패했습니다. 이전 조회 결과입니다.</p>}
    <RemoteState resource={resource} requiresAuth={false} empty={!rows.length}>
      {mobile ? <ol className="mts-ranking-list" aria-label={`${category.label} 전체 목록`}>{rows.map((stock, index) => {
        const change = numberOrNull(stock.change_rate);
        const price = numberOrNull(stock.price);
        return <li key={stock.symbol_code}>
          <span className="mts-rank-number">{comma(stock.rank ?? index + 1)}</span>
          <div className="mts-rank-content"><Link title={stock.name} to={`/trading?${new URLSearchParams({ code: stock.symbol_code })}`}>
            <StockLogo code={stock.symbol_code} name={stock.name} className="h-6 w-6" />
            <span className="mts-rank-name"><strong>{stock.name}</strong><small>{category.id === 'amount' && numberOrNull(stock.amount) !== null ? wonShort(stock.amount) : category.id === 'volume' && numberOrNull(stock.volume) !== null ? `${comma(stock.volume)}주` : stock.symbol_code}</small></span>
            <span className="mts-rank-price"><strong>{price === null || price <= 0 ? '—' : won(price)}</strong><small className={change === null ? '' : signTextClass(change)}>{change === null ? '—' : rate(change)}</small></span>
          </Link></div><GroupedFavoriteButton code={stock.symbol_code} />
        </li>;
      })}</ol> : <div className="rankings-table-scroll" tabIndex={0} role="region" aria-label={`${category.label} 전체 목록`}>
        <table className="rankings-table">
          <caption className="sr-only">{category.label}</caption>
          <colgroup>
            <col className="rankings-col-rank" /><col className="rankings-col-favorite" /><col className="rankings-col-stock" />
            <col className="rankings-col-metric" /><col className="rankings-col-price" /><col className="rankings-col-rate" /><col className="rankings-col-metric" />
          </colgroup>
          <thead><tr><th scope="col">순위</th><th scope="col"><span className="sr-only">관심종목</span></th><th scope="col">종목명</th><th scope="col">{category.metric}</th><th scope="col">현재가</th><th scope="col">등락률</th><th scope="col">{category.id === 'volume' ? '거래대금' : '거래량'}</th></tr></thead>
          <tbody>{rows.map((stock, index) => {
            const change = numberOrNull(stock.change_rate);
            const amount = numberOrNull(stock.amount);
            const volume = numberOrNull(stock.volume);
            const price = numberOrNull(stock.price);
            const amountText = amount === null ? '—' : `${wonShort(amount)}원`;
            const volumeText = volume === null ? '—' : `${comma(volume)}주`;
            const metricValue = numberOrNull(stock[category.field]);
            const metricText = metricValue === null ? '—' : category.unit === 'percent' ? `${comma(metricValue, 2)}%` : category.unit === 'shares' ? `${comma(metricValue)}주` : `${wonShort(metricValue)}원`;
            return <tr key={stock.symbol_code}>
              <td className="rankings-rank">{comma(stock.rank ?? index + 1)}</td>
              <td className="rankings-favorite"><GroupedFavoriteButton code={stock.symbol_code} /></td>
              <th scope="row"><Link className="rankings-stock" title={stock.name} to={`/trading?${new URLSearchParams({ code: stock.symbol_code })}`}><StockLogo code={stock.symbol_code} name={stock.name} className="h-8 w-8 shrink-0" /><span><strong>{stock.name}</strong><small>{stock.symbol_code}</small></span></Link></th>
              <td title={category.unit === 'won' && metricValue !== null ? won(metricValue) : undefined}>{metricText}</td>
              <td className={price === null || change === null ? '' : signTextClass(change)}>{price === null || price <= 0 ? '—' : won(price)}</td>
              <td className={change === null ? '' : signTextClass(change)}>{change === null ? '—' : rate(change)}</td>
              <td title={category.id !== 'volume' || amount === null ? undefined : won(amount)}>{category.id === 'volume' ? amountText : volumeText}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
    </RemoteState>
  </section>;
}
