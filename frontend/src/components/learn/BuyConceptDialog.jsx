import { useEffect, useId, useRef, useState } from 'react';
import QuoteOrderPractice from './QuoteOrderPractice';

// Teaching scenarios only: no account mutation or order API.
export default function BuyConceptDialog({ kind, onContinue, onExit, surfaceRef }) {
  const dialog = useRef(null);
  const bubble = kind === 'fees';
  const Container = bubble ? 'section' : 'dialog';
  const titleId = useId();
  const [ask, setAsk] = useState(50100);
  const [answer, setAnswer] = useState(null);
  const [feeAnswer, setFeeAnswer] = useState(null);
  const [quoteReady, setQuoteReady] = useState(false);
  const quoteLesson = ['midResult', 'bestResult', 'ownResult'].includes(kind);
  useEffect(() => {
    const element = dialog.current;
    if (!bubble) {
      element.showModal();
      return () => element.close();
    }
    const target = surfaceRef.current.querySelector('[data-tutorial-target="costs"]');
    const position = () => {
      const rect = target.getBoundingClientRect();
      const width = document.documentElement.clientWidth || window.innerWidth;
      element.style.width = Math.min(580, width - 24) + 'px';
      element.style.maxHeight = Math.max(120, window.innerHeight - 24) + 'px';
      const box = element.getBoundingClientRect();
      const left = rect.left - box.width - 12 >= 12 ? rect.left - box.width - 12 : rect.right + box.width + 12 <= width - 12 ? rect.right + 12 : 12;
      element.style.left = left + 'px';
      element.style.top = Math.max(12, Math.min(rect.top, window.innerHeight - box.height - 12)) + 'px';
    };
    position();
    element.focus({ preventScroll:true });
    const observer = new ResizeObserver(position);
    observer.observe(target); observer.observe(element); observer.observe(surfaceRef.current);
    window.addEventListener('resize',position);
    window.addEventListener('scroll',position,true);
    return () => { observer.disconnect(); window.removeEventListener('resize',position); window.removeEventListener('scroll',position,true); };
  }, [bubble, surfaceRef]);
  const titles = { intro: '같은 주식, 주문 방법에 따라 결과가 달라져요', marketResult: '시장가: 최근 가격이 아닌, 지금 팔겠다는 가격', limitResult: '지정가: 가격 한도를 지키는 대신 기다려요', fees: '주식값과 계좌에서 나가는 돈은 달라요' };
  const limitFilled = ask <= 50000;
  const canContinue = quoteLesson ? quoteReady : kind === 'limitResult' ? limitFilled && answer === 'limit' : kind === 'fees' ? feeAnswer === 'short' : true;
  return <>{bubble && <div className="buy-fees-dismiss" aria-hidden="true" onClick={onContinue}/>}<Container ref={dialog} tabIndex={bubble ? -1 : undefined} role={bubble ? 'region' : undefined} className={`buy-concept-dialog ${bubble ? 'buy-fees-bubble' : ''}`} onKeyDown={event=>{if(bubble && event.key==='Escape'){event.preventDefault();event.stopPropagation();onContinue();}}} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onExit?.(); }}>
    {!bubble && <button type="button" className="buy-concept-close" aria-label="연습 종료" onClick={onExit}>×</button>}
    <p className="buy-concept-eyebrow">가상 비교 체험 · 실제 계좌에 반영되지 않아요</p>
    <h2 id={titleId}>{titles[kind] || { midResult: '중간가: 두 호가 사이의 가격', bestResult: '최유리지정가: 상대편 호가로 가격 정하기', ownResult: '최우선지정가: 같은 편 호가에서 기다리기' }[kind]}</h2>
    {quoteLesson && <QuoteOrderPractice kind={kind} onReady={setQuoteReady} />}
    {kind === 'intro' && <>
      <p>화면의 <strong>현재가</strong>는 최근 거래된 가격입니다. 지금 내가 살 수 있는 가격과 항상 같지는 않아요. <strong>호가</strong>는 사람들이 사거나 팔겠다고 내놓은 가격입니다.</p>
      <dl><dt>최근 거래된 가격</dt><dd>50,000원</dd><dt>지금 가장 싸게 팔겠다는 가격</dt><dd>50,100원 · 100주</dd></dl>
      <p>같은 상황에서 1주를 두 가지 방법으로 주문해 볼게요.</p>
      <ul><li><strong>시장가:</strong> 가격을 직접 정하지 않고 지금 나온 매도 주문과 거래합니다.</li><li><strong>지정가:</strong> 내가 낼 최대 가격을 정합니다. 그 가격에 파는 사람이 없으면 기다립니다.</li></ul>
      <p className="buy-concept-caption">비교 체험은 매도 물량이 충분하고 다른 주문이 없는 상황입니다. 실제로는 물량·주문 순서·시세 변화에 따라 결과가 달라집니다. 비교 주문은 잔고를 차감하지 않습니다.</p>
    </>}
    {kind === 'marketResult' && <>
      <div className="buy-concept-result"><strong>1주 · 50,100원에 가상 체결</strong><span>최근 거래가보다 100원 높게 샀어요.</span></div>
      <p>가격을 정하지 않았으므로, 지금 팔겠다는 주문 중 가장 낮은 50,100원과 거래했습니다. 현재가 50,000원에 사는 것을 보장하는 주문은 아닙니다.</p>
      <p>물량이 부족하면 여러 가격에 나뉘어 거래될 수 있습니다. 시장가는 체결을 우선하지만, 언제나 즉시 전량 체결되는 것은 아닙니다.</p>
      <p><strong>이번에는 같은 시세에서 50,000원 지정가로 주문해 보세요.</strong></p>
      <p className="buy-concept-caption">여기서는 호가 차이를 설명하는 별도 비교 시뮬레이션을 사용합니다. 사이트의 일반 모의 시장가 주문은 서버 현재가로 전량 체결합니다. 표시한 비교 가격은 수수료를 제외한 주식값입니다.</p>
    </>}
    {kind === 'limitResult' && <>
      <dl><dt>내 매수 한도</dt><dd>50,000원</dd><dt>가장 낮은 매도 호가</dt><dd>{ask.toLocaleString('ko-KR')}원</dd></dl>
      <div className="buy-concept-result" role="status"><strong>{limitFilled ? '1주 · 49,900원에 가상 체결' : '미체결 · 아직 사지 못했어요'}</strong><span>{limitFilled ? '한도보다 싼 매도 주문이 나와 그 가격에 샀어요.' : '50,100원은 내가 정한 50,000원 한도를 넘습니다.'}</span></div>
      {!limitFilled ? <><p>시장가는 이 상황에서 50,100원에 샀지만, 지정가는 비싸게 사지 않고 기다립니다. 가격이 내려오지 않으면 끝내 체결되지 않을 수 있어요.</p><button type="button" onClick={() => setAsk(49900)}>매도 호가를 49,900원으로 내려 보기</button></> : <>
        <p>지정가는 꼭 입력한 가격으로 사는 주문이 아닙니다. <strong>매수 한도 이하</strong>에서 거래할 수 있습니다. 이번에는 대기 중인 다른 주문이 없고 매도 물량이 충분하다고 가정했습니다.</p>
        <table><caption>처음과 같은 매도 호가 50,100원에서 비교</caption><thead><tr><th>주문</th><th>결과</th></tr></thead><tbody><tr><td>시장가</td><td>50,100원에 체결</td></tr><tr><td>50,000원 지정가</td><td>한도를 넘어 미체결</td></tr></tbody></table>
        <fieldset><legend>50,000원을 넘겨 사고 싶지 않다면?</legend><button type="button" onClick={() => setAnswer('market')}>시장가로 주문</button><button type="button" onClick={() => setAnswer('limit')}>50,000원 지정가로 주문</button></fieldset>
        {answer && <p role="status">{answer === 'limit' ? '맞아요. 가격 한도를 지킬 수 있지만, 체결되지 않을 가능성도 받아들여야 해요.' : '시장가는 매수 가격의 상한을 정하지 않아요. 가격 한도를 정할 수 있는 주문을 골라 보세요.'}</p>}
      </>}
    </>}
    {kind === 'fees' && <>
      <p>수수료는 거래를 처리하는 데 드는 비용입니다. 주식값에 포함되어 있다고 생각하면 필요한 현금을 적게 계산할 수 있어요.</p>
      <dl><dt>주식값 · 50,000원 × 2주</dt><dd>100,000원</dd><dt>모의 수수료 · 100,000원 × 0.015%</dt><dd>15원</dd><dt>이 매수의 거래세</dt><dd>0원</dd><dt><strong>계좌에서 나갈 합계</strong></dt><dd><strong>100,015원</strong></dd></dl>
      <p>0.015%는 0.00015를 곱한다는 뜻입니다. 이 사이트는 원 단위로 반올림합니다. 실제 비용은 증권사·계좌·상품·거래 방법에 따라 달라지므로 주문 전 비용 내역을 확인해야 합니다.</p>
      <fieldset><legend>현금이 정확히 100,000원이라면 2주를 살 수 있을까요?</legend><button type="button" onClick={() => setFeeAnswer('enough')}>주식값이 있으니 살 수 있어요</button><button type="button" onClick={() => setFeeAnswer('short')}>수수료 15원이 부족해요</button></fieldset>
      {feeAnswer && <p role="status">{feeAnswer === 'short' ? '맞아요. 100,015원이 필요합니다. 주가가 그대로여도 수수료만큼 총자산은 줄어들어요. 수수료는 수익이 났을 때만 내는 돈이 아닙니다.' : '주식값은 맞지만 수수료도 현금으로 내야 해요. 주식값과 수수료를 더해 다시 생각해 보세요.'}</p>}
      <p className="buy-concept-caption">현재 연습 계좌는 1,000,000원이므로 주문할 수 있습니다. 100,000원은 이해 확인을 위한 가정이며 계좌 잔고를 바꾸지 않습니다.</p>
    </>}
    <div className="buy-concept-actions"><button type="button" disabled={!canContinue} onClick={onContinue}>{quoteLesson ? { midResult: '최유리지정가 체험하기', bestResult: '최우선지정가 체험하기', ownResult: '수량과 비용 배우기' }[kind] : kind === 'intro' ? '시장가부터 체험하기' : kind === 'marketResult' ? '같은 시세에서 지정가 체험하기' : kind === 'fees' ? '비용 확인하고 주문하기' : '다른 주문유형도 살펴보기'}</button></div>
    <a className="buy-concept-source" href="https://regulation.krx.co.kr/contents/RGL/03/03020204/RGL03020204.jsp" target="_blank" rel="noreferrer">한국거래소 주문유형 안내</a>
  </Container></>;
}
