import { useCallback, useEffect, useId, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import useRemote from '../../hooks/useRemote';
import { fetchAssetRange } from '../../api/assetHistory';
import { assetComparison, assetDayChange, assetWeekOffset, assetWeekStart, koreaDate, portfolioSlices } from '../../utils/assetCharts';
import { comma, won } from '../../utils/format';

const timeLabel = time => new Date(time).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', timeZone: 'UTC' });
const colors = ['var(--color-brand-600)', '#8877c5', '#b8acd8', '#9ca3af'];

export default function AssetCharts({ accountId, resource, practice }) {
  const { isAuthenticated } = useAuth();
  const today = koreaDate();
  const weekStart = new Date(Date.parse(`${today}T00:00:00Z`) - 6 * 86400000).toISOString().slice(0, 10);
  const [customRange, setCustomRange] = useState(false);
  const [selectedStart, setStartDate] = useState(weekStart);
  const [selectedEnd, setEndDate] = useState(today);
  const startDate = customRange ? selectedStart : weekStart;
  const endDate = customRange ? selectedEnd : today;
  const earliest = new Date(assetWeekStart(today) - 520 * 7 * 86400000).toISOString().slice(0, 10);
  const enabled = !practice && isAuthenticated && !!accountId;
  const history = useRemote(useCallback(signal => fetchAssetRange(accountId, startDate, endDate, signal), [accountId, startDate, endDate]), enabled,
    { cacheKey: JSON.stringify(['asset-range', accountId, startDate, endDate]) });
  const slices = resource.data ? portfolioSlices(resource.data.holdings) : null;
  const ready = history.data != null;
  const last = ready ? assetComparison(history.data?.rows, endDate, 0, history.data?.previous) : null;
  const comparison = last ? assetComparison(history.data?.rows, startDate, last.previous, history.data?.previous) : null;
  return <div className="assets-charts" data-assets-tour="charts" data-site-tour="asset-charts">
    <section className="assets-chart-panel" data-assets-tour="flow" data-site-tour="asset-flow">
      <div className="assets-section-title"><h2>보유자산 흐름</h2><div className="assets-range-options" role="group" aria-label="자산 조회 기간"><button type="button" aria-pressed={!customRange} onClick={() => setCustomRange(false)}>최근 일주일</button><button type="button" aria-pressed={customRange} aria-expanded={customRange} aria-controls="asset-custom-range" onClick={() => setCustomRange(true)}>기간 직접 선택</button></div></div>
      <div id="asset-custom-range" className="assets-date-controls" hidden={!customRange}>
        <label htmlFor="asset-start-date">시작 날짜 <input id="asset-start-date" type="date" value={startDate} min={earliest} max={endDate} disabled={!enabled} onChange={event => { const value = event.target.value; if (assetWeekOffset(value, today) !== null && value <= endDate) setStartDate(value); }} /></label>
        <label htmlFor="asset-end-date">끝 날짜 <input id="asset-end-date" type="date" value={endDate} min={startDate} max={today} disabled={!enabled} onChange={event => { const value = event.target.value; if (assetWeekOffset(value, today) !== null && value >= startDate) setEndDate(value); }} /></label>
      </div>
      {enabled && <div className="assets-flow-comparison" role="status">
        {comparison ? <><p className="assets-flow-basis">{comparison.date.replaceAll('-', '.')} ~ {last.date.replaceAll('-', '.')}</p><p><strong className={comparison.difference > 0 ? 'text-up-600' : comparison.difference < 0 ? 'text-down-600' : ''}>보유자산이 {won(Math.abs(comparison.difference))} {comparison.difference > 0 ? '늘었어요.' : comparison.difference < 0 ? '줄었어요.' : '변동이 없어요.'}</strong></p></> : <p className="assets-chart-note">{history.loading ? '변동 내역을 불러오는 중…' : !ready ? '변동 내역을 불러오지 못했습니다.' : '비교할 과거 자산 기록이 없습니다.'}</p>}
      </div>}
      {history.data ? <AssetFlow key={`${accountId}:${startDate}:${endDate}`} points={history.data.rows} start={history.data.start} end={history.data.end} previous={history.data.previous} /> : <div className="assets-chart-empty">{!enabled ? practice ? '연습 계좌는 이력을 저장하지 않습니다.' : '계좌를 선택하면 이력이 표시됩니다.' : history.loading ? '자산 이력을 불러오는 중…' : '자산 이력을 불러오지 못했습니다.'}</div>}
      {enabled && (history.error || history.data?.saveFailed) && <p className="assets-chart-note">{history.data?.saveFailed ? '오늘의 자산을 저장하지 못했습니다.' : '이력 조회에 실패했습니다.'} <button type="button" disabled={history.loading} onClick={history.reload}>다시 시도</button></p>}
    </section>
    <section className="assets-chart-panel" data-assets-tour="portfolio" data-site-tour="asset-portfolio">
      <div className="assets-section-title"><h2>보유종목 포트폴리오</h2><span>평가금액 비중</span></div>
      <PortfolioPie slices={slices} />
    </section>
  </div>;
}
function AssetFlow({ points, start, end, previous }) {
  const [selected, setSelected] = useState(null);
  const tooltipId = useId();
  const plotRef = useRef(null);
  const [width, setWidth] = useState(620);
  useEffect(() => {
    const element = plotRef.current;
    if (!element) return;
    const measure = () => setWidth(Math.max(1, element.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [points.length]);
  if (!points.length) return <div className="assets-chart-empty">이 기간에 저장된 자산 이력이 없습니다.</div>;

  const defaultIndex = points.length - 1;
  const active = points[Math.min(selected ?? defaultIndex, points.length - 1)];
  const change = assetDayChange(points, active, previous);
  const values = points.map(point => point.value);
  const low = Math.min(...values), high = Math.max(...values);
  const pad = Math.max((high - low) * .15, Math.abs(high) * .005, 1);
  const min = low - pad, max = high + pad;
  const x = point => end === start ? width / 2 : 24 + (point.time - start) / (end - start) * (width - 48);
  const y = value => 190 - (value - min) / (max - min) * 154;
  const selectPointer = event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = (event.clientX - bounds.left) / bounds.width * width;
    let nearest = 0;
    points.forEach((point, index) => { if (Math.abs(x(point) - position) < Math.abs(x(points[nearest]) - position)) nearest = index; });
    setSelected(nearest);
  };
  return <div className="assets-flow-chart"><div ref={plotRef} className="assets-flow-plot">
    <svg className="assets-flow" viewBox={`0 0 ${width} 230`} role="img" tabIndex={0}
      aria-label={`총자산 조회 기록 ${points.length}개. 좌우 방향키로 확인`} aria-describedby={selected !== null ? tooltipId : undefined}
      onPointerMove={selectPointer} onPointerDown={selectPointer} onPointerLeave={() => setSelected(null)} onBlur={() => setSelected(null)} onFocus={() => setSelected(defaultIndex)}
      onKeyDown={event => { if (event.key === 'Escape') setSelected(null); if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); setSelected(Math.max(0, Math.min(points.length - 1, (selected ?? defaultIndex) + (event.key === 'ArrowLeft' ? -1 : 1)))); } }}>
      {[max, (max + min) / 2, min].map((value, index) => <g key={index}><line x1="24" x2={width - 24} y1={y(value)} y2={y(value)} className="assets-flow-grid" /><text x="24" y={y(value) - 8} textAnchor="start">{comma(value / 10000, 1)}만</text></g>)}
      {points.map((point, index) => <g key={point.time}>
        {index > 0 && point.time - points[index - 1].time === 86400000 && <line x1={x(points[index - 1])} y1={y(points[index - 1].value)} x2={x(point)} y2={y(point.value)} stroke="var(--color-brand-600)" strokeWidth="3" />}
        <circle cx={x(point)} cy={y(point.value)} r="3" fill="var(--color-brand-600)" />
      </g>)}
      {selected !== null && <circle cx={x(active)} cy={y(active.value)} r="5" fill="var(--color-brand-600)" />}
      {Array.from({ length: Math.min(5, Math.round((end - start) / 86400000) + 1) }, (_, index) => { const count = Math.min(5, Math.round((end - start) / 86400000) + 1); const time = start + Math.round(index * (end - start) / Math.max(1, count - 1) / 86400000) * 86400000; return <text key={time} x={x({ time })} y="220" textAnchor={count === 1 ? 'middle' : index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle'}>{timeLabel(time)}</text>; })}
    </svg>
    {selected !== null && <div id={tooltipId} role="tooltip" className="assets-flow-tooltip" style={{ left: `clamp(95px, ${x(active) / width * 100}%, calc(100% - 95px))`, top: `${y(active.value) / 230 * 100}%` }}>
      <p>{new Date(active.time).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}{active.isDemo ? ' · 임시 데이터' : ''}</p>
      <div className="assets-flow-tooltip-amount"><strong>{won(active.value)}</strong>
      <b className={change > 0 ? 'text-up-600' : change < 0 ? 'text-down-600' : ''}>{change === null ? '—' : `${change > 0 ? '+' : ''}${comma(change, 2)}%`}</b></div>
    </div>}
  </div></div>;
}

function PortfolioPie({ slices }) {
  const [selected, setSelected] = useState(null);
  if (slices === null) return <div className="assets-chart-empty">평가금액을 확인하면 비중이 표시됩니다.</div>;
  const total = slices.reduce((sum, item) => sum + item.value, 0);
  if (!total) return <div className="assets-chart-empty">보유한 종목이 없습니다.</div>;
  const groups = slices;
  const focused = groups.find(item => item.code === selected);
  return <div className="assets-portfolio-chart">
    <div className="assets-pie"><svg viewBox="0 0 200 200" role="img" aria-label={`보유종목 평가금액 ${won(total)}의 종목별 비중`}>
      {groups.map((item, index) => {
        const share = item.value / total;
        const start = groups.slice(0, index).reduce((sum, item) => sum + item.value / total, 0) * Math.PI * 2 - Math.PI / 2;
        const end = start + share * Math.PI * 2;
        const title = <title>{item.name}: {comma(share * 100, 1)}%, {won(item.value)}</title>;
        const opacity = focused && selected !== item.code ? .4 : 1;
        return share === 1
          ? <circle key={item.code} cx="100" cy="100" r="90" fill={colors[index % colors.length]} opacity={opacity}>{title}</circle>
          : <path key={item.code} d={`M 100 100 L ${100 + 90 * Math.cos(start)} ${100 + 90 * Math.sin(start)} A 90 90 0 ${share > .5 ? 1 : 0} 1 ${100 + 90 * Math.cos(end)} ${100 + 90 * Math.sin(end)} Z`} fill={colors[index % colors.length]} stroke="var(--surface, #fff)" strokeWidth="0.5" opacity={opacity}>{title}</path>;
      })}
    </svg><div className="assets-pie-label" aria-live="polite"><span>{focused?.name || '주식 평가금액'}</span><strong>{won(focused?.value ?? total)}</strong></div></div>
    <ul className="assets-chart-legend" aria-label="종목별 포트폴리오 비중">{groups.map((item, index) => <li key={item.code}><button type="button" aria-pressed={selected === item.code} onClick={() => setSelected(selected === item.code ? null : item.code)}><i style={{ background: colors[index % colors.length] }} /><span>{item.name}</span><strong>{comma(item.value / total * 100, 1)}%</strong><small>{won(item.value)}</small></button></li>)}</ul>
  </div>;
}
