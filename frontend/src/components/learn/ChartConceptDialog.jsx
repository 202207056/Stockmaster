import { useEffect, useId, useRef } from 'react';
import ChartComparison from './ChartComparison';
import { CandleLengths, CandleShapes, CandleStructure, CandlePreviousClose } from './CandleDetails';
import { CHART_GUIDE_TYPES } from '../../constants/chartGuideContent';
import './ChartGuide.css';
import './ChartTutorial.css';

const asRows = values => values.map(close => ({open:close,high:close+2,low:close-2,close}));
const rise = asRows([100,200,400,800]);
const start = [100,104,101,105,102,104,108];
function Pair({ first, second }) {
  return <div className="chart-compare-pair">{[first,second].map(item=><figure className="chart-compare-figure" key={item.title}><ChartComparison {...item} label={item.title}/><figcaption><strong>{item.title}</strong><p>{item.text}</p></figcaption></figure>)}</div>;
}
export default function ChartConceptDialog({ kind, onClose }) {
  const ref = useRef(null), titleId = useId();
  const current = CHART_GUIDE_TYPES.find(item=>item[0]===kind);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  const titles = { candle:'캔들, 몸통과 꼬리부터 읽어요', comparisons:'같은 그림도 이렇게 달라져요' };
  const partner = { line:'candle',bar:'candle',area:'line',baseline:'line',heikin:'candle',renko:'candle' }[kind];
  const other = CHART_GUIDE_TYPES.find(item=>item[0]===partner);
  return <dialog ref={ref} className="chart-concept-dialog chart-guide" aria-labelledby={titleId} onCancel={event=>{event.preventDefault();onClose();}} onKeyDown={event=>event.stopPropagation()}>
    <header><div><small>튜토리얼 · 가상 가격 그림</small><h2 id={titleId}>{titles[kind] || `${current[1]}, 나란히 비교해 보세요`}</h2></div><button type="button" aria-label="그림 설명 닫기" onClick={onClose}>×</button></header>
    <div className="chart-concept-body">
      {kind==='candle' ? <>
        <CandleStructure/>
        <CandleLengths/>
        <h3>색과 모양도 함께 보세요</h3><CandleShapes/>
        <CandlePreviousClose/>
      </> : kind==='comparisons' ? <>
        <h3>가격 축: 금액으로 볼까, 비율로 볼까?</h3>
        <Pair first={{title:'선형: 같은 금액, 같은 거리',rows:rise,text:'100 → 200 → 400 → 800. 오른 금액이 커지면서 선도 가팔라져요.'}} second={{title:'로그: 같은 비율, 같은 거리',rows:rise,scale:'log',text:'같은 가격이에요. 매번 2배씩 늘어나므로 같은 간격으로 보여요.'}}/>
        <h3>같은 시작이라도 결과는 달라져요</h3>
        <Pair first={{title:'돌파 뒤 유지',rows:asRows([...start,110,109,113]),level:106,domain:[94,116],text:'기준 가격대 위에서 움직인 예시예요.'}} second={{title:'돌파 뒤 되돌림',rows:asRows([...start,104,100,98]),level:106,domain:[94,116],text:'잠깐 넘었어도 다시 내려올 수 있어요. 다음 방향을 보장하지 않아요.'}}/>
        <h3>거래량: 몇 주가 거래됐을까?</h3>
        <Pair first={{title:'가격의 움직임',type:'candle',text:'한 봉의 시작·끝·높은 가격·낮은 가격을 보여줘요.'}} second={{title:'거래량의 크기',volume:true,text:'막대가 높으면 거래된 주식 수가 많아요. 빨강 전체가 매수량이라는 뜻은 아니에요.'}}/>
        <h3>이동평균: 짧으면 빠르게, 길면 부드럽게</h3>
        <Pair first={{title:'3기간 평균',average:3,text:'최근 변화에 빨리 반응하지만 더 흔들려요.'}} second={{title:'7기간 평균',average:7,text:'대체로 부드럽지만 변화에 늦게 반응해요. 보라색 선을 비교해 보세요.'}}/>
        <p className="chart-guide-callout">지표와 패턴은 관찰 도구예요. 성공한 모양만 골라 보지 말고, 반대 결과와 거래 비용도 함께 생각하세요.</p>
      </> : <>
        <p>{current[2]}</p><Pair first={{title:other[1],type:other[0],text:other[3]}} second={{title:current[1],type:current[0],text:current[3]}}/>
        <p className="chart-guide-callout">{kind==='bar'?'네 가격은 같아요. 몸통 대신 왼쪽·오른쪽 눈금으로 읽어요.':kind==='area'?'종가 선은 같아요. 아래를 채웠을 뿐, 거래량이 늘어난 것은 아니에요.':kind==='line'?'선은 종가만, 캔들은 네 가격을 보여줘요.':kind==='baseline'?'기준보다 위인지 아래인지 색으로 보여줘요. 기준은 조회 구간 첫 종가예요.':kind==='heikin'?'평균내어 만든 봉이에요. 실제 거래가격과 달라질 수 있어요.':'시간보다 가격 변화에 집중해요. 여기서는 종가 기준 4원 폭, 반전은 2벽돌로 비교했어요.'}</p>
        <p>{current[4]}</p>
      </>}
    </div>
    <footer><button type="button" onClick={onClose}>차트로 돌아가기</button></footer>
  </dialog>;
}
