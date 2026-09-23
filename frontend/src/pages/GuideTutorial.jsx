import { useContext, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Target from '../components/learn/TutorialTarget';
import TutorialStart from '../components/learn/TutorialStart';
import { TutorialInstruction, TutorialRunning } from '../components/learn/tutorial-context';
import './TradingTutorial.css';

const guides = {
  account: { title: '계좌 읽기', steps: ['현금 900,000원을 클릭해 사용 가능한 돈을 확인하세요.', '예시전자 보유 내역을 열어 주식 평가액을 확인하세요.', '총자산을 눌러 현금과 주식 평가액의 합을 확인하세요.'], summary: '현금 900,000원 + 주식 평가액 100,000원 = 총자산 1,000,000원입니다. 주식을 사서 현금이 줄어도 그 자체가 손실은 아니에요.' },
  orders: { title: '주문 상태 확인하기', steps: ['예시 주문 접수를 눌러 2주 매수 주문을 접수하세요.', '접수된 주문의 상세 내역을 열어 체결 수량을 확인하세요.', '예시 체결 진행을 눌러 주문 상태가 어떻게 달라지는지 확인하세요.', '체결된 주문을 눌러 최종 수량과 체결 금액을 확인하세요.'], summary: '접수는 주문이 등록된 상태이고, 체결은 거래가 이루어진 상태입니다. 이 예시에서는 2주가 전부 체결됐지만 실제 주문은 일부 체결되거나 체결되지 않을 수도 있어요.' },
  profit: { title: '손익 읽기', steps: ['매입 내역을 열어 원금 100,000원을 확인하세요.', '가격 상승을 눌러 1주 가격을 55,000원으로 바꿔 보세요.', '가격 하락을 눌러 1주 가격을 45,000원으로 바꿔 보세요.', '평가손익을 눌러 보유 중인 손익의 의미를 확인하세요.'], summary: '평가손익 = 현재 평가액 − 매입 금액입니다. 아직 팔지 않은 주식의 손익이며 가격에 따라 바뀝니다. 이 예시는 수수료와 세금을 제외합니다.' },
  reason: { title: '판단 근거 남기기', steps: ['예시 공시를 열어 확인된 사실을 읽어 보세요.', '확인된 사실과 아직 모르는 점을 각각 입력하고 기록하세요.', '언제 무엇을 다시 확인할지 조건을 적고 예시 기록을 완성하세요.'], summary: '사실·불확실성·재확인 조건을 구분하면 나중에 판단을 돌아보기 쉬워요. 아래 기록은 이 화면에서만 유지되며 실제 투자 기록으로 저장되지 않습니다.' },
};
const won = value => `${value.toLocaleString('ko-KR')}원`;

export default function GuideTutorial() {
  const { guideId } = useParams();
  if (!guides[guideId]) return <div className="space-y-4"><h1 className="text-xl font-bold">찾을 수 없는 튜토리얼입니다.</h1><Link to="/learn?tab=guide" className="text-brand-700 underline">기본 투자 가이드로 돌아가기</Link></div>;
  return <TutorialStart key={guideId} title={`${guides[guideId].title} 튜토리얼`}><Experience id={guideId} guide={guides[guideId]} /></TutorialStart>;
}

function Experience({ id, guide }) {
  const running = useContext(TutorialRunning);
  const [step, setStep] = useState(0);
  const [fact, setFact] = useState('');
  const [unknown, setUnknown] = useState('');
  const [condition, setCondition] = useState('');
  const root = useRef(null);
  const done = step === guide.steps.length;
  const next = () => setStep(value => Math.min(value + 1, guide.steps.length));
  const restart = () => { setStep(0); setFact(''); setUnknown(''); setCondition(''); };
  const price = step >= 3 ? 45000 : step >= 2 ? 55000 : 50000;
  useEffect(() => {
    if (!running) return;
    const element = root.current?.querySelector(done ? '[data-completion]' : '.tutorial-target-active input, .tutorial-target-active textarea, .tutorial-target-active button');
    element?.focus({ preventScroll: true });
    (element?.closest('.tutorial-anchor') || element)?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [step, done, running]);
  const action = (at, text, content) => <Target active={step === at}><button disabled={step !== at} onClick={next} className="w-full rounded-xl border border-gray-200 bg-white p-5 text-left"><span className="block text-sm font-bold text-brand-700">{text}</span>{content && <span className="mt-2 block text-xl font-extrabold">{content}</span>}</button></Target>;
  return <TutorialInstruction.Provider value={done ? null : { title: guide.title, text: guide.steps[step] }}><div ref={root} className="trading-tutorial mx-auto max-w-5xl space-y-6">
    <header className="flex flex-wrap justify-between gap-4 border-b border-gray-200 pb-5"><div><Link to="/learn?tab=guide" className="text-sm text-gray-600">← 기본 투자 가이드</Link><h1 className="mt-3 text-xl font-extrabold">{guide.title} 튜토리얼</h1></div><button onClick={restart} className="self-start rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold">처음부터</button></header>
    <p className="rounded-xl bg-brand-50 p-4 text-sm text-brand-700">학습 전용 예시 · 실제 계좌, 주문, 투자 기록에 영향을 주지 않습니다. 화면을 나가면 체험 내용이 초기화됩니다.</p>
    {done && <section aria-live="polite" aria-atomic="true" className="rounded-xl border-2 border-brand-200 p-5">
      <p className="text-xs font-bold text-brand-700">{done ? '체험 완료' : `STEP ${step + 1} / ${guide.steps.length}`}</p>
      <h2 data-completion={done ? '' : undefined} tabIndex={-1} className="mt-2 text-lg font-bold">{done ? `${guide.title} 체험을 완료했어요!` : guide.steps[step]}</h2>
      {done && <p className="mt-3 text-sm leading-relaxed text-gray-600">{guide.summary}</p>}
    </section>}

    {id === 'account' && <section className="tutorial-panel space-y-6"><h2>예시 계좌 · DEMO-0001</h2><div className="grid gap-6 sm:grid-cols-3">{action(0, '현금 확인', '900,000원')}{action(1, '예시전자 보유 내역', '2주 · 100,000원')}{action(2, '총자산 확인', '1,000,000원')}</div>{step >= 1 && <p className="rounded-lg bg-gray-50 p-4 text-sm">현금은 현재 계좌에 있는 돈입니다. 이 예시에는 미체결 주문이나 출금 제한이 없어 900,000원을 사용할 수 있어요.</p>}{step >= 2 && <dl className="grid gap-3 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-3"><div><dt>보유 수량</dt><dd className="font-bold">2주</dd></div><div><dt>현재 1주 가격</dt><dd className="font-bold">50,000원</dd></div><div><dt>주식 평가액</dt><dd className="font-bold">2 × 50,000 = 100,000원</dd></div></dl>}</section>}

    {id === 'orders' && <section className="tutorial-panel space-y-6"><h2>예시 주문내역</h2><p className="text-sm text-gray-600">예시전자 · 매수 2주 · 1주 50,000원</p>{step === 0 ? action(0, '예시 주문 접수') : <><div className="grid gap-4 rounded-lg bg-gray-50 p-4 text-sm sm:grid-cols-3"><p>주문 상태<strong className="block text-lg text-brand-700">{step >= 3 ? '체결' : '접수'}</strong></p><p>주문 수량<strong className="block text-lg">2주</strong></p><p>체결 수량<strong className="block text-lg">{step >= 3 ? 2 : 0}주</strong></p></div>{step === 1 && action(1, '접수 주문 상세 보기')}{step >= 2 && <p className="rounded-lg border border-gray-200 p-4 text-sm">{step >= 3 ? '체결 2주 · 미체결 0주 · 체결 금액 100,000원' : '접수 완료 · 체결 0주 · 미체결 2주 · 체결 금액 0원. 아직 주식을 보유한 상태가 아니에요.'}</p>}{step === 2 && action(2, '예시 체결 진행')}{step === 3 && action(3, '체결 주문 확인')}{done && <p className="text-sm font-bold text-brand-700">주문번호 DEMO-001 · 예시전자 2주 보유 · 예시 체결 완료</p>}</>}</section>}

    {id === 'profit' && <section className="tutorial-panel space-y-6"><h2>예시전자 · 보유 2주</h2><div className="grid gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-3"><p className="text-sm">현재 가격<strong className="block text-xl">{won(price)}</strong></p><p className="text-sm">주식 평가액<strong className="block text-xl">{won(price * 2)}</strong></p><p className="text-sm">평가손익<strong className={`block text-xl ${price > 50000 ? 'text-up-600' : price < 50000 ? 'text-down-600' : ''}`}>{price > 50000 ? '+' : ''}{won((price - 50000) * 2)} ({(price - 50000) / 500}%)</strong></p></div>{step === 0 && action(0, '매입 내역 열기')}{step >= 1 && <p className="text-sm">매입 원금: 50,000원 × 2주 = 100,000원 · 보유 수량은 그대로 2주입니다.</p>}<div className="grid gap-6 sm:grid-cols-2">{action(1, '가격 상승 · 55,000원으로 변경')}{action(2, '가격 하락 · 45,000원으로 변경')}</div>{step >= 2 && <p className="rounded-lg bg-gray-50 p-4 text-sm">{step === 2 ? '평가액 110,000원 − 매입 원금 100,000원 = 평가이익 +10,000원 (+10%)' : '평가액 90,000원 − 매입 원금 100,000원 = 평가손실 −10,000원 (−10%)'}</p>}{step === 3 && action(3, '평가손익 확인 · 아직 매도하지 않았어요')}</section>}

    {id === 'reason' && <section className="tutorial-panel space-y-6"><h2>예시전자 판단 노트</h2>{step === 0 ? action(0, '예시 공시 열기') : <article className="rounded-lg bg-gray-50 p-4 text-sm leading-relaxed"><h3 className="font-bold">가상 공시 · 이번 분기 실적</h3><p>매출은 전년 같은 분기보다 10% 증가했습니다. 영업이익은 5% 감소했습니다. 다음 분기 실적은 아직 발표되지 않았습니다.</p><p className="mt-2 text-gray-500">이 자료만으로 앞으로 주가가 오를지는 알 수 없어요.</p></article>}
      {step >= 1 && <Target active={step === 1}><form className="space-y-4 rounded-lg border border-gray-200 p-4" onSubmit={event => { event.preventDefault(); if (step === 1 && fact.trim() && unknown.trim()) next(); }}><label className="block text-sm font-bold">확인된 사실<textarea required maxLength={500} disabled={step !== 1} value={fact} onChange={e => setFact(e.target.value)} placeholder="예: 매출은 10% 증가했지만 영업이익은 5% 감소했다." className="mt-2 block min-h-24 w-full rounded-lg border border-gray-300 p-3 font-normal" /></label><label className="block text-sm font-bold">아직 모르는 점<textarea required maxLength={500} disabled={step !== 1} value={unknown} onChange={e => setUnknown(e.target.value)} placeholder="예: 이익이 줄어든 원인이 일시적인지 모른다." className="mt-2 block min-h-24 w-full rounded-lg border border-gray-300 p-3 font-normal" /></label>{step === 1 && <button disabled={!fact.trim() || !unknown.trim()} className="tutorial-action">사실과 불확실성 기록</button>}</form></Target>}
      {step >= 2 && <Target active={step === 2}><form className="space-y-4 rounded-lg border border-gray-200 p-4" onSubmit={event => { event.preventDefault(); if (step === 2 && condition.trim()) next(); }}><label className="block text-sm font-bold">다시 확인할 조건<textarea required maxLength={500} disabled={done} value={condition} onChange={e => setCondition(e.target.value)} placeholder="예: 다음 분기 공시가 나오면 영업이익과 비용 변화를 확인한다." className="mt-2 block min-h-24 w-full rounded-lg border border-gray-300 p-3 font-normal" /></label>{!done && <button disabled={!condition.trim()} className="tutorial-action">예시 판단 기록 완성</button>}</form></Target>}
      {done && <p role="status" className="text-sm font-bold text-brand-700">작성한 판단 노트가 완성됐어요. 위의 세 항목을 함께 보며 판단 근거를 돌아보세요.</p>}
    </section>}
    {done && <Link to="/learn?tab=guide" className="inline-block rounded-lg bg-brand-600 px-5 py-3 text-sm font-bold text-white">기본 투자 가이드로 돌아가기</Link>}
  </div></TutorialInstruction.Provider>;
}
