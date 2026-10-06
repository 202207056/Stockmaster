import './ChartTutorial.css';

function Glyph({ open, close, high, low, title }) {
  const color = close <= open ? '#dc6266' : '#5684cf';
  return <svg viewBox="0 0 120 105" role="img" aria-label={title}><line x1="60" x2="60" y1={high} y2={low} stroke={color} strokeWidth="2"/><rect x="47" y={Math.min(open,close)} width="26" height={Math.max(2,Math.abs(close-open))} fill={color}/></svg>;
}
export function CandleShapes() {
  const examples = [
    ['양봉',75,35,18,91,'시가보다 높은 가격에 마감했어요.'],
    ['음봉',35,75,18,91,'시가보다 낮은 가격에 마감했어요.'],
    ['긴 윗꼬리',75,61,12,87,'몸통보다 훨씬 높은 가격까지 거래됐어요.'],
    ['긴 아랫꼬리',38,25,15,94,'몸통보다 훨씬 낮은 가격까지 거래됐어요.'],
    ['도지',52,52,18,90,'시가와 종가가 같거나 아주 가까워요. 중간의 변동은 클 수도 있어요.'],
  ];
  return <div className="chart-candle-shapes">{examples.map(([title,open,close,high,low,text])=><figure key={title}><Glyph {...{open,close,high,low,title}}/><figcaption><strong>{title}</strong><p>{text}</p></figcaption></figure>)}</div>;
}
export function CandleLengths() {
  const examples = [
    ['몸통이 길면',85,20,12,94,'시작과 끝의 가격 차이가 커요.','양봉이면 많이 올라 마감, 음봉이면 많이 내려 마감한 거예요.'],
    ['몸통이 짧으면',55,45,12,94,'시작과 끝의 가격이 비슷해요.','중간에는 크게 움직였을 수도 있어요. 긴 꼬리를 함께 보세요.'],
    ['꼬리가 길면',55,40,10,95,'몸통 밖으로 멀리 움직였어요.','윗꼬리는 위로, 아랫꼬리는 아래로 벗어난 폭이에요.'],
    ['꼬리가 짧으면',82,23,18,87,'몸통 밖으로 벗어난 폭이 작아요.','몸통이 길면 전체 가격 변동은 클 수 있어요.'],
  ];
  return <div className="chart-candle-lengths">{examples.map(([title,open,close,high,low,text,detail])=><figure key={title}><Glyph {...{open,close,high,low,title}}/><figcaption><strong>{title}</strong><p>{text}</p><small>{detail}</small></figcaption></figure>)}</div>;
}
