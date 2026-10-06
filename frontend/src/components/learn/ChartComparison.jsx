import { heikinAshi, renkoBricks, simpleMovingAverage } from '../../utils/chartTypes';
import { CHART_GUIDE_ROWS } from '../../constants/chartGuideContent';

// Small explanatory illustrations, deliberately independent of live chart controls.
export default function ChartComparison({ type = 'line', rows = CHART_GUIDE_ROWS, scale = 'linear', average = 0, level, label, volume = false, domain }) {
  const data = type === 'heikin' ? heikinAshi(rows) : type === 'renko' ? renkoBricks(rows,4).rows : rows;
  const transform = value => scale === 'log' ? Math.log(value) : value;
  const low = domain?.[0] ?? Math.min(...data.map(r=>r.low)), high = domain?.[1] ?? Math.max(...data.map(r=>r.high));
  const y = value => 116 - (transform(value)-transform(low))/(transform(high)-transform(low) || 1)*94;
  const step = 244 / data.length, x = i => 18 + step*(i+.5);
  const points = data.map((r,i)=>`${x(i)},${y(r.close)}`).join(' ');
  const base = y(data[0].close);
  return <svg className="chart-mini" viewBox="0 0 280 142" role="img" aria-label={label}>
    {[30,70,110].map(v=><line key={v} x1="16" x2="264" y1={v} y2={v} stroke="#e2e8f0" strokeDasharray="3 4" />)}
    {volume ? data.map((r,i)=><rect key={i} x={x(i)-6} y={118-r.volume*9} width="12" height={r.volume*9} fill={r.close>=r.open?'#dc6266':'#5684cf'} />) : <>
      {type === 'area' && <polygon points={`${x(0)},122 ${points} ${x(data.length-1)},122`} fill="#dbeafe" />}
      {type === 'baseline' && <><line x1="16" x2="264" y1={base} y2={base} stroke="#64748b" strokeDasharray="4 3" />{data.slice(1).map((r,i)=><polygon key={i} points={`${x(i)},${base} ${x(i)},${y(data[i].close)} ${x(i+1)},${y(r.close)} ${x(i+1)},${base}`} fill={r.close>=data[0].close?'#fecaca':'#bfdbfe'} />)}</>}
      {['candle','bar','heikin','renko'].includes(type) ? data.map((r,i)=><g key={i} stroke={r.close>=r.open?'#dc6266':'#5684cf'}><line x1={x(i)} x2={x(i)} y1={y(r.high)} y2={y(r.low)} />{type==='bar'?<><line x1={x(i)-5} x2={x(i)} y1={y(r.open)} y2={y(r.open)} /><line x1={x(i)} x2={x(i)+5} y1={y(r.close)} y2={y(r.close)} /></>:<rect x={x(i)-step*.25} y={Math.min(y(r.open),y(r.close))} width={step*.5} height={Math.max(1,Math.abs(y(r.open)-y(r.close)))} fill={r.close>=r.open?'#dc6266':'#5684cf'} />}</g>) : <polyline points={points} fill="none" stroke="#527acc" strokeWidth="2.5" strokeLinejoin="round" />}
      {average>0 && <polyline points={simpleMovingAverage(data,average).map((v,i)=>v===null?null:`${x(i)},${y(v)}`).filter(Boolean).join(' ')} fill="none" stroke="#8b5cf6" strokeWidth="2.5" />}
      {level!==undefined && <><line x1="16" x2="264" y1={y(level)} y2={y(level)} stroke="#a16207" strokeDasharray="5 3" /><text x="19" y={y(level)-6} fill="#854d0e" fontSize="10">기준 가격대</text></>}
    </>}
    <text x="18" y="137" fontSize="10" fill="#64748b">{volume?'시간별 거래량':type==='renko'?'벽돌 순서 →':'시간 →'}</text>
    {scale==='log' && <text x="260" y="137" textAnchor="end" fontSize="10" fill="#64748b">로그 축</text>}
  </svg>;
}

export function CandleAnatomy() {
  return <svg className="chart-anatomy" viewBox="0 0 330 190" role="img" aria-label="양봉: 시가 9,500원, 종가 9,800원, 고가 10,000원, 저가 9,300원. 몸통은 시가와 종가 사이, 꼬리는 고가와 저가까지입니다.">
    <line x1="130" x2="130" y1="20" y2="168" stroke="#d75c65" strokeWidth="2" />
    <rect x="107" y="64" width="46" height="62" rx="2" fill="#d75c65" />
    {[[20,'고가 10,000'],[64,'종가 9,800'],[126,'시가 9,500'],[168,'저가 9,300']].map(([y,text])=><g key={text}><line x1="157" x2="186" y1={y} y2={y} stroke="#cbd5e1" /><text x="194" y={y+4} fill="#334155" fontSize="12">{text}</text></g>)}
    <text x="56" y="44" fontSize="12" fill="#64748b">윗꼬리</text><text x="63" y="100" fontSize="12" fill="#334155">몸통</text><text x="45" y="155" fontSize="12" fill="#64748b">아랫꼬리</text>
  </svg>;
}
