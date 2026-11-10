import { useCallback } from 'react';
import api from '../../api/client';
import useRemote from '../../hooks/useRemote';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import './StockFundamentals.css';

const fields = [
  ['market_cap', '시가총액', '원'],
  ['dividend_yield', '배당수익률', '%'],
  ['pbr', 'PBR', '배'],
  ['per', 'PER', '배'],
  ['roe', 'ROE', '%'],
  ['psr', 'PSR', '배'],
  ['eps', 'EPS', '원'],
  ['bps', 'BPS', '원'],
  ['dividend_per_share', '주당배당금', '원'],
  ['foreign_ownership', '외국인 소진율', '%'],
];

function formatMetric(value, key, unit) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const format = number => number.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  if (key === 'market_cap' && value >= 100_000_000) {
    const trillion = Math.floor(value / 1_000_000_000_000);
    const billion = Math.round((value % 1_000_000_000_000) / 100_000_000);
    return `${trillion ? `${format(trillion)}조 ` : ''}${format(billion)}억 원`;
  }
  return `${format(value)}${unit}`;
}

export default function StockFundamentals({ code, active = true }) {
  const resource = useRemote(useCallback(async signal => {
    const { data } = await api.get(`/stocks/${encodeURIComponent(code)}/fundamentals`, { signal, cache: false, ...(import.meta.env.DEV ? { baseURL: '/api' } : {}) });
    if (data?.symbol_code !== code || !data.metrics) throw new Error('투자 지표 응답을 확인할 수 없습니다.');
    return data;
  }, [code]), !!code, { keepPreviousData: true });
  useAutoRefresh(resource, 300_000, active && !!code);
  const { data, loading, error } = resource;
  return <section className="stock-fundamentals" aria-label="투자 지표" aria-busy={loading}>
    <div className="stock-fundamentals__heading"><h2>투자 지표</h2></div>
    {error && <p role="alert">투자 지표를 불러오지 못했어요. 잠시 후 자동으로 다시 조회합니다.</p>}
    {loading && !data ? <p role="status">종목의 투자 지표를 불러오고 있어요…</p> : <>
      <dl className="stock-fundamentals__grid">{fields.map(([key, label, unit]) => {
        const metric = data?.metrics[key];
        return <div key={key}><dt>{label}{key === 'psr' && <span> (계산)</span>}</dt>
          <dd>{formatMetric(metric?.value, key, unit)}</dd>
        </div>;
      })}</dl>
      {data && <p className="stock-fundamentals__source"><a href={`https://m.stock.naver.com/domestic/stock/${encodeURIComponent(code)}/total`} target="_blank" rel="noopener noreferrer">네이버 증권</a> · 조회 {new Date(data.observed_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} (한국시간){error && ' · 이전 조회 자료'}</p>}
      {data?.annual_unavailable && <p className="stock-fundamentals__note">연간 재무자료를 확인할 수 없어 ROE·PSR은 표시하지 않았습니다.</p>}
    </>}
  </section>;
}
