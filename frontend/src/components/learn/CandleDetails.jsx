import { CandleAnatomy } from './ChartComparison';
import './ChartTutorial.css';

function Glyph({ open, close, high, low, title }) {
  const color = close <= open ? '#dc6266' : '#5684cf';
  return <svg viewBox="0 0 120 105" role="img" aria-label={title}><line x1="60" x2="60" y1={high} y2={low} stroke={color} strokeWidth="2"/><rect x="47" y={Math.min(open,close)} width="26" height={Math.max(2,Math.abs(close-open))} fill={color}/></svg>;
}
export function CandleShapes({ only } = {}) {
  const examples = [
    ['양봉',75,35,18,91,'시가보다 높은 가격에 마감했어요.'],
    ['음봉',35,75,18,91,'시가보다 낮은 가격에 마감했어요.'],
    ['긴 윗꼬리',75,61,12,87,'몸통보다 훨씬 높은 가격까지 거래됐어요.'],
    ['긴 아랫꼬리',38,25,15,94,'몸통보다 훨씬 낮은 가격까지 거래됐어요.'],
    ['도지',52,52,18,90,'시가와 종가가 같거나 아주 가까워요. 중간의 변동은 클 수도 있어요.'],
  ];
  return <div className="chart-candle-shapes">{examples.filter(([title]) => !only || only.includes(title)).map(([title,open,close,high,low,text])=><figure key={title}><Glyph {...{open,close,high,low,title}}/><figcaption><strong>{title}</strong><p>{text}</p></figcaption></figure>)}</div>;
}
export function CandleLengths({ only } = {}) {
  const examples = [
    ['몸통이 길면',85,20,12,94,'시작과 끝의 가격 차이가 커요.','양봉이면 많이 올라 마감, 음봉이면 많이 내려 마감한 거예요.'],
    ['몸통이 짧으면',55,45,12,94,'시작과 끝의 가격이 비슷해요.','중간에는 크게 움직였을 수도 있어요. 긴 꼬리를 함께 보세요.'],
    ['꼬리가 길면',55,40,10,95,'몸통 밖으로 멀리 움직였어요.','윗꼬리는 위로, 아랫꼬리는 아래로 벗어난 폭이에요.'],
    ['꼬리가 짧으면',82,23,18,87,'몸통 밖으로 벗어난 폭이 작아요.','몸통이 길면 전체 가격 변동은 클 수 있어요.'],
  ];
  return <div className="chart-candle-lengths">{examples.filter(([title]) => !only || only.includes(title)).map(([title,open,close,high,low,text,detail])=><figure key={title}><Glyph {...{open,close,high,low,title}}/><figcaption><strong>{title}</strong><p>{text}</p><small>{detail}</small></figcaption></figure>)}</div>;
}


export function CandleStructure() {
  return <div className="chart-concept-anatomy"><CandleAnatomy/><div><h3>몸통 = 시작과 끝의 차이</h3><p>시가에서 시작해서 종가에 끝나요.</p><h3>꼬리 = 몸통 밖으로 움직인 범위</h3><p>끝까지 뻗은 곳이 고가와 저가예요.</p></div></div>;
}

export function CandlePreviousClose() {
  return <p className="chart-guide-callout"><strong>양봉 = 오늘 시작보다 높게 마감.</strong><br/>어제 10,000원 → 오늘 시작 9,500원 → 마감 9,800원이라면, 양봉이어도 전일 대비 2% 하락이에요.</p>;
}

export function CandleCalloutContent({ step }) {
  return <div className="candle-inline-lesson" key={step}>
    {step === 0 && <CandleStructure/>}
    {step === 1 && <CandleLengths only={['몸통이 길면', '꼬리가 짧으면']}/>}
    {step === 2 && <CandleLengths only={['몸통이 짧으면']}/>}
    {step === 3 && <><CandleShapes only={['긴 윗꼬리']}/><CandleLengths only={['꼬리가 길면']}/></>}
    {step === 4 && <CandleShapes only={['긴 아랫꼬리']}/>}
    {step === 5 && <CandleShapes only={['음봉']}/>}
    {step === 6 && <CandleShapes only={['도지']}/>}
    {step === 7 && <><CandleShapes only={['양봉']}/><CandlePreviousClose/></>}
  </div>;
}
