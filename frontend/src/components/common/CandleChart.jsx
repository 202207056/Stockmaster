import { won } from '../../utils/format';

// Read-only daily candle chart. No extra dependency or fabricated price history.
export default function CandleChart({ rows }) {
  if (!rows?.length) return null;
  const min = Math.min(...rows.map((row) => row.low));
  const max = Math.max(...rows.map((row) => row.high));
  const padding = Math.max((max - min) * 0.08, 1);
  const bottom = min - padding;
  const top = max + padding;
  const y = (price) => 260 - (price - bottom) / (top - bottom) * 230;
  const step = 580 / rows.length;
  return <div>
    <svg viewBox="0 0 720 300" role="img" aria-label={`${rows[0].date}부터 ${rows.at(-1).date}까지 일봉 차트`} className="w-full rounded-lg bg-gray-50">
      {[0, 1, 2, 3].map((index) => { const price = bottom + (top - bottom) * index / 3; return <g key={index}><line x1="20" x2="605" y1={y(price)} y2={y(price)} stroke="#e5e7eb" /><text x="615" y={y(price) + 4} fontSize="11" fill="#6b7280">{won(price)}</text></g>; })}
      {rows.map((row, index) => { const x = 20 + step * (index + 0.5); const color = row.close >= row.open ? '#dc2626' : '#2563eb'; return <g key={row.date}><title>{`${row.date} 시가 ${won(row.open)}, 고가 ${won(row.high)}, 저가 ${won(row.low)}, 종가 ${won(row.close)}`}</title><line x1={x} x2={x} y1={y(row.high)} y2={y(row.low)} stroke={color} /><rect x={x - step * 0.3} y={Math.min(y(row.open), y(row.close))} width={Math.max(step * 0.6, 1)} height={Math.max(Math.abs(y(row.open) - y(row.close)), 1)} fill={color} /></g>; })}
      <text x="20" y="287" fontSize="11" fill="#6b7280">{rows[0].date}</text><text x="600" y="287" textAnchor="end" fontSize="11" fill="#6b7280">{rows.at(-1).date}</text>
    </svg>
    <details className="mt-3 text-sm"><summary className="cursor-pointer text-gray-600">일별 가격 표 보기</summary><div className="max-h-64 overflow-auto"><table className="w-full text-right text-xs"><caption className="sr-only">일별 시가·고가·저가·종가</caption><thead><tr>{['날짜', '시가', '고가', '저가', '종가'].map((label) => <th key={label} className="py-2">{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.date}><th className="py-2 font-normal">{row.date}</th>{['open', 'high', 'low', 'close'].map((key) => <td key={key}>{won(row[key])}</td>)}</tr>)}</tbody></table></div></details>
  </div>;
}
