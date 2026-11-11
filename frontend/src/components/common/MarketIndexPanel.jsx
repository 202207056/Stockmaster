import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchMarketIndices } from '../../api/data';
import { numberOrNull } from '../../api/normalize';
import useRemote from '../../hooks/useRemote';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { marketValue, rateWithMark, signTextClass } from '../../utils/format';
import { marketChartPoints } from '../../utils/marketChart';
import RemoteState from './RemoteState';

export default function MarketIndexPanel({ market }) {
  const resource = useRemote(useCallback(signal => fetchMarketIndices(signal), []), true, { cacheKey: 'indices', publicCache: true, keepPreviousData: true });
  useAutoRefresh(resource, 60_000);
  const item = resource.data?.find(index => String(index.code || index.name) === market);
  const value = numberOrNull(item?.value);
  const change = numberOrNull(item?.change_rate);
  const points = marketChartPoints(item?.intraday);
  const timeLabel = time => time ? `${time.slice(0, 2)}:${time.slice(2, 4)}` : '—';
  return <section className="min-w-0 rounded-xl border border-gray-200 p-5 lg:col-span-3" aria-label="주요 시세 상세">
    <RemoteState resource={resource} requiresAuth={false}>
      {!item ? <p className="py-8 text-sm text-gray-500">해당 지표를 찾을 수 없어요. <Link to="/dashboard" className="underline">주요 시세로 돌아가기</Link></p> : <>
        <div className="flex items-center justify-between gap-4"><h2 className="text-lg font-bold">{item.name}</h2><button type="button" onClick={resource.reload} disabled={resource.loading} className="text-sm text-gray-600 underline disabled:opacity-50">새로고침</button></div>
        <p className={`tabular mt-4 text-3xl font-bold ${signTextClass(value === null ? null : change)}`}>{value === null ? '—' : marketValue(value)}</p>
        <p className={`mt-1 text-sm ${signTextClass(value === null ? null : change)}`}>{value === null ? '시세 준비 중' : change === null ? '등락률 정보 없음' : `등락률 ${rateWithMark(change)}`}</p>
        <h3 className="mt-8 text-sm font-bold">당일 시세 추이</h3>
        <p className="mt-1 text-xs text-gray-500">{item.intraday?.date || '기준일 정보 없음'} · 현지 시각 · 10분 간격</p>
        {points.length < 2 ? <p className="py-16 text-center text-sm text-gray-500">당일 차트 데이터가 준비되지 않았어요.</p> : <>
          <svg viewBox="0 0 600 240" className={`mt-4 h-64 w-full ${signTextClass(change)}`} role="img" aria-label={`${item.name} 당일 시세 차트`} preserveAspectRatio="none">
            <path d={points.map(({ x, y }, i) => `${i ? 'L' : 'M'} ${(x - 8) * 7.25 + 10} ${y * 2.5}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="flex justify-between text-xs text-gray-500"><span>{timeLabel(item.intraday?.session_start || '090000')}</span><span>{timeLabel(item.intraday?.session_end || '153000')}</span></div>
        </>}
        <p className="mt-6 text-sm text-gray-500">시장 지표는 정보 조회용이며 모의 주문 대상이 아닙니다.</p>
      </>}
    </RemoteState>
  </section>;
}
