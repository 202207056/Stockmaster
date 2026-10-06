import { Calculator, Info, Minus, Plus, RotateCw } from 'lucide-react';
import { useState } from 'react';
import AccountPicker from './AccountPicker';
import { InlineError } from './ErrorState';
import { estimateOrderCosts } from '../../utils/orderCosts';
import { numberOrNull } from '../../api/normalize';
import { won } from '../../utils/format';
import { ORDER_TYPES, ORDER_TYPE_HELP } from '../../utils/orderTypes';
import AutomationOrders from './AutomationOrders';
import MisuSummary from './MisuSummary';
import { estimateMisu } from '../../utils/misu';
import './TradingOrderForm.css';

export default function TradingOrderForm({ kind, setKind, priceType, setPriceType, limitPrice, setLimitPrice, quantity, setQuantity, price, costs, account, disabled, canSubmit, busy, enabled, onSubmit, error, message, book, resolvedPrice, onFirstInteraction, tutorial = false, tutorialStep, onCostsOpen, code, misu = false, onMisu, onCash, misuState, heldValue }) {
  const [showCosts, setShowCosts] = useState(false);
  const [execution, setExecution] = useState('immediate');
  const [automationLocked, setAutomationLocked] = useState(false);
  const Container = execution === 'immediate' ? 'form' : 'div';
  const intercept = event => {
    if (event.target.closest?.('[data-misu-control], [data-side="매도"]')) return;
    if (onFirstInteraction && (kind === '매수' || event.target.closest?.('[data-side="매수"]')) && onFirstInteraction()) { event.preventDefault(); event.stopPropagation(); }
  };
  const fieldPrefix = tutorial ? 'tutorial-trading-order' : 'trading-order';
  const cash = numberOrNull(account?.withdrawable_cash);
  const orderPrice = resolvedPrice === undefined ? (priceType === '지정가' ? Number(limitPrice) : price) : resolvedPrice;
  const maximumFor = (budget) => {
    if (!(orderPrice > 0) || budget === null || budget < 0) return 0;
    let low = 0;
    let high = Math.min(1_000_000, Math.floor(budget / (orderPrice * (misu ? 0.5 : 1))));
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      const estimate = estimateOrderCosts('매수', orderPrice, mid);
      if (estimate && (misu ? estimateMisu(orderPrice, mid, budget).required : estimate.settlement) <= budget) low = mid;
      else high = mid - 1;
    }
    return low;
  };
  const maximum = maximumFor(cash);
  const changePriceType = (value) => { setPriceType(value); if (value === '지정가' && !limitPrice && price) setLimitPrice(String(price)); };
  return <Container onSubmit={execution === 'immediate' ? onSubmit : undefined} onClickCapture={intercept} onChangeCapture={intercept} onKeyDownCapture={event => { if (!['Tab', 'Shift', 'Escape'].includes(event.key)) intercept(event); }} className={`trading-order ${kind === '매도' ? 'trading-order-sell' : ''}`}>
    <div className="trading-order-tabs" role="group" aria-label="주문 구분">
      {['매수', '매도'].map(side => <button key={side} data-side={side} type="button" disabled={disabled || automationLocked || (tutorial && side === '매도')} aria-pressed={kind === side} onClick={() => setKind(side)}>{side}</button>)}
      <span>모의투자</span>
    </div>
    <div className="trading-order-body">
      <fieldset disabled={disabled || automationLocked} className="trading-order-fields">
        {<label className="trading-order-execution">실행 방식<select aria-label="실행 방식" disabled={tutorial || misu} value={execution} onChange={event => { setExecution(event.target.value); if (event.target.value !== 'immediate') setPriceType('시장가'); }}><option value="immediate">즉시 주문</option><option value="scheduled">예약 주문</option><option value="condition">조건 주문</option></select></label>}
        <div data-tutorial-target="type" className={`trading-order-toolbar ${tutorialStep === 'types' ? 'buy-highlight' : ''}`}><label>주문유형 · <select aria-label="가격 종류" disabled={execution !== 'immediate' || misu} value={priceType} onChange={event => changePriceType(event.target.value)}>{ORDER_TYPES.map(type => <option key={type}>{type}</option>)}</select></label>{onMisu && kind === '매수' && execution === 'immediate' ? <button type="button" data-misu-control data-tutorial-target="misu" className="misu-toggle" aria-pressed={misu} onClick={misu ? onCash : onMisu}>{misu ? '미수 · 현금 전환' : '미수거래'}</button> : <span>현금</span>}</div>
        {misu && <MisuSummary cash={cash} price={orderPrice} quantity={Number(quantity)} state={misuState} heldValue={heldValue} />}
        {ORDER_TYPE_HELP[priceType] && <p className="trading-order-type-help">{ORDER_TYPE_HELP[priceType]}</p>}
        {book && <p className="trading-order-type-help">매수 1호가 {won(book.bid)} · 매도 1호가 {won(book.ask)}{book.observed_at && <span> · 조회 {new Date(book.observed_at).toLocaleTimeString('ko-KR')}</span>}</p>}
        <div data-tutorial-target="account" className={`trading-order-account ${tutorialStep === 'account' ? 'buy-highlight' : ''}`}><AccountPicker /></div>
        <div className="trading-order-balance"><span>주문가능 <Info size={15} aria-hidden="true" /></span><strong>{cash === null ? '—' : won(cash)}</strong></div>
        <div data-tutorial-target="price" className="trading-order-row"><label htmlFor={fieldPrefix + "-price"}>가격</label><div className="trading-order-stepper">
          <button type="button" aria-label="가격 내리기" disabled={priceType !== '지정가' || !(Number(limitPrice) > 1)} onClick={() => setLimitPrice(String(Math.max(1, Number(limitPrice) - 1)))}><Minus size={16} /></button>
          <div className="trading-order-price">{priceType === '지정가' ? <><input id={fieldPrefix + "-price"} aria-label="지정가 (원)" type="number" min="1" step="1" required value={limitPrice} onChange={event => setLimitPrice(event.target.value)} /><span>원</span></> : <output id={fieldPrefix + "-price"}>{orderPrice == null ? '가격 확인 필요' : won(orderPrice)}</output>}</div>
          <button type="button" aria-label="가격 올리기" disabled={priceType !== '지정가'} onClick={() => setLimitPrice(String(Math.max(1, Number(limitPrice) + 1)))}><Plus size={16} /></button>
        </div></div>
        <div data-tutorial-target="quantity" className={`trading-order-row ${tutorialStep === 'quantity' ? 'buy-highlight' : ''}`}><label htmlFor={fieldPrefix + "-quantity"}>수량</label><div className="trading-order-stepper">
          <button type="button" aria-label="수량 줄이기" disabled={Number(quantity) <= 1} onClick={() => setQuantity(String(Math.max(1, Number(quantity) - 1)))}><Minus size={16} /></button>
          <input id={fieldPrefix + "-quantity"} aria-label="수량" type="number" min="1" max="1000000" step="1" required placeholder={kind === '매수' ? `최대 ${maximum.toLocaleString('ko-KR')}주` : '수량 입력'} value={quantity} onChange={event => setQuantity(event.target.value)} />
          <button type="button" aria-label="수량 늘리기" disabled={Number(quantity) >= 1_000_000} onClick={() => setQuantity(String(Math.min(1_000_000, Number(quantity) + 1)))}><Plus size={16} /></button>
        </div></div>
        {kind === '매수' && <><p className="trading-order-maximum">{cash === null ? '주문가능 금액 확인 필요' : `${misu ? '증거금 50%·수수료 기준' : '수수료 포함'} 최대 ${maximum.toLocaleString('ko-KR')}주`}</p><div className="trading-order-percent" role="group" aria-label="주문가능 금액 비율">{[10, 20, 50, 75, 100].map(percent => <button key={percent} type="button" disabled={cash === null || maximumFor(cash * percent / 100) < 1} onClick={() => setQuantity(String(maximumFor(cash * percent / 100)))}>{percent}%</button>)}</div></>}
        <div className="trading-order-row trading-order-amount"><span>금액</span><div><output>{costs ? won(costs.gross) : '금액'}</output><button type="button" aria-label="수량 초기화" onClick={() => setQuantity('1')}><RotateCw size={18} /></button></div></div>
      </fieldset>
      {(!enabled || priceType !== '시장가') && <div className="trading-order-notice">{!enabled ? '모의 주문은 점검 중입니다.' : priceType === '지정가' ? '지정가는 대기로 접수됩니다. 내역의 체결 확인으로 호가를 확인할 수 있습니다. 현금·수량은 예약되지 않습니다.' : '모의 호가 주문: 최우선 호가 잔량으로 전량 체결 가능할 때만 체결합니다. 나머지는 대기하며, 내역의 체결 확인 때 중간가도 갱신됩니다. 현금·수량 예약과 자동 감시는 지원하지 않습니다.'}</div>}
      {(showCosts || tutorialStep === 'costs') && <div id={fieldPrefix + "-costs"} className={`trading-order-costs ${tutorialStep === 'costs' ? 'buy-highlight' : ''}`} ><p>예상 수수료: {costs ? won(costs.commission) : '—'} · 거래세: {costs ? won(costs.tax) : '—'}</p><p>예상 {kind === '매수' ? '출금액' : '입금액'}: {costs ? won(costs.settlement) : '—'}</p><small>사이트 모의 수수료 0.015% · 매도 거래세 0.18% · 원 단위 반올림. 실제 증권사·상품별 비용과 다릅니다.</small></div>}
      <InlineError error={error} />{message && <p role="status" className="text-sm">{message}</p>}
      {execution === 'immediate' ? <div className="trading-order-actions"><button type="button" data-tutorial-target="costs" className="trading-order-calculator" aria-label="예상 비용 계산 내역" aria-expanded={showCosts} aria-controls={fieldPrefix + "-costs"} onClick={() => { setShowCosts(!showCosts); onCostsOpen?.(); }}><Calculator size={23} /></button><button type="submit" disabled={!canSubmit} data-tutorial-target="submit" className="trading-order-submit">{busy ? '주문 처리 중…' : `모의 ${kind}`}</button></div> : <AutomationOrders key={`${account?.account_id}:${code}:${execution}`} code={code} embedded onLockChange={setAutomationLocked} execution={execution} side={kind} quantity={quantity} />}
    </div>
  </Container>;
}
