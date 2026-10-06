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
  ['market', '[data-tutorial-target=type]', '시장가', '가격을 직접 정하지 않는 주문입니다. 실제 체결가는 호가와 물량에 따라 달라집니다. 시장가를 선택해 보세요.'],
  ['marketTry', '[data-tutorial-target=submit]', '시장가로 1주 사 보기', '최근 거래가는 50,000원이지만 지금 가장 싸게 팔겠다는 가격은 50,100원입니다. 모의 매수를 눌러 어느 가격에 사게 되는지 확인하세요.'],
  ['limit', '[data-tutorial-target=type]', '지정가', '이번에는 같은 시세에서 가격 한도를 정해 볼게요. 지정가를 선택해 보세요.'],
  ['limitPrice', '[data-tutorial-target=price]', '내가 낼 최대 가격', '가격 입력란에 50,000원을 입력해 보세요. 반드시 이 가격에 산다는 뜻이 아니라, 이보다 비싸게 사지 않겠다는 한도입니다.'],
  ['limitTry', '[data-tutorial-target=submit]', '같은 시세에서 지정가로 사 보기', '가장 싸게 팔겠다는 가격은 여전히 50,100원입니다. 50,000원 지정가로 모의 매수를 눌러 시장가와 결과를 비교하세요.'],
  ['mid', '[data-tutorial-target=type]', '중간가', '매수·매도 최우선 호가의 중간 가격입니다. 중간가를 선택해 보세요. 이 사이트에서는 체결 확인을 누를 때 가격이 갱신됩니다.'],
  ['midTry', '[data-tutorial-target=submit]', '중간가로 1주 주문하기', '자동으로 계산된 가격을 확인하고 모의 매수를 눌러 결과와 호가 변화에 따른 차이를 체험하세요.'],
  ['best', '[data-tutorial-target=type]', '최유리지정가', '매수할 때 상대편인 매도 최우선 호가로 가격을 정합니다. 최유리지정가를 선택해 보세요. 접수 가격에 고정되며 체결은 보장되지 않습니다.'],
  ['bestTry', '[data-tutorial-target=submit]', '최유리지정가로 1주 주문하기', '자동으로 계산된 가격을 확인하고 모의 매수를 눌러 결과와 호가 변화에 따른 차이를 체험하세요.'],
  ['own', '[data-tutorial-target=type]', '최우선지정가', '매수할 때 같은 편인 매수 최우선 호가로 가격을 정합니다. 최우선지정가를 선택해 보세요. 접수 가격에 고정되며 기다려도 체결되지 않을 수 있습니다.'],
  ['ownTry', '[data-tutorial-target=submit]', '최우선지정가로 1주 주문하기', '자동으로 계산된 가격을 확인하고 모의 매수를 눌러 결과와 호가 변화에 따른 차이를 체험하세요.'],
  ['ready', '[data-tutorial-target=type]', '매수 준비', '이번 체험은 시장가로 주문합니다. 시장가를 선택해 보세요. 가상 체결 가격은 50,000원입니다.'],
  ['quantity', '[data-tutorial-target=quantity]', '수량 입력', '수량을 2주로 바꿔 보세요. 거래금액은 50,000원 × 2주 = 100,000원입니다.'],
  ['costs', '[data-tutorial-target=costs]', '수수료 확인', '주식값 외에 수수료도 필요합니다. 계산기 버튼을 눌러 예상 비용을 확인해 보세요.'],
  ['order', '[data-tutorial-target=submit]', '매수 내용 확인', '수수료 15원을 더해 100,015원이 필요합니다. 사이트 모의 요율은 0.015%이며 실제 증권사와 다릅니다. 모의 매수를 눌러 확인 창을 여세요.'],
];
const EXPECTED = { market: '시장가', limit: '지정가', mid: '중간가', best: '최유리지정가', own: '최우선지정가', ready: '시장가' };

export default function BuyTutorial({ onClose, completionKey = BUY_TUTORIAL_KEY }) {
  const surface = useRef(null);
  const note = useRef(null);
  const spotlight = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousScroll = { left: window.scrollX, top: window.scrollY };
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
    surface.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
    const keys = event => {
      if (surface.current?.querySelector('dialog[open]')) return;
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current?.(); }
      if (event.key !== 'Tab') return;
      const controls = [...surface.current.querySelectorAll('button, a[href], input, select, [tabindex="0"]')]
        .filter(node => !node.matches(':disabled') && !node.closest('[hidden], [inert]') && !node.inert && node.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener('keydown', keys);
    return () => {
      restored.forEach(([node, inert]) => { node.inert = inert; });
      document.removeEventListener('keydown', keys);
      previousFocus?.focus?.({ preventScroll: true });
      window.scrollTo?.(previousScroll);
    };
  }, []);

  const [step, setStep] = useState(0);
  const [accounts, setAccounts] = useState(() => INITIAL_ACCOUNTS.map(item => ({ ...item })));
  const [accountId, setAccountId] = useState(1);
  const [priceType, setPriceType] = useState('지정가');
  const [limitPrice, setLimitPrice] = useState('50000');
  const [quantity, setQuantity] = useState('1');
  const [concept, setConcept] = useState(null);
  const [pending, setPending] = useState(null);
  const [result, setResult] = useState(null);
  const executed = useRef(false);
  const [id, selector, title, text] = STEPS[step];
  const account = accounts.find(item => item.account_id === accountId);
  const comparison = ['market', 'marketTry', 'limit', 'limitPrice', 'limitTry'].includes(id);
  const price = resolveOrderPrice(priceType, '매수', limitPrice, comparison ? 50100 : 50000, BOOK);
  const costs = estimateOrderCosts('매수', price, Number(quantity));
  const advance = () => setStep(value => Math.min(value + 1, STEPS.length - 1));

  useLayoutEffect(() => {
    if (pending || concept) return;
    const target = surface.current.querySelector(selector);
    const popup = note.current;
    const outline = spotlight.current;
    if (!target || !popup || !outline) return;
    const inactive = [...surface.current.querySelectorAll('.trading-order button, .trading-order input, .trading-order select')]
      .filter(control => !target.contains(control) && target !== control);
    inactive.forEach(control => { control.inert = true; });
    target.scrollIntoView?.({ block: 'center', behavior: 'instant' });
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
      const bounds = target.getBoundingClientRect();
      if (bounds.top < 12 || bounds.bottom > window.innerHeight - 12) target.scrollIntoView?.({ block: 'center', behavior: 'instant' });
      position();
    };
    const control = target.matches('button, select, input') ? target : target.querySelector('select, input, button:not(:disabled)');
    control?.focus({ preventScroll: true });
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
  }, [selector, step, pending, concept]);

  const prepare = event => {
    event.preventDefault();
    const quoteConcept = { midTry: 'midResult', bestTry: 'bestResult', ownTry: 'ownResult' }[id];
    if (quoteConcept) { setConcept(quoteConcept); return; }
    if (id === 'marketTry' && priceType === '시장가') { setConcept('marketResult'); return; }
    if (id === 'limitTry' && priceType === '지정가' && Number(limitPrice) === 50000) { setConcept('limitResult'); return; }
    if (id !== 'order' || accountId !== 2 || priceType !== '시장가' || Number(quantity) !== 2 || executed.current) return;
    setPending({ accountId, accountName: account.account_name, accountNumber: account.account_number,
      code: '990001', name: '예시전자', kind: '매수', priceType, quantity: 2, price: 50000 });
  };
  const confirm = () => {
    if (!pending || executed.current) return;
    executed.current = true;
    setAccounts(previous => previous.map(item => item.account_id === 2 ? { ...item, withdrawable_cash: 899985 } : item));
    setResult({ order_id: 1, quantity: 2, price: 50000, price_type: '시장가', commission: 15, tax: 0, status: '체결' });
  };
  const auth = { isAuthenticated: true, accounts, accountId, account,
    selectAccount: value => { if (id === 'account') { setAccountId(value); if (value === 2) { advance(); setConcept('intro'); } } }, refresh: async () => {} };
  return <AuthContext.Provider value={auth}><TutorialRunning.Provider value={true}>
    <div ref={surface} className="buy-tutorial-inline" role="dialog" aria-modal="true" aria-label="첫 매수 연습">
      <TradingOrderForm tutorial kind="매수" setKind={() => {}} priceType={priceType}
        setPriceType={value => { if (!EXPECTED[id]) return; setPriceType(value); if (value === EXPECTED[id]) advance(); }}
        limitPrice={limitPrice} setLimitPrice={value => { setLimitPrice(value); if (id === 'limitPrice' && Number(value) === 50000) advance(); }} quantity={quantity}
        setQuantity={value => { if (id !== 'quantity') return; setQuantity(value); if (Number(value) === 2) advance(); }}
        onCostsOpen={() => { if (id === 'costs') setConcept('fees'); }}
        price={50000} resolvedPrice={price} book={comparison || ['중간가', '최유리지정가', '최우선지정가'].includes(priceType) ? BOOK : null}
        costs={costs} account={account} canSubmit={['marketTry', 'limitTry', 'midTry', 'bestTry', 'ownTry', 'order'].includes(id) && !result} enabled onSubmit={prepare} />
      {!pending && !concept && <>
        <div ref={spotlight} className="buy-tutorial-spotlight" aria-hidden="true" />
        <div ref={note} className="buy-tutorial-note" role="status" aria-live="polite" aria-atomic="true">
          <button type="button" className="buy-tutorial-close" aria-label="연습 종료" onClick={onClose}>×</button>
          <strong>{title}</strong><p>{text}</p>
        </div>
      </>}
      {concept && <BuyConceptDialog key={concept} kind={concept} onExit={onClose} onContinue={() => {
        if (concept === 'marketResult') { setLimitPrice('49000'); advance(); }
        if (['limitResult', 'midResult', 'bestResult', 'ownResult', 'fees'].includes(concept)) advance();
        setConcept(null);
      }} />}
      {pending && <OrderDialog order={pending} result={result} tutorial includeCosts instruction={result
        ? { title: '체결 결과', text: '현금 899,985원과 주식 2주가 남습니다. 주가가 같아도 수수료 15원만큼 총자산이 줄었습니다. 확인을 누르면 연습을 마칩니다.', event: 'closed' }
        : { title: '주문 확인', text: '가상 계좌·시장가 2주·수수료 15원을 확인하고 매수주문을 누르세요. 실제 계좌에는 전송되지 않습니다.', event: 'filled' }}
        onConfirm={confirm} onClose={() => { if (result) { completeBuyTutorial(completionKey); onClose?.(); } else setPending(null); }} />}
    </div>
  </TutorialRunning.Provider></AuthContext.Provider>;
}
