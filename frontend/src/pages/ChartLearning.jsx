import { Link } from 'react-router-dom';
import research from '../constants/chartResearch.json';
import { CHART_GUIDE_TYPES as types } from '../constants/chartGuideContent';
import { CandleShapes, CandleLengths } from '../components/learn/CandleDetails';
import ChartComparison, { CandleAnatomy } from '../components/learn/ChartComparison';
import '../components/learn/ChartLearning.css';
import '../components/learn/ChartGuide.css';

const asRows = values => values.map(close=>({open:close,high:close+2,low:close-2,close}));
const rising = asRows([100,200,400,800]);
const start = [100,104,101,105,102,104,108];
function Figure({ title, children, note, ...props }) {
  return <figure className="chart-compare-figure"><ChartComparison label={title} {...props}/><figcaption><strong>{title}</strong><p>{children}</p>{note && <small>{note}</small>}</figcaption></figure>;
}
function Section({ id, title, intro, children }) {
  return <section id={id} className="chart-guide-section"><div className="chart-section-heading"><h2>{title}</h2><p>{intro}</p></div>{children}</section>;
}
export default function ChartLearning() {
  return <div className="chart-guide">
    <header className="chart-guide-header"><div><span className="chart-guide-eyebrow">CHART GUIDE</span><h1>차트, 그림으로 비교해 보기</h1><p>같은 가격도 그리는 방법에 따라 다르게 보입니다.<br/>그림 옆의 설명을 읽으며, 무엇이 보이고 무엇이 생략되는지 비교해 보세요.</p></div><Link to="/trading?chartTour=1" className="chart-guide-replay">트레이딩에서 직접 보기 ↗</Link></header>
    <nav className="chart-guide-nav" aria-label="차트 비교 주제">{[['shapes','그래프 종류'],['candles','캔들 읽기'],['settings','시간과 가격 축'],['patterns','추세와 패턴'],['indicators','거래량과 지표'],['cautions','해석할 때 주의할 점']].map(([id,label])=><a key={id} href={`#${id}`}>{label}</a>)}</nav>
    <p className="chart-guide-caption">그림은 이해를 돕기 위해 직접 만든 가상 가격입니다. 실제 종목이나 수익률 사례가 아닙니다.</p>
    <Section id="shapes" title="같은 가격, 일곱 가지 그림" intro="앞의 다섯 유형은 원래 가격을 표시하고, 마지막 두 유형은 가격을 가공합니다.">
      <div className="chart-type-grid">{types.map(([id,title,use,description,caution])=><article className="chart-type-card" key={id}><div className="chart-type-title"><h3>{title}</h3><span>{['heikin','renko'].includes(id)?'가공한 가격':'원래 가격'}</span></div><ChartComparison type={id} label={`${title} 비교 예시`}/><strong>{use}</strong><p>{description}</p><small>{caution}</small></article>)}</div>
      <p className="chart-guide-callout">꺾은선 → 영역은 <strong>종가는 그대로, 채움만 추가</strong>. 캔들 → OHLC 바는 <strong>네 가격은 그대로, 모양만 변경</strong>. 하이킨아시·렌코는 <strong>계산 방식 자체가 달라집니다.</strong></p>
    </Section>
    <Section id="candles" title="캔들 하나에 담긴 네 가격" intro="색보다 먼저 시작과 끝을 보세요. 봉 하나는 선택한 시간 동안의 거래를 요약합니다.">
      <div className="chart-explain-pair"><figure className="chart-anatomy-card"><CandleAnatomy/><figcaption>시가: 첫 가격 · 종가: 마지막 가격<br/>고가: 가장 높은 가격 · 저가: 가장 낮은 가격</figcaption></figure><div className="chart-explain-copy"><h3>양봉이어도 어제보다 떨어질 수 있어요.</h3><div className="chart-price-comparison"><span>어제 종가<b>10,000원</b></span><span>오늘 시가<b>9,500원</b></span><span>오늘 종가<b>9,800원</b></span></div><p><strong className="chart-up">오늘 시작보다 +300원 → 양봉</strong><br/><strong className="chart-down">어제 마감보다 −200원 → 전일 대비 −2%</strong></p><p>봉 색은 시가와 종가의 관계입니다. 전일 대비 등락과 비교 기준이 달라요. 색상 규칙은 서비스마다 다를 수 있습니다.</p><small>같은 네 가격이라도 고가를 먼저 찍었는지, 저가를 먼저 찍었는지는 알 수 없습니다.</small></div></div>
    </Section>
    <section className="chart-guide-section"><div className="chart-section-heading"><h2>자주 보이는 봉 모양</h2><p>몸통은 시작과 끝의 차이, 꼬리는 그 밖으로 움직인 범위입니다.</p></div><CandleShapes/><CandleLengths/><p className="chart-guide-caption">긴 꼬리나 도지 하나만으로 다음 상승·하락을 확정할 수는 없습니다.</p></section>
    <Section id="settings" title="같은 움직임도 설정에 따라 달라져요" intro="조회 기간은 화면에 담을 범위, 봉 단위는 봉 하나로 묶는 시간입니다.">
      <div className="chart-compare-pair"><Figure title="선형 축 · 같은 금액이 같은 거리" rows={rising}>100 → 200 → 400 → 800. 증가한 금액이 커질수록 선이 가팔라집니다.</Figure><Figure title="로그 축 · 같은 비율이 같은 거리" rows={rising} scale="log">같은 가격을 그렸습니다. 매번 2배씩 늘어 같은 간격으로 보입니다.</Figure></div>
      <div className="chart-note-grid"><div><h3>1년 보기 ≠ 1년봉</h3><p>최근 1년을 일봉으로 보면 봉 하나가 하루입니다. 주봉은 그 주의 첫 시가·최고가·최저가·마지막 종가를 묶습니다.</p></div><div><h3>설정부터 맞춰 비교하세요</h3><p>분할·배당 조정, 거래시간, 데이터 출처가 다르면 차트도 달라집니다. 아직 마감하지 않은 봉은 모양이 계속 바뀔 수 있어요.</p></div></div>
    </Section>
    <Section id="patterns" title="선을 넘었다고 결과가 정해지지는 않아요" intro="지지·저항은 가격이 자주 반응했던 구간입니다. 반드시 지켜지는 벽이 아닙니다.">
      <div className="chart-compare-pair"><Figure title="돌파 뒤 높은 가격을 유지한 예시" rows={asRows([...start,110,109,113])} level={106} domain={[94,116]}>고점과 저점이 높아집니다. 다만 그림이 끝난 뒤의 방향까지 보장하지는 않습니다.</Figure><Figure title="같은 시작, 다시 내려온 예시" rows={asRows([...start,104,100,98])} level={106} domain={[94,116]}>앞부분은 같습니다. 잠깐 넘은 것과 마감 뒤에도 유지한 것은 구분해야 합니다.</Figure></div>
      <div className="chart-note-grid"><div><h3>모양 + 위치 + 후속 움직임</h3><p>망치형·도지·장악형 같은 캔들 이름이나 이중바닥·삼각형 같은 패턴 이름만으로 판단하지 마세요. 선행 추세와 가격 위치, 실패 조건을 같이 읽습니다.</p></div><div><h3>갭도 원인과 맥락부터</h3><p>가격이 떨어져 보이는 구간은 뉴스·거래시간·기업행동 조정을 확인하세요. 모든 갭이 메워지는 것은 아니며, ‘소진 갭’ 같은 분류는 이후 결과를 봐야 알 수 있습니다.</p></div></div>
    </Section>
    <Section id="indicators" title="거래량과 지표는 서로 다른 질문에 답해요" intro="가격은 얼마에 거래됐는지, 거래량은 몇 주가 거래됐는지를 보여줍니다.">
      <div className="chart-compare-pair"><Figure title="가격의 흐름" type="candle">빨강은 시가보다 높은 종가, 파랑은 낮은 종가입니다.</Figure><Figure title="같은 구간의 거래량" volume>막대 높이는 거래된 주식 수입니다. 빨강 전체가 매수량인 것은 아니에요. 체결에는 매수자와 매도자가 함께 있습니다.</Figure></div>
      <div className="chart-compare-pair"><Figure title="짧은 이동평균 · 3기간 예시" average={3}>보라색 선은 최근 종가의 평균입니다. 짧은 기간은 변화에 빠르게 반응하지만 흔들림도 큽니다.</Figure><Figure title="긴 이동평균 · 7기간 예시" average={7}>같은 데이터에 더 긴 평균을 썼습니다. 대체로 부드럽지만 반응이 늦고, 필요한 봉 수가 모이기 전에는 표시하지 않습니다.</Figure></div>
      <div className="chart-indicator-list">{[['RSI · 스토캐스틱','최근 움직임의 강도','값이 높다고 즉시 하락하는 것은 아닙니다.'],['볼린저 밴드 · ATR','가격의 변동 폭','변동성이 크다는 것과 상승한다는 것은 다릅니다.'],['MACD · ADX','추세의 변화·강도','MACD는 이동평균 관계, ADX는 방향이 아닌 강도를 봅니다.'],['매물대 · 호가','과거 거래 분포 · 대기 주문','현재 보유자의 정확한 매입 원가를 뜻하지 않습니다.']].map(([name,question,caution])=><div key={name}><h3>{name}</h3><span>{question}</span><p>{caution}</p></div>)}</div>
    </Section>
    <Section id="cautions" title="그림을 읽을 때 놓치기 쉬운 것" intro="관찰한 사실과 앞으로의 예상을 나누면 차트를 덜 과신할 수 있습니다.">
      <div className="chart-note-grid"><div><h3>관찰과 예상을 분리하기</h3><p>‘이전 고점을 넘었다’는 관찰, ‘계속 오른다’는 예상입니다. 반대로 움직이면 어떤 해석을 버릴지도 함께 생각하세요.</p></div><div><h3>과거의 정답을 미리 알았다고 생각하지 않기</h3><p>성공 사례만 고르거나 미래 봉으로 확정된 신호를 과거 시점의 신호로 쓰면 결과가 왜곡됩니다. 지그재그·일부 피벗은 나중에 표시가 바뀝니다.</p></div><div><h3>승률보다 비용을 뺀 전체 손익</h3><p>10번 중 6번 +1, 4번 −2라면 합계는 −2입니다. 자주 맞혀도 손실 크기와 수수료·세금에 따라 손익은 나빠질 수 있어요.</p></div><div><h3>손절 기준은 체결 보장이 아니에요</h3><p>갭·거래 정지·유동성 부족 때문에 계획보다 불리한 가격에 체결될 수 있습니다. 합성 차트의 표시 가격도 실제 주문 가격으로 가정하면 안 됩니다.</p></div></div>
    </Section>
    <section className="chart-guide-reference"><h2>더 자세히 읽고 싶다면</h2><p>필요한 주제만 펼쳐서 정의와 비교표를 확인하세요.</p>{research.sections.filter(section=>section.number<=14).map(section=><details key={section.number}><summary>{section.title}</summary><div className="chart-reading">{section.blocks.map((block,i)=>block.type==='table'?<div className="chart-table-wrap" key={i}><table><thead><tr>{block.rows[0].map((cell,j)=><th key={j}>{cell}</th>)}</tr></thead><tbody>{block.rows.slice(1).map((row,r)=><tr key={r}>{row.map((cell,c)=><td key={c}>{cell}</td>)}</tr>)}</tbody></table></div>:<p key={i}>{block.text}</p>)}</div></details>)}</section>
    <details className="chart-sources"><summary>자료 출처</summary><p>{research.source} · 조사 기준일 {research.researchDate}. 정의와 전통적 해석, 실증 근거를 구별합니다. 그림은 자체 제작했으며 패턴 성공률을 측정한 결과가 아닙니다.</p><ol>{research.sources.map((url,i)=><li key={url}><a href={url} target="_blank" rel="noreferrer">[{i+1}] {new URL(url).hostname} · 원문 보기</a></li>)}</ol><p>틱·풋프린트 등 세부 체결 데이터가 필요한 유형은 현재 OHLC만으로 만들어 표시하지 않습니다.</p></details>
    <div className="chart-learning-links"><Link to="/trading?chartTour=1">실제 차트 화면에서 유형 비교하기 ↗</Link><Link to="/learn">학습 홈으로</Link></div>
  </div>;
}
