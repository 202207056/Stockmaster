import { CANDLE_WALKTHROUGH } from '../../constants/candleWalkthrough';

export default function CandleWalkthroughMarks({ rows, step, y, index }) {
  const lesson = CANDLE_WALKTHROUGH[index];
  const row = rows[lesson.row], x = 20+step*(lesson.row+.5);
  const bounds = (r, part) => part==='upper' ? [r.high,Math.max(r.open,r.close)] : part==='lower' ? [Math.min(r.open,r.close),r.low] : part==='range' ? [r.high,r.low] : [Math.max(r.open,r.close),Math.min(r.open,r.close)];
  const [top,bottom] = bounds(row,lesson.part);
  return <div className="candle-walkthrough-marks">
    <svg viewBox="0 0 720 300" aria-hidden="true">
      {lesson.compare!==undefined && (()=>{ const r=rows[lesson.compare]; return <rect x={20+step*(lesson.compare+.2)} y={Math.min(y(r.open),y(r.close))-5} width={step*.6} height={Math.max(10,Math.abs(y(r.open)-y(r.close))+10)} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 3"/>; })()}
      <rect data-candle-target x={x-step*.35-4} y={y(top)-5} width={step*.7+8} height={Math.max(12,y(bottom)-y(top)+10)} rx="4" fill="none" stroke="#7c3aed" strokeWidth="3"/>
      <text x={x} y="22" textAnchor="middle" fill="#6d28d9" fontSize="14" fontWeight="700">예시 {lesson.row+1}</text>
    </svg>
    <div className="candle-live-prices" aria-label={`예시 ${lesson.row+1} 가격`}>
      {['range','body'].includes(lesson.part) && <><span>시가 <b>{row.open}원</b></span><span>종가 <b>{row.close}원</b></span></>}
      {['range','upper'].includes(lesson.part) && <span>고가 <b>{row.high}원</b></span>}
      {['range','lower'].includes(lesson.part) && <span>저가 <b>{row.low}원</b></span>}
    </div>
  </div>;
}
