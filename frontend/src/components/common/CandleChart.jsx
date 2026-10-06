import { useId, useState } from 'react';
import { won } from '../../utils/format';
import { chartHoverIndex } from '../../utils/tradingChart';
import { CHART_TYPES, heikinAshi, renkoBricks, simpleMovingAverage } from '../../utils/chartTypes';
import ChartLessonMarks from '../learn/ChartLessonMarks';
import CandleWalkthroughMarks from '../learn/CandleWalkthroughMarks';
const label = row => row.label || row.date;
const rowKey = row => row.key || row.date;

export default function CandleChart({ rows: sourceRows, type = 'line', periodLabel = '일', scale = 'linear', boxSize = 100, maPeriod = 0, showVolume = false, onExplain, showPriceTable = true, candleStep }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const clipId = useId().replaceAll(':', '');
  if (!sourceRows?.length) return null;
  const renko = type === 'renko' ? renkoBricks(sourceRows, boxSize) : null;
  const rows = type === 'heikin' ? heikinAshi(sourceRows) : renko ? renko.rows : sourceRows;
  if (!rows.length) return <p role="status" className="p-6 text-sm text-gray-500">현재 벽돌 크기를 채우는 종가 변화가 없어 렌코 벽돌이 없습니다. 벽돌 크기를 줄여 보세요.</p>;
  const lineType = ['line', 'area', 'baseline'].includes(type);
  const synthetic = type === 'heikin' || type === 'renko';
  const chartName = CHART_TYPES.find(item => item.id === type)?.label || '캔들';
  const average = maPeriod > 0 && !synthetic ? simpleMovingAverage(rows, maPeriod) : [];
  const log = scale === 'log' && rows.every(row => row.low > 0);
  const transform = value => log ? Math.log(value) : value;
  const inverse = value => log ? Math.exp(value) : value;
  const values = rows.flatMap(row => lineType ? [row.close] : [row.low, row.high]).concat(average.filter(value => value !== null));
  const min = transform(Math.min(...values)), max = transform(Math.max(...values));
  const padding = Math.max((max - min) * .08, log ? .001 : 1);
  const bottom = min - padding, top = max + padding;
  const y = price => 260 - (transform(price) - bottom) / (top - bottom) * 230;
  const step = 580 / rows.length;
  const active = hoverIndex === null ? null : rows[hoverIndex];
  const activeX = 20 + step * (hoverIndex + .5);
  const points = rows.map((row, i) => `${20 + step * (i + .5)},${y(row.close)}`).join(' ');
  const baseY = y(rows[0].close);
  const volumeMax = Math.max(1, ...rows.map(row => Number.isFinite(row.volume) ? row.volume : 0));
  const onPointerMove = event => {
    const svg = event.currentTarget, matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    setHoverIndex(local.x >= 20 && local.x <= 600 && local.y >= 30 && local.y <= 260 ? chartHoverIndex(local.x, rows.length) : null);
  };
  return <div>
    <div className="chart-illustrated-plot">
    <svg viewBox="0 0 720 300" role="img" tabIndex={0} onPointerMove={onPointerMove} onPointerLeave={() => setHoverIndex(null)} onBlur={() => setHoverIndex(null)} onFocus={() => setHoverIndex(0)} onKeyDown={event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); setHoverIndex(index => Math.max(0, Math.min(rows.length - 1, (index ?? 0) + (event.key === 'ArrowRight' ? 1 : -1)))); }
      else if (event.key === 'Escape') setHoverIndex(null);
    }} aria-label={`${label(rows[0])}부터 ${label(rows.at(-1))}까지 ${periodLabel} 기간 ${type === 'line' ? '종가 꺾은선' : chartName} 차트. 좌우 방향키로 날짜와 가격 확인`} className="w-full rounded-lg bg-gray-50">
      {[0, 1, 2, 3].map(i => { const price = inverse(bottom + (top - bottom) * i / 3); return <g key={i}><line x1="20" x2="605" y1={y(price)} y2={y(price)} stroke="#e5e7eb" /><text x="615" y={y(price) + 4} fontSize="11" fill="#6b7280">{won(price)}</text></g>; })}
      {lineType ? <>
        {type === 'area' && <polygon points={`20,260 ${points} ${20 + step * (rows.length - .5)},260`} fill="#dbeafe" />}
        {type === 'baseline' && <>
          <defs><clipPath id={clipId + 'up'}><rect x="20" y="0" width="580" height={baseY} /></clipPath><clipPath id={clipId + 'down'}><rect x="20" y={baseY} width="580" height="300" /></clipPath></defs>
          <polygon points={`20,${baseY} ${points} 600,${baseY}`} fill="#fecaca" clipPath={`url(#${clipId}up)`} />
          <polygon points={`20,${baseY} ${points} 600,${baseY}`} fill="#bfdbfe" clipPath={`url(#${clipId}down)`} />
          <line x1="20" x2="600" y1={baseY} y2={baseY} stroke="#64748b" strokeDasharray="4 3" />
        </>}
        {rows.length > 1 ? <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" /> : <text x="310" y="140" textAnchor="middle" fontSize="12" fill="#6b7280">꺾은선을 표시할 데이터가 부족합니다.</text>}
      </> : rows.map((row, i) => { const x = 20 + step * (i + .5), color = row.close >= row.open ? '#dc2626' : '#2563eb'; return <g key={rowKey(row)}><title>{`${label(row)} 시가 ${won(row.open)}, 고가 ${won(row.high)}, 저가 ${won(row.low)}, 종가 ${won(row.close)}`}</title><line x1={x} x2={x} y1={y(row.high)} y2={y(row.low)} stroke={color} />{type === 'bar' ? <><line x1={x - step * .3} x2={x} y1={y(row.open)} y2={y(row.open)} stroke={color} /><line x1={x} x2={x + step * .3} y1={y(row.close)} y2={y(row.close)} stroke={color} /></> : <rect x={x - step * .3} y={Math.min(y(row.open), y(row.close))} width={Math.max(step * .6, 1)} height={Math.max(Math.abs(y(row.open) - y(row.close)), 1)} fill={color} />}</g>; })}
      {average.some(value => value !== null) && <polyline aria-label={`${maPeriod}기간 이동평균`} points={average.map((value, i) => value === null ? null : `${20 + step * (i + .5)},${y(value)}`).filter(Boolean).join(' ')} fill="none" stroke="#a855f7" strokeWidth="2" />}
      <text x="20" y="287" fontSize="11" fill="#6b7280">{label(rows[0])}</text><text x="600" y="287" textAnchor="end" fontSize="11" fill="#6b7280">{label(rows.at(-1))}</text>
      {active && !onExplain && <g pointerEvents="none"><line x1={activeX} x2={activeX} y1="30" y2="260" stroke="#94a3b8" strokeDasharray="4 4" /><g transform={`translate(${Math.max(20, Math.min(activeX - 95, 410))},34)`}><rect width="190" height="52" rx="6" fill="#111827" /><text x="12" y="20" fontSize="12" fill="white">{label(active)}</text><text x="12" y="39" fontSize="13" fill="white">{synthetic ? '합성 값' : '종가'} {won(active.close)}</text></g></g>}
    </svg>
    {candleStep !== undefined ? <CandleWalkthroughMarks rows={rows} step={step} y={y} index={candleStep}/> : onExplain && <ChartLessonMarks type={type} rows={rows} step={step} y={y} onExplain={onExplain}/>}
    </div>
    {synthetic && <p className="mt-2 text-xs text-amber-800">{type === 'heikin' ? '합성 OHLC · 첫 봉 시가는 원자료 시가·종가 평균으로 시작합니다. 실제 주문 가격이 아닙니다.' : `종가 기반 렌코 · 벽돌 ${boxSize.toLocaleString()}원 · 반전 2벽돌 · 첫 종가 기준. 가로축은 시간 간격이 아닌 벽돌 순서입니다.`}{renko?.truncated && ' 최대 2,000개에서 표시를 중단했습니다. 벽돌 크기를 늘려 주세요.'}</p>}
    {type === 'baseline' && <p className="mt-2 text-xs text-gray-500">기준: 조회 구간 첫 종가 {won(rows[0].close)}</p>}
    {scale === 'log' && !log && <p role="status">0 이하 가격이 있어 선형 축으로 표시합니다.</p>}
    {maPeriod > 0 && !synthetic && <p className="text-xs text-purple-700">보라색: 원자료 종가 {maPeriod}기간 단순이동평균 · 필요한 봉 수 이전에는 표시하지 않습니다.</p>}
    {showVolume && !synthetic && <div className="mt-2"><p className="text-xs text-gray-500">거래량 · 주 단위 · 색은 시가 대비 등락이며 매수·매도 주체를 뜻하지 않습니다. 누락값은 그리지 않습니다.</p>{rows.some(row => Number.isFinite(row.volume) && row.volume >= 0) ? <svg viewBox="0 0 720 90" role="img" aria-label="시간별 거래량">{rows.map((row, i) => Number.isFinite(row.volume) && row.volume >= 0 ? <rect key={rowKey(row)} x={20 + step * i} y={75 - row.volume / volumeMax * 65} width={Math.max(1, step * .7)} height={row.volume / volumeMax * 65} fill={row.close >= row.open ? '#dc2626' : '#2563eb'}><title>{`${label(row)} 거래량 ${row.volume.toLocaleString()}주`}</title></rect> : null)}</svg> : <p className="text-xs">거래량 데이터가 제공되지 않았습니다.</p>}</div>}
    <p className="sr-only" aria-live="polite">{active ? `${label(active)} ${synthetic ? '합성 값' : '종가'} ${won(active.close)}` : '마우스 또는 좌우 방향키로 날짜와 가격을 확인하세요.'}</p>
    {showPriceTable && <details className="mt-3 text-sm"><summary className="cursor-pointer text-gray-600">{periodLabel}{synthetic ? ' 단위 원자료 가격 표 보기' : ' 단위 가격 표 보기'}</summary><div className="max-h-64 overflow-auto"><table className="w-full text-right text-xs"><caption className="sr-only">{periodLabel} 단위 시가·고가·저가·종가</caption><thead><tr>{['날짜·시간', '시가', '고가', '저가', '종가'].map(text => <th key={text} className="py-2">{text}</th>)}</tr></thead><tbody>{sourceRows.map(row => <tr key={rowKey(row)}><th className="py-2 font-normal">{label(row)}</th>{['open', 'high', 'low', 'close'].map(key => <td key={key}>{won(row[key])}</td>)}</tr>)}</tbody></table></div></details>}
  </div>;
}
