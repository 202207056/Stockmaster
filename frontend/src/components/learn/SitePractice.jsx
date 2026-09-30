import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../../contexts/auth-context';
import { SitePracticeContext, useSitePractice } from '../../contexts/site-practice';
import { TRADING_TUTORIALS, TUTORIAL_SOURCES } from '../../constants/tradingTutorials';
import { createPracticeAccounts, executePracticeOrder, PRACTICE_PRICE, PRACTICE_STOCK } from '../../utils/practiceAccount';
import TutorialStart from './TutorialStart';
import TutorialTarget from './TutorialTarget';
import { TutorialRunning } from './tutorial-context';
import '../../pages/TradingTutorial.css';

export default function SitePractice({ children }) {
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const course = ['/trading', '/assets'].includes(pathname) && TRADING_TUTORIALS.find(item => item.id === params.get('practice'));
  return course ? <Session key={course.id} course={course}>{children}</Session> : children;
}

function Session({ course, children }) {
  const [attempt, setAttempt] = useState(0);
  return <TutorialStart key={attempt} title={course.title}><PracticeAccount course={course} restart={() => setAttempt(value => value + 1)}>{children}</PracticeAccount></TutorialStart>;
}

function PracticeAccount({ course, restart, children }) {
  const [accounts, setAccounts] = useState(() => createPracticeAccounts(course.seeded));
  const accountRef = useRef(accounts);
  const [accountId, setAccountId] = useState(1);
  const [index, setIndex] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const running = useContext(TutorialRunning);
  const root = useRef(null);
  const current = course.steps[index];
  const guidePage = current && (['asset-total', 'asset-investment', 'asset-holdings', 'trading-link'].includes(current.target) || (course.id === 'account' && index === 0)) ? '/assets' : '/trading';
  const account = accounts.find(item => item.account_id === accountId);
  const event = name => { if (!running) return; if (name === 'dismissed' && current?.event === 'filled') setIndex(value => value - 1); else if (current?.event === name) setIndex(value => value + 1); };
  const href = (path, code = '') => `${path}?practice=${course.id}${code ? `&code=${encodeURIComponent(code)}` : ''}`;
  const resource = key => {
    if (key === 'stocks') return [PRACTICE_STOCK].filter(item => `${item.name} ${item.symbol_code}`.includes(params.get('search') || ''));
    if (key === 'detail') return PRACTICE_STOCK;
    if (key === 'quote') return { current_price: PRACTICE_PRICE, change_rate: 0 };
    if (key === 'orders') return account.orders;
    if (key === 'portfolio') return { withdrawable_cash: account.withdrawable_cash, fetchedAt: '2026-09-30T00:00:00Z', holdings: account.quantity ? [{ portfolio_id: 1, symbol_code: PRACTICE_STOCK.symbol_code, security_name: PRACTICE_STOCK.name, hold_quantity: account.quantity, avg_price: PRACTICE_PRICE, quote: { current_price: PRACTICE_PRICE } }] : [] };
    if (key.startsWith('chart:')) {
      const period = key.split(':')[1];
      const count = { D: 24, W: 5, M: 60, Y: 52 }[period];
      return { rows: Array.from({ length: count }, (_, i) => {
        const close = i === count - 1 ? PRACTICE_PRICE : 49000 + (i % 5) * 250;
        return { key: `${period}:${i}`, date: `예시 ${i + 1}`, label: `예시 ${i + 1}`, open: close - 100, close, high: close + 200, low: close - 200 };
      }), resolution: { D: '5m', W: '1d', M: '1d', Y: '1w' }[period], notice: '연습용 가격 흐름입니다. 주문은 50,000원에 체결됩니다.' };
    }
    return null;
  };
  const submit = async request => {
    if (!running || current?.event !== 'filled') throw new Error('현재 안내 단계에서 주문 내용을 먼저 확인해 주세요.');
    const transaction = executePracticeOrder(accountRef.current, request);
    accountRef.current = transaction.accounts;
    setAccounts(transaction.accounts);
    event('filled');
    return transaction.result;
  };
  useEffect(() => {
    if (!running) return;
    const target = root.current?.querySelector('.tutorial-target-active');
    target?.scrollIntoView?.({ block: 'center', behavior: 'instant' });
    (target?.querySelector('input, select, button, a, summary') || target)?.focus({ preventScroll: true });
  }, [index, running]);
  const value = { course, current, account, favorites, resource, submit, href, event, advance: () => setIndex(value => value + 1), toggleFavorite: code => setFavorites(previous => previous.includes(code) ? previous.filter(item => item !== code) : [...previous, code]) };
  const auth = { isAuthenticated: true, isLoading: false, status: 'authenticated', user: { user_id: 'local-tutorial' }, accounts, accountId, account, refresh: async () => {}, selectAccount: id => { if (!accounts.some(item => item.account_id === id)) return; setAccountId(id); if (id === 2) event('account'); } };
  return <SitePracticeContext.Provider value={value}><AuthContext.Provider value={auth}><div ref={root} className="trading-tutorial space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm"><div><strong>{course.title}</strong><p className="mt-1 text-xs text-gray-600">{course.description} · 연습 계좌만 변경됩니다. 종료·새로고침하면 초기화됩니다.</p>{current && <p className="mt-1 text-xs">{index + 1} / {course.steps.length} · {current.title}</p>}</div><div className="flex gap-4">{current && pathname !== guidePage && <Link className="underline" to={href(guidePage, guidePage === '/trading' ? PRACTICE_STOCK.symbol_code : '')}>안내 화면으로</Link>}<button className="underline" onClick={() => { navigate(`${course.start || '/trading'}?practice=${course.id}`); restart(); }}>처음부터</button><Link className="underline" to="/learn?tab=guide">연습 종료</Link></div></div>
    {!current && <section aria-label="학습 완료" className="rounded-lg border border-brand-200 p-5"><h2 className="font-bold">{course.title} 완료</h2><p className="mt-2 text-sm">사이트에서 주문·조회하는 위치와 확인할 항목을 살펴봤습니다. 실습 중의 계좌와 거래내역은 저장되지 않습니다.</p><Link className="mt-3 inline-block text-sm text-brand-700 underline" to="/learn?tab=guide">학습 목록으로</Link></section>}
    {course.seeded && <p className="text-xs text-gray-500">매매 연습 계좌에는 시작 전에 예시전자 10주를 50,000원에 매수한 상태를 준비했습니다. 매입금액은 500,000원이며 수수료·세금은 제외합니다. 주문내역에는 이번 연습에서 실행한 주문만 표시됩니다.</p>}
    {children}
    <details className="text-xs leading-6 text-gray-500"><summary className="cursor-pointer">학습 안내 근거 · 2026-09-30 확인</summary>{TUTORIAL_SOURCES.map(([title, url]) => <a className="mr-4 underline" key={url} href={url} target="_blank" rel="noreferrer">{title}</a>)}<p>국내 일반주식 기준입니다. 거래 가격은 예시이며 이 모의거래와 연습에는 수수료·세금을 적용하지 않습니다.</p></details>
  </div></AuthContext.Provider></SitePracticeContext.Provider>;
}

// No extra wrapper or layout changes during ordinary use of the site.
export function PracticeTarget({ id, children }) {
  const practice = useSitePractice();
  if (!practice) return children;
  const active = practice.current?.target === id;
  return <TutorialTarget active={active} instruction={active ? practice.current : null}>{children}{active && practice.current.read && <button type="button" className="tutorial-action mt-3 text-sm" onClick={practice.advance}>확인했어요</button>}</TutorialTarget>;
}
