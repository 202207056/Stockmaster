import { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, RotateCcw, ArrowLeft } from 'lucide-react';
import './TradingTutorial.css';
import Target from '../components/learn/TutorialTarget';
import { TutorialInstruction, TutorialRunning } from '../components/learn/tutorial-context';
import StockCoachContent from '../components/common/StockCoachContent';
import OrderDialog from '../components/common/OrderDialog';
import TutorialMarket from '../components/learn/TutorialMarket';
import TutorialStart from '../components/learn/TutorialStart';

const steps = [
  ['search', '종목 검색', '검색창에 예시를 입력하고 검색을 눌러 보세요. 종목명이나 종목 코드로 검색할 수 있습니다. 표시된 이름과 코드는 모두 연습용입니다.'],
  ['stock', '종목 선택', '여러 예시 종목 중 예시전자 (990001)를 선택하세요. 종목을 선택하면 해당 종목의 차트가 표시됩니다.'],
  ['favorite', '관심종목 추가·해제', '빈 별을 눌러 예시전자를 관심종목에 추가하세요. 채워진 별을 다시 누르면 해제됩니다. 이 목록은 튜토리얼 안에서만 유지됩니다.'],
  ['chart-type', '그래프 모양 변경', '그래프 종류에서 꺾은선을 선택하세요. 캔들은 시가·고가·저가·종가를, 꺾은선은 종가의 흐름을 보여 줍니다.'],
  ['chart-period', '그래프 기간 변경', '3개월을 눌러 더 긴 기간의 흐름을 확인하세요. 1일·1주·3개월·1년 버튼으로 표시 기간을 바꿀 수 있습니다.'],
  ['chart-check', '차트 살펴보기', '종류와 기간을 자유롭게 바꿔 보세요. 차트 위에 마우스를 올리거나 가격 표를 열면 가격을 확인할 수 있습니다. 확인을 누르면 계속 진행합니다.'],
  ['account', '주문 계좌 변경', '계좌 선택을 열어 기본 예시 계좌에서 매매 연습 계좌로 바꿔 주세요. 주문은 선택한 계좌에만 반영됩니다.'],
  ['account-check', '변경한 계좌 확인', '매매 연습 계좌의 현금 1,000,000원을 확인한 뒤 확인을 눌러 주세요. 주문 확인 창에도 이 계좌가 표시됩니다.'],
  ['coach', 'AI 모의투자 코칭 살펴보기', '관찰·연습 조언·주의할 점의 예시를 읽어 보세요. 코칭은 매매를 결정하는 정답이 아닙니다. 내용을 살펴본 뒤 확인을 눌러 주세요.'],
  ['buy', '매수 선택', '매수는 주식을 사는 것이에요. 주문 영역에서 매수 버튼을 눌러 주세요.'],
  ['quantity', '매수 수량 입력', '수량에 2를 입력하고 확인을 누르세요. 1주 50,000원 × 2주 = 100,000원이에요.'],
  ['order', '매수 주문 확인', '예시 매수를 눌러 주문 내용을 확인하세요. 아직 주식을 산 상태는 아니에요.'],
  ['confirm', '매수 체결 체험', '종목·수량·금액을 확인하고 매수주문을 누르세요. 이 예시에서는 고정 가격으로 즉시 체결돼요.'],
  ['holding', '매수 결과 확인', '예시 현금은 100,000원 줄고 보유 주식은 2주가 되었어요. 보유 내역을 살펴본 뒤 확인을 눌러 주세요.'],
  ['sell', '매도 선택', '매도는 보유한 주식을 파는 것이에요. 매도 버튼을 눌러 주세요.'],
  ['quantity', '매도 수량 입력', '보유한 2주 중 1주를 팔아 볼게요. 수량에 1을 입력하고 확인을 누르세요.'],
  ['order', '매도 주문 확인', '예시 매도를 눌러 주문 내용을 확인하세요. 매도 금액은 50,000원이에요.'],
  ['confirm', '매도 체결 체험', '1주를 매도하는지 확인하고 매도주문을 누르세요.'],
  ['holding', '매도 결과 확인', '예시 현금은 50,000원 늘고 주식은 1주 남았어요. 확인을 눌러 튜토리얼을 마무리하세요.'],
];
const exampleCoach = { facts: { name: '예시전자', investment_style: '균형투자형 (예시)' }, observation: '주문 전 예시 가격은 50,000원, 매매 연습 계좌의 시작 현금은 1,000,000원입니다.', advice: '2주 매수에는 100,000원이 필요합니다. 주문할 계좌와 수량, 남는 현금을 먼저 확인해 보세요.', caution: '차트가 올랐다는 사실만으로 이후 가격 상승을 단정할 수 없습니다.', disclaimer: '학습용 코칭 예시이며 특정 종목의 매수·매도를 권유하지 않습니다.' };
const money = (value) => `${value.toLocaleString('ko-KR')}원`;

export default function TradingTutorial() {
  return <TutorialStart title="트레이딩 매수·매도 튜토리얼"><TradingExperience /></TutorialStart>;
}

function TradingExperience() {
  const running = useContext(TutorialRunning);
  const [step, setStep] = useState(0);
  const [marketVersion, setMarketVersion] = useState(0);
  const [quantity, setQuantity] = useState('');
  const [account, setAccount] = useState('basic');
  const [orderResult, setOrderResult] = useState(null);
  const root = useRef(null);
  const done = step === steps.length;
  const current = steps[step];
  const side = step >= steps.findIndex(([id]) => id === 'sell') ? '매도' : '매수';
  const bought = step >= steps.findIndex(([id]) => id === 'holding');
  const sold = step >= steps.findLastIndex(([id]) => id === 'holding');
  const accountName = account === 'practice' ? '매매 연습 계좌' : '기본 예시 계좌';
  const accountNumber = account === 'practice' ? 'DEMO-0002' : 'DEMO-0001';
  const cash = account === 'basic' ? 500000 : sold ? 950000 : bought ? 900000 : 1000000;
  const shares = sold ? 1 : bought ? 2 : 0;
  const expected = side === '매수' ? 2 : 1;
  const valid = quantity.trim() !== '' && Number(quantity) === expected;
  const active = (id) => current?.[0] === id;
  const advance = () => setStep((value) => Math.min(value + 1, steps.length));
  const restart = () => { setMarketVersion(value => value + 1); setQuantity(''); setAccount('basic'); setOrderResult(null); setStep(0); };
  const instruction = current ? { title: current[1], text: current[2] } : null;

  useEffect(() => {
    if (!running) return;
    const target = root.current?.querySelector('.tutorial-target-active');
    const control = target?.querySelector('button, input, select') || target;
    control?.focus({ preventScroll: true });
    control?.closest('.tutorial-anchor')?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [step, running]);

  return <TutorialInstruction.Provider value={instruction}><div ref={root} className="trading-tutorial space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4">
      <div><Link to="/learn?tab=guide" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-600"><ArrowLeft size={16} /> 기본 투자 가이드</Link><h1 className="text-xl font-extrabold">트레이딩 매수·매도 튜토리얼</h1></div>
      <button onClick={restart} className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold"><RotateCcw size={16} /> 처음부터</button>
    </header>
    {done && <section aria-label="튜토리얼 완료" className="rounded-xl border-2 border-brand-300 bg-white p-5" aria-live="polite" aria-atomic="true">
      {done ? <><h2 className="flex items-center gap-2 text-lg font-bold text-brand-700"><CheckCircle2 size={22} /> 매수·매도 연습을 완료했어요!</h2><p className="mt-2 text-sm text-gray-600">2주 매수 → 1주 매도 완료. 남은 현금 950,000원 + 주식 평가액 50,000원 = 총자산 1,000,000원이에요.</p><p className="mt-2 text-sm text-gray-500">같은 가격에 사고팔아 손익은 0원입니다. 이 예시는 수수료·세금과 가격 변동을 제외했어요.</p><Link to="/learn?tab=guide" className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white">기본 투자 가이드로 돌아가기</Link></> : null}
    </section>}
    <div className="grid items-start gap-4 lg:grid-cols-4">
      <TutorialMarket key={marketVersion} active={active} advance={advance} />
      <section className="tutorial-panel"><h2>주문</h2><Target active={active('account')}><label className="flex flex-wrap items-center gap-2 text-sm text-gray-600">계좌<select aria-label="주문 계좌" disabled={!active('account')} className="max-w-full rounded border border-gray-300 bg-white px-3 py-2" value={account} onChange={event => { setAccount(event.target.value); if (event.target.value === 'practice') advance(); }}><option value="basic">기본 예시 계좌</option><option value="practice">매매 연습 계좌</option></select></label></Target><p className="my-4 rounded-lg bg-gray-50 p-3 text-sm">{accountName} · {accountNumber}<br /><strong className="mt-1 block">예시 현금 {money(cash)}</strong></p>
        {active('account-check') && <Target><button onClick={advance} className="tutorial-action w-full">확인</button></Target>}
        <div className="mb-5 grid grid-cols-2 gap-3">{['매수', '매도'].map(label => <Target key={label} active={active(label === '매수' ? 'buy' : 'sell')}><button aria-pressed={step > steps.findIndex(([id]) => id === 'buy') && side === label} disabled={!active(label === '매수' ? 'buy' : 'sell')} onClick={() => { setQuantity(''); advance(); }} className={`w-full rounded-lg border px-3 py-3 font-bold ${side === label && step > steps.findIndex(([id]) => id === 'buy') ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600'}`}>{label}</button></Target>)}</div>
        <label htmlFor="tutorial-quantity" className="mb-2 block text-sm font-bold">수량 (주)</label>
        <Target active={active('quantity')}><div className="space-y-2"><input id="tutorial-quantity" type="number" min="1" max={expected} step="1" value={quantity} disabled={!active('quantity')} onChange={e => setQuantity(e.target.value)} aria-describedby="tutorial-quantity-help" className="w-full rounded-lg border border-gray-300 px-3 py-2" /><button disabled={!active('quantity') || !valid} onClick={advance} className="tutorial-action w-full">수량 확인</button></div></Target>
        <p id="tutorial-quantity-help" className="my-3 text-xs text-gray-500">{active('quantity') ? `이번 연습에서는 ${expected}주를 입력해 주세요.` : `예시 보유 수량: ${shares}주`}</p><p className="mb-5 text-sm text-gray-600">예상 금액 <strong className="block text-lg text-gray-900">{valid ? money(Number(quantity) * 50000) : '—'}</strong></p>
        <Target active={active('order')}><button disabled={!active('order')} onClick={advance} className="tutorial-action w-full">예시 {side}</button></Target>
      </section>
    </div>
    {step > steps.findIndex(([id]) => id === 'stock') && <Target active={active('coach')}><section className="tutorial-panel"><h2>AI 모의투자 코칭</h2><StockCoachContent example data={exampleCoach} code="990001" action={active('coach') && <button onClick={advance} className="tutorial-action mt-4">확인</button>} /></section></Target>}
    {active('confirm') && <OrderDialog tutorial order={{ accountNumber, accountName, kind: side, name: '예시전자', code: '990001', quantity: expected, price: 50000 }} result={orderResult} message={orderResult ? '예시 체결이 완료되었습니다. 확인을 누르면 잔고 변화를 살펴봅니다.' : current[2]} onConfirm={() => setOrderResult({ quantity: expected, price: 50000 })} onClose={() => { if (orderResult) { setOrderResult(null); advance(); } else setStep(value => value - 1); }} />}
    <Target active={active('holding')}><section className="tutorial-panel"><h2>예시 보유 내역 · {accountName}</h2><div className="mb-5 grid gap-4 text-sm sm:grid-cols-3"><p>예시 현금<strong className="mt-1 block text-lg">{money(cash)}</strong></p><p>예시전자<strong className="mt-1 block text-lg">{shares}주 · {money(shares * 50000)}</strong></p><p>예시 총자산<strong className="mt-1 block text-lg">{money(cash + shares * 50000)}</strong></p></div>{active('holding') && <button onClick={advance} className="tutorial-action">확인</button>}</section></Target>
    <section className="tutorial-panel"><h2>예시 주문내역</h2>{!bought ? <p className="text-sm text-gray-500">아직 체결된 예시 주문이 없어요.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[440px] text-left text-sm"><caption className="sr-only">튜토리얼에서만 사용하는 가상 체결내역</caption><thead><tr>{['종목', '구분', '수량', '체결가', '상태'].map(label => <th key={label} className="pb-3">{label}</th>)}</tr></thead><tbody>{(sold ? ['매수', '매도'] : ['매수']).map(label => <tr key={label} className="border-t border-gray-100"><td className="py-3">예시전자</td><td className={label === '매수' ? 'text-up-600' : 'text-down-600'}>{label}</td><td>{label === '매수' ? 2 : 1}주</td><td>50,000원</td><td>예시 체결</td></tr>)}</tbody></table></div>}</section>
  </div></TutorialInstruction.Provider>;
}
