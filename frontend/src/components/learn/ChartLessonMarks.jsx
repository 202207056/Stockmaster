import './ChartTutorial.css';

export default function ChartLessonMarks({ type, rows, step, y, onExplain }) {
  const i = Math.min(rows.length-1,Math.floor(rows.length*.4));
  const row = rows[i], x = 20+step*(i+.5);
  const marks = {
    line:[['종가만 연결',x,y(row.close)],['고가·저가는 생략',20+step*.5,y(rows[0].close)]],
    candle:[['몸통: 시작과 끝',x,(y(row.open)+y(row.close))/2],['꼬리: 움직인 범위',x,y(row.low)]],
    bar:[['왼쪽: 시가',x-step*.3,y(row.open)],['오른쪽: 종가',x+step*.3,y(row.close)]],
    area:[['꺾은선과 같은 종가',x,y(row.close)],['면적 ≠ 거래량',x,(y(row.close)+260)/2]],
    baseline:[['기준: 첫 종가',20+step*.5,y(rows[0].close)],['기준 위·아래를 구분',x,y(row.close)]],
    heikin:[['평균내어 만든 봉',x,(y(row.open)+y(row.close))/2],['실제 거래가격과 달라요',20+step*(rows.length-.5),y(rows.at(-1).close)]],
    renko:[['한 벽돌 = 일정 가격 폭',x,(y(row.open)+y(row.close))/2],['같은 시간 간격이 아니에요',x,280]],
  }[type];
  return <div className="chart-lesson-marks">
    <svg viewBox="0 0 720 300" aria-hidden="true">{marks.map(([text,tx,ty],index)=><g key={text}><line className="chart-lesson-leader" x1={index?447:151} y1={index?251:35} x2={tx} y2={ty}/><circle cx={tx} cy={ty} r="5" fill="white" stroke="#7c3aed" strokeWidth="2"/></g>)}</svg>
    {marks.map(([text],index)=><button key={text} type="button" className={`chart-lesson-mark chart-lesson-mark-${index}`} onClick={onExplain} aria-label={`${text} · 그림 설명 열기`}>{text} <span aria-hidden="true">↗</span></button>)}
  </div>;
}
