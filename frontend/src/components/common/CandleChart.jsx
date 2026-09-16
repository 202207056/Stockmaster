import { useState } from 'react';
import { won } from '../../utils/format';
import { chartHoverIndex } from '../../utils/tradingChart';

const label = (row) => row.label || row.date;
const rowKey = (row) => row.key || row.date;

// Read-only price chart using supplied OHLC data.
export default function CandleChart({ rows, type = 'candle', periodLabel = '일' }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  if (!rows?.length) return null;
  const min = Math.min(...rows.map((row) => type === 'line' ? row.close : row.low));
  const max = Math.max(...rows.map((row) => type === 'line' ? row.close : row.high));
  const padding = Math.max((max - min) * 0.08, 1);
  const bottom = min - padding;
  const top = max + padding;
  const y = (price) => 260 - (price - bottom) / (top - bottom) * 230;
  const step = 580 / rows.length;
  const active = hoverIndex === null ? null : rows[hoverIndex];
  const activeX = 20 + step * (hoverIndex + 0.5);
  const onPointerMove = (event) => {
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const local = point.matrixTransform(matrix.inverse());
    setHoverIndex(local.x >= 20 && local.x <= 600 && local.y >= 30 && local.y <= 260 ? chartHoverIndex(local.x, rows.length) : null);
  };
  return <div>
    <svg viewBox="0 0 720 300" role="img" tabIndex={0} onPointerMove={onPointerMove} onPointerLeave={() => setHoverIndex(null)} onBlur={() => setHoverIndex(null)} onFocus={() => setHoverIndex(0)} onKeyDown={(event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        setHoverIndex((index) => Math.max(0, Math.min(rows.length - 1, (index ?? 0) + (event.key === 'ArrowRight' ? 1 : -1))));
      } else if (event.key === 'Escape') setHoverIndex(null);
    }} aria-label={`${label(rows[0])}부터 ${label(rows.at(-1))}까지 ${periodLabel} 기간 ${type === 'line' ? '종가 꺾은선' : '캔들'} 차트. 좌우 방향키로 날짜와 가격 확인`} className="w-full rounded-lg bg-gray-50">
      {[0, 1, 2, 3].map((index) => { const price = bottom + (top - bottom) * index / 3; return <g key={index}><line x1="20" x2="605" y1={y(price)} y2={y(price)} stroke="#e5e7eb" /><text x="615" y={y(price) + 4} fontSize="11" fill="#6b7280">{won(price)}</text></g>; })}
      {type === 'line' ? <>
        {rows.length > 1 && <polyline points={rows.map((row, index) => `${20 + step * (index + 0.5)},${y(row.close)}`).join(' ')} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />}
        {rows.length === 1 && <text x="310" y="140" textAnchor="middle" fontSize="12" fill="#6b7280">꺾은선을 표시할 데이터가 부족합니다.</text>}
      </> : rows.map((row, index) => { const x = 20 + step * (index + 0.5); const color = row.close >= row.open ? '#dc2626' : '#2563eb'; return <g key={rowKey(row)}><title>{`${label(row)} 시가 ${won(row.open)}, 고가 ${won(row.high)}, 저가 ${won(row.low)}, 종가 ${won(row.close)}`}</title><line x1={x} x2={x} y1={y(row.high)} y2={y(row.low)} stroke={color} /><rect x={x - step * 0.3} y={Math.min(y(row.open), y(row.close))} width={Math.max(step * 0.6, 1)} height={Math.max(Math.abs(y(row.open) - y(row.close)), 1)} fill={color} /></g>; })}
      <text x="20" y="287" fontSize="11" fill="#6b7280">{label(rows[0])}</text><text x="600" y="287" textAnchor="end" fontSize="11" fill="#6b7280">{label(rows.at(-1))}</text>
      {active && <g pointerEvents="none">
        <line x1={activeX} x2={activeX} y1="30" y2="260" stroke="#94a3b8" strokeDasharray="4 4" />
        <g transform={`translate(${Math.max(20, Math.min(activeX - 95, 410))}, 34)`}>
          <rect width="190" height="52" rx="6" fill="#111827" />
          <text x="12" y="20" fontSize="12" fill="white">{label(active)}</text>
          <text x="12" y="39" fontSize="13" fill="white">종가 {won(active.close)}</text>
        </g>
      </g>}
    </svg>
    <p className="sr-only" aria-live="polite">{active ? `${label(active)} 종가 ${won(active.close)}` : '마우스 또는 좌우 방향키로 날짜와 가격을 확인하세요.'}</p>
    <details className="mt-3 text-sm"><summary className="cursor-pointer text-gray-600">{periodLabel} 단위 가격 표 보기</summary><div className="max-h-64 overflow-auto"><table className="w-full text-right text-xs"><caption className="sr-only">{periodLabel} 단위 시가·고가·저가·종가</caption><thead><tr>{['날짜·시간', '시가', '고가', '저가', '종가'].map((text) => <th key={text} className="py-2">{text}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={rowKey(row)}><th className="py-2 font-normal">{label(row)}</th>{['open', 'high', 'low', 'close'].map((key) => <td key={key}>{won(row[key])}</td>)}</tr>)}</tbody></table></div></details>
  </div>;
}
