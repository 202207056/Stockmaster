import TutorialPointer from '../components/learn/TutorialPointer';
import './TradingTutorial.css';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AuthContext } from '../contexts/auth-context';
import { TutorialRunning } from '../components/learn/tutorial-context';
import TradingOrderForm from '../components/common/TradingOrderForm';
import OrderDialog from '../components/common/OrderDialog';
import { resolveOrderPrice, completeBuyTutorial, BUY_TUTORIAL_KEY } from '../utils/orderTypes';
import { estimateOrderCosts } from '../utils/orderCosts';
import BuyConceptDialog from '../components/learn/BuyConceptDialog';
import './BuyTutorial.css';

const BOOK = { bid: 49900, ask: 50100, bid_quantity: 100, ask_quantity: 100 };
const INITIAL_ACCOUNTS = [
  { account_id: 1, account_name: '기본 예시 계좌', account_number: 'DEMO-0001', withdrawable_cash: 500000 },
  { account_id: 2, account_name: '매수 연습 계좌', account_number: 'DEMO-0002', withdrawable_cash: 1000000 },
];
const STEPS = [
  ['account', '[data-tutorial-target=account]', '계좌 선택', '실제 계좌와 연결되지 않는 가상 체험입니다. 계좌마다 잔고가 다릅니다. 매수 연습 계좌를 선택해 보세요.'],
  ['types', '[data-tutorial-target=type]', '', ''],
  ['market', '[data-tutorial-target=type]', '시장가 선택', '주문유형을 시장가로 바꿔 보세요. 가격을 입력하지 않고 주문해요.'],
  ['marketTry', '[data-tutorial-target=submit]', '시장가 주문', '현재가는 50,000원, 가장 낮은 매도 호가는 50,100원이에요. 모의 매수를 눌러 1주를 주문해 보세요.'],
  ['limit', '[data-tutorial-target=type]', '지정가 선택', '같은 시세에서 주문유형을 지정가로 바꿔 보세요. 이번에는 살 가격의 한도를 정해요.'],
  ['limitPrice', '[data-tutorial-target=price]', '가격 입력', '50,000원을 입력해 보세요. 이 가격보다 비싸게 사지 않겠다는 뜻이에요.'],
  ['limitTry', '[data-tutorial-target=submit]', '지정가 주문', '가장 낮은 매도 호가는 여전히 50,100원이에요. 50,000원 지정가로 1주를 주문해 보세요.'],
  ['quantity', '[data-tutorial-target=quantity]', '수량 입력', '수량을 2주로 바꿔 보세요. 거래금액은 50,000원 × 2주 = 100,000원입니다.'],
  ['costs', '[data-tutorial-target=costs]', '수수료 확인', '주식값 외에 수수료도 필요합니다. 계산기 버튼을 눌러 예상 비용을 확인해 보세요.'],
  ['order', '[data-tutorial-target=submit]', '매수 내용 확인', '수수료 15원을 더해 100,015원이 필요합니다. 사이트 모의 요율은 0.015%이며 실제 증권사와 다릅니다. 모의 매수를 눌러 확인 창을 여세요.'],
];

export default function BuyTutorial({ onClose, completionKey = BUY_TUTORIAL_KEY }) {
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
  const [accounts, setAccounts] = useState(() => INITIAL_ACCOUNTS.map(item => ({ ...item })));
  const [accountId, setAccountId] = useState(1);
  const [priceType, setPriceType] = useState('지정가');
  const [limitPrice, setLimitPrice] = useState('50000');
  const [quantity, setQuantity] = useState('1');
  const [orderHelpOpen, setOrderHelpOpen] = useState(false);
  const [concept, setConcept] = useState(null);
  const [pending, setPending] = useState(null);
  const [result, setResult] = useState(null);
  const executed = useRef(false);
  const [id, selector, title, text] = STEPS[step];
  const account = accounts.find(item => item.account_id === accountId);
  const orderLesson = id === 'types';
  const comparison = ['market', 'marketTry', 'limit', 'limitPrice', 'limitTry'].includes(id);
  const price = resolveOrderPrice(priceType, '매수', limitPrice, comparison ? 50100 : 50000, BOOK);
  const costs = estimateOrderCosts('매수', price, Number(quantity));
  const advance = () => setStep(value => Math.min(value + 1, STEPS.length - 1));
  const changeOrderHelp = open => {
    setOrderHelpOpen(open);
    if (!open && orderLesson) advance();
  };

  useLayoutEffect(() => {
    if (pending || concept || orderHelpOpen || orderLesson) return;
    const target = surface.current.querySelector(selector);
    const popup = note.current;
    const outline = spotlight.current;
    if (!target || !popup || !outline) return;
    const inactive = [...surface.current.querySelectorAll('.trading-order button, .trading-order input, .trading-order select')]
      .filter(control => !control.closest('[data-order-help]') && !target.contains(control) && target !== control);
    inactive.forEach(control => { control.inert = true; });
    const position = () => {
      const rect = target.getBoundingClientRect();
      const width = document.documentElement.clientWidth || window.innerWidth;
      const height = window.innerHeight;
      Object.assign(outline.style, { left: rect.left - 5 + 'px', top: rect.top - 5 + 'px', width: rect.width + 10 + 'px', height: rect.height + 10 + 'px' });
      popup.style.width = Math.min(orderLesson ? 480 : 300, width - 24) + 'px';
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
    (orderLesson ? popup : control)?.focus({ preventScroll: true });
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
  }, [selector, step, pending, concept, orderLesson, orderHelpOpen]);

  const prepare = event => {
    event.preventDefault();
    if (['marketTry', 'limitTry'].includes(id)) {
      if (accountId !== 2 || Number(quantity) !== 1 || (id === 'marketTry' ? priceType !== '시장가' : priceType !== '지정가' || Number(limitPrice) !== 50000)) return;
      setPending({ comparison:true, accountId, accountName:account.account_name, accountNumber:account.account_number,
        code:'990001', name:'예시전자', kind:'매수', priceType, quantity:1, price:id === 'marketTry' ? 50100 : 50000 });
      return;
    }
    if (id !== 'order' || accountId !== 2 || priceType !== '시장가' || Number(quantity) !== 2 || executed.current) return;
    setPending({ accountId, accountName: account.account_name, accountNumber: account.account_number,
      code: '990001', name: '예시전자', kind: '매수', priceType, quantity: 2, price: 50000 });
  };
  const confirm = () => {
    if (!pending || executed.current || result) return;
    if (pending.comparison) {
      const filled = pending.priceType === '시장가';
      setResult({order_id:1, quantity:1, price:pending.price, price_type:pending.priceType,
        commission:estimateOrderCosts('매수', pending.price, 1).commission, tax:0, status:filled ? '체결' : '대기'});
      return;
    }
    executed.current = true;
    setAccounts(previous => previous.map(item => item.account_id === 2 ? { ...item, withdrawable_cash: 899985 } : item));
    setResult({ order_id: 1, quantity: 2, price: 50000, price_type: '시장가', commission: 15, tax: 0, status: '체결' });
  };
  const auth = { isAuthenticated: true, accounts, accountId, account,
    selectAccount: value => { if (id === 'account') { setAccountId(value); if (value === 2) { advance(); setOrderHelpOpen(true); } } }, refresh: async () => {} };
  return <AuthContext.Provider value={auth}><TutorialRunning.Provider value={true}>
    <div ref={surface} className="buy-tutorial-inline" role="dialog" aria-modal="true" aria-label="첫 매수 연습">
      <TradingOrderForm orderHelpOpen={orderHelpOpen} onOrderHelpChange={changeOrderHelp} tutorial kind="매수" setKind={() => {}} priceType={priceType}
        setPriceType={value => {
          const expected = {market:'시장가', limit:'지정가'}[id];
          if (!expected) return;
          setPriceType(value);
          if (value === expected) advance();
        }}
        limitPrice={limitPrice} setLimitPrice={value => {
          if (id !== 'limitPrice') return;
          setLimitPrice(value);
          if (Number(value) === 50000) advance();
        }} quantity={quantity}
        setQuantity={value => { if (id !== 'quantity') return; setQuantity(value); if (Number(value) === 2) advance(); }}
        onCostsOpen={() => { if (id === 'costs') setConcept('fees'); }}
        price={50000} resolvedPrice={price} book={['중간가', '최유리지정가', '최우선지정가'].includes(priceType) ? BOOK : null}
        costs={costs} account={account} canSubmit={['marketTry','limitTry','order'].includes(id) && !result} enabled onSubmit={prepare} />
      {!pending && !concept && !orderHelpOpen && !orderLesson && <>
        <div ref={spotlight} className="buy-tutorial-spotlight" aria-hidden="true"><TutorialPointer/></div>
        <div ref={note} className="buy-tutorial-note tutorial-local-note" role="status" aria-live="polite" aria-atomic="true">
          {!orderLesson && <button type="button" className="buy-tutorial-close" aria-label="연습 종료" onClick={onClose}>×</button>}
          <strong className="block text-sm text-brand-700">{title}</strong><p className="mt-1 text-sm leading-relaxed text-gray-600">{text}</p>
        </div>
      </>}
      {concept && <BuyConceptDialog surfaceRef={surface} key={concept} kind={concept} onExit={onClose} onContinue={() => {
        if (concept === 'fees') advance();
        setConcept(null);
      }} />}
      {pending && <OrderDialog order={pending} result={result} tutorial includeCosts instruction={pending.comparison ? (result
        ? {title:result.status === '체결' ? '시장가 체결' : '지정가 대기', text:result.status === '체결'
          ? '1주를 50,100원에 샀어요. 현재가가 아니라 지금 팔겠다는 가격으로 체결됐어요.'
          : '50,100원은 정한 한도 50,000원보다 비싸서 아직 사지 않았어요. 더 싼 매도 주문이 없으면 체결되지 않아요.', event:'closed'}
        : {title:'주문 확인', text:`${pending.priceType} 1주를 확인하고 매수주문을 누르세요.`, event:'filled'}) : result
        ? { title: '체결 결과', text: '현금 899,985원과 주식 2주가 남습니다. 주가가 같아도 수수료 15원만큼 총자산이 줄었습니다. 확인을 누르면 연습을 마칩니다.', event: 'closed' }
        : { title: '주문 확인', text: '가상 계좌·시장가 2주·수수료 15원을 확인하고 매수주문을 누르세요. 실제 계좌에는 전송되지 않습니다.', event: 'filled' }}
        onConfirm={confirm} onClose={() => {
          if (pending.comparison) {
            if (result) {
              if (id === 'marketTry') setLimitPrice('49000');
              else setPriceType('시장가');
              advance();
            }
            setPending(null); setResult(null); return;
          }
          if (result) { completeBuyTutorial(completionKey); onClose?.(); } else setPending(null); }} />}
    </div>
  </TutorialRunning.Provider></AuthContext.Provider>;
}
