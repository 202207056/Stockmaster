import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AuthContext } from '../contexts/auth-context';
import TradingOrderForm from '../components/common/TradingOrderForm';
import { estimateOrderCosts } from '../utils/orderCosts';
import './BuyTutorial.css';
import '../components/common/Misu.css';

const STEPS = [
  ['[data-tutorial-target=misu]', '내 돈보다 큰 손실이 날 수 있어요', '미수거래는 내 현금보다 많은 주식을 사고, 부족한 돈을 결제일까지 채우는 방식이에요. 주가 하락과 납부기한을 함께 감당해야 해요. 이 체험은 계좌에 주문을 보내지 않아요.'],
  ['[data-tutorial-target=quantity]', '4주로 바꾸어 보세요', '예시 계좌에는 100,030원이 있어요. 50,000원짜리 주식을 4주 사면 주식값은 200,000원이에요. 수량에 4를 입력해 보세요.'],
  ['[data-tutorial-target=submit]', '부족한 100,000원은 나중에 채워야 해요', '주식값 200,000원에 수수료 30원을 더하면 200,030원. 내 현금 100,030원을 모두 써도 100,000원이 부족해요. 모의 매수를 눌러 예시 주문을 체험하세요.'],
  ['[data-tutorial-target=misu-summary] dl', '주가는 10% 하락, 내 돈은 약 20% 감소', '주식 평가액은 180,000원으로 줄었지만 갚을 돈은 여전히 100,000원이에요. 내 몫은 80,000원. 시작할 때의 100,030원보다 20,030원이 줄었어요. 빌려 쓴 금액 때문에 내 돈의 손실 비율이 커져요.'],
  ['[data-tutorial-target=misu-summary] dl', '주식을 팔아도 결제 날짜를 봐야 해요', '휴일이 없는 주를 가정하면 월요일 매수의 결제일은 수요일이에요. 화요일에 판 돈은 목요일에 결제되어 수요일 부족금을 제때 채우지 못할 수 있어요. 실제 입금 마감 시각은 증권사마다 달라요.'],
  ['[data-tutorial-target=misu-summary] dl', '강제로 팔아도 빚이 남을 수 있어요', '기한을 넘기고 주가가 크게 하락한 예시예요. 반대매매는 원하는 가격을 기다려주지 않아요. 팔 주식이 부족하거나 거래정지·매수자 부족으로 팔리지 않으면 부족금이 계속 남을 수도 있어요.'],
  ['[data-tutorial-target=misu]', '미수와 현금 주문, 무엇이 달랐나요?', '현금 주문은 결제할 돈을 갖고 시작해요. 미수 주문은 부족한 돈을 기한 안에 채워야 해요. 실제 시장에서는 미수동결과 연체 비용이 생길 수 있어요. 감당할 수 있는지 확신이 없다면 현금 주문을 유지하세요.'],
];

export default function MisuTutorial({ onClose, onEnable }) {
  const surface = useRef(null);
  const note = useRef(null);
  const spotlight = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const restored = [];
    let branch = surface.current;
    while (branch && branch !== document.body) {
      for (const sibling of branch.parentElement?.children || []) {
        if (sibling === branch || !(sibling instanceof HTMLElement)) continue;
        restored.push([sibling, sibling.inert]);
        sibling.inert = true;
      }
      branch = branch.parentElement;
    }
    const keys = event => {
      if (surface.current?.querySelector('dialog[open]')) return;
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current?.(); }
      if (event.key !== 'Tab') return;
      const controls = [...surface.current.querySelectorAll('button, a[href], input, select, [tabindex="0"]')]
        .filter(node => !node.matches(':disabled') && !node.closest('[hidden], [inert]') && !node.inert && node.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {
        event.preventDefault(); last?.focus({ preventScroll: true });
      } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) {
        event.preventDefault(); first?.focus({ preventScroll: true });
      }
    };
    document.addEventListener('keydown', keys);
    return () => {
      restored.forEach(([node, inert]) => { node.inert = inert; });
      document.removeEventListener('keydown', keys);
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, []);

  const [step, setStep] = useState(0);
  const [quantity, setQuantity] = useState('2');
  const [selector, title, text] = STEPS[step];
  const advance = () => setStep(value => Math.min(value + 1, STEPS.length - 1));
  const cash = step >= 3 && step <= 5 ? 0 : 100030;
  const account = { account_id: 'misu-example', account_name: '미수 체험 계좌', withdrawable_cash: cash };
  const examplePrice = step === 3 || step === 4 ? 45000 : step === 5 ? 20000 : 50000;
  const costs = estimateOrderCosts('매수', examplePrice, Number(quantity));
  useLayoutEffect(() => {
    const target = surface.current.querySelector(selector);
    const popup = note.current;
    const outline = spotlight.current;
    if (!target || !popup || !outline) return;
    const inactive = [...surface.current.querySelectorAll('.trading-order button, .trading-order input, .trading-order select')]
      .filter(control => !target.contains(control) && target !== control);
    inactive.forEach(control => { control.inert = true; });
    const position = () => {
      const rect = target.getBoundingClientRect();
      const width = document.documentElement.clientWidth || window.innerWidth;
      const height = window.innerHeight;
      Object.assign(outline.style, { left: rect.left - 5 + 'px', top: rect.top - 5 + 'px', width: rect.width + 10 + 'px', height: rect.height + 10 + 'px' });
      popup.style.width = Math.min(300, width - 24) + 'px';
      const box = popup.getBoundingClientRect();
      const naturalHeight = Math.min(popup.scrollHeight + 2, height - 24);
      let availableHeight = height - 24;
      let left = rect.left - box.width - 18;
      let top = rect.top;
      if (left < 12) {
        if (rect.right + box.width + 18 < width - 12) left = rect.right + 18;
        else {
          left = Math.max(12, Math.min(rect.left, width - box.width - 12));
          const below = height - rect.bottom - 18;
          const above = rect.top - 18;
          const useBelow = below >= naturalHeight || below >= above;
          availableHeight = Math.max(80, (useBelow ? below : above) - 12);
          top = useBelow ? rect.bottom + 18 : rect.top - Math.min(naturalHeight, availableHeight) - 18;
        }
      }
      popup.style.maxHeight = availableHeight + 'px';
      Object.assign(popup.style, { left: left + 'px', top: Math.max(12, Math.min(top, height - popup.getBoundingClientRect().height - 12)) + 'px' });
    };
    position();
    const resize = () => {
      position();
    };
    const control = target.matches('button, select, input') ? target : target.querySelector('select, input, button:not(:disabled)');
    (control || popup.querySelector('button:not(.buy-tutorial-close)') || popup.querySelector('button'))?.focus({ preventScroll: true });
    const observer = new ResizeObserver(resize);
    observer.observe(target); observer.observe(popup);
    observer.observe(surface.current);
    const form = surface.current.querySelector('.trading-order');
    if (form) observer.observe(form);
    // Layout/content changes can move the target without resizing the target itself.
    const mutations = new MutationObserver(position);
    if (form) mutations.observe(form, { childList: true, characterData: true, subtree: true });
    window.visualViewport?.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('scroll', position);
    const onScroll = event => { if (!popup.contains(event.target)) position(); };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', resize);
    return () => {
      inactive.forEach(control => { control.inert = false; });
      observer.disconnect();
      mutations.disconnect();
      window.visualViewport?.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('scroll', position);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', resize);
    };
  }, [selector, step]);

  const context = { isAuthenticated: true, accountId: account.account_id, account, accounts: [account], selectAccount: () => {} };
  return <div ref={surface} className="buy-tutorial-inline" role="dialog" aria-modal="true" aria-label="미수거래 체험">
    <AuthContext.Provider value={context}>
      <TradingOrderForm tutorial kind="매수" setKind={() => {}} priceType="시장가" setPriceType={() => {}} limitPrice="50000" setLimitPrice={() => {}}
        price={examplePrice} resolvedPrice={examplePrice} quantity={quantity} setQuantity={value => { setQuantity(value); if (step === 1 && Number(value) === 4) advance(); }}
        costs={costs} account={account} canSubmit={step === 2} enabled onSubmit={event => { event.preventDefault(); if (step === 2) advance(); }}
        misu={step > 0 && step < 6} onMisu={() => { if (step === 0) advance(); }} onCash={() => {}}
        misuState={step >= 3 && step <= 5 ? { debt: 100000, due_at: '2026-10-14T08:00:00Z' } : undefined} heldValue={step === 3 ? 180000 : step === 5 ? 80000 : undefined} />
    </AuthContext.Provider>
    <div ref={spotlight} className="buy-tutorial-spotlight" aria-hidden="true" />
    <aside ref={note} className="buy-tutorial-note misu-tutorial-note" aria-live="polite">
      <button type="button" className="buy-tutorial-close" aria-label="미수 체험 종료" onClick={onClose}>×</button>
      <h3>{title}</h3><p>{text}</p>
      {step === 0 && <p className="misu-danger">반대매매 · 원금 초과 손실 · 미수 이용 제한</p>}
      {step === 4 && <div className="misu-risk-picture">월요일 매수 → <strong>수요일 납부</strong><br />화요일 매도 → <strong>목요일 입금</strong><p>국내 주식 T+2는 달력의 이틀이 아니라 거래일 기준이에요. 주말·휴장일은 제외해요.</p></div>}
      {step === 5 && <div className="misu-risk-picture"><dl><div><dt>60% 하락 후 4주 매도</dt><dd>80,000원</dd></div><div><dt>매도 수수료 + 세금</dt><dd>156원</dd></div><div><dt>갚는 데 쓸 돈</dt><dd>79,844원</dd></div><div><dt>모두 팔고도 남은 빚</dt><dd className="misu-danger">20,156원</dd></div></dl><small>사이트 모의 요율 기준. 연체료·이자는 제외한 예시예요.</small></div>}
      {step === 0 && <p><strong>매수 창의 ‘미수거래’를 눌러 차이를 체험해 보세요.</strong></p>}
      {step === 6 && <p className="misu-risk-picture">실제 미수동결은 원칙적으로 30일간 현금 증거금 100%를 적용해요. 소액 등 예외가 있으며 전 증권사에 적용될 수 있어요. 이 사이트는 소액 예외 없이 해당 모의계좌만 30일 제한해요.</p>}
      {step >= 3 && <div className="misu-note-actions">
        {step < 6 ? <button type="button" className="misu-next" onClick={advance}>{step === 3 ? '결제 날짜 비교하기' : step === 4 ? '기한을 넘긴 경우 보기' : '현금 주문과 비교 마무리'}</button>
          : <><button type="button" className="misu-next" onClick={onClose}>체험 종료 · 현금 유지</button>{onEnable && <button type="button" onClick={onEnable}>위험 확인 · 미수 선택</button>}</>}
      </div>}
    </aside>
  </div>;
}
