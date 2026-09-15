import { Link } from 'react-router-dom';
import useLearning from '../../hooks/useLearning';
import { partialSale } from '../../utils/learning';
import { won, wonSigned } from '../../utils/format';
import { LearningButton, LearningField, SimulationLabel, StorageNotice } from './LearningUI';

const initial = { stage: 0, reason: '', condition: '', check: '판단 보류', checkReason: '', sellReason: '비중 조절', nextCheck: '', quantity: 10, completed: false };
const phases = ['매수 전', '체결 후', '보유 중', '매도 전', '복기'];
const field = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';

export default function TradeScenario({ scope }) {
  const { state, store } = useLearning(scope);
  const saved = store.read('scenario', initial);
  const stage = Math.max(0, Math.min(4, Math.floor(saved.stage)));
  const quantity = [0, 10, 20, 30].includes(saved.quantity) ? saved.quantity : 10;
  const sale = partialSale(quantity);
  const update = (change) => store.write('scenario', { ...saved, ...change });
  return <div className="flex flex-col gap-4">
    <div><SimulationLabel /></div>
    <p className="text-sm text-gray-500">정해진 가격 경로의 가상 연습입니다. 입력은 실제 계좌·주문에 반영되지 않습니다.</p>
    <ol className="flex flex-wrap gap-2 text-xs">{phases.map((phase, index) => <li key={phase} aria-current={stage === index ? 'step' : undefined} className={`rounded-full px-3 py-1.5 ${stage === index ? 'bg-brand-600 font-bold text-white' : 'bg-gray-100 text-gray-500'}`}>{index + 1}. {phase}</li>)}</ol>
    <h3 className="font-bold">{phases[stage]} · {['무엇을 확인했나요?', '예상과 실제 결과를 비교해요', '처음 생각이 달라졌나요?', '얼마나, 왜 팔려고 하나요?', '내 판단과 결과를 돌아봐요'][stage]}</h3>
    {stage === 0 && <>
      <p className="rounded-lg bg-gray-50 p-3 text-sm">가상 기사: X기업 매출 +20%, 영업이익 −10%.<br />가상 계좌 현금 100만원 → 10,000원에 30주 매수 예정.</p>
      <p className="text-sm">예상 매수금액 300,000원 · 남은 현금 700,000원 · 주식 비중 30%</p>
      <LearningField label="확인한 근거와 불확실한 점 (선택)"><textarea value={saved.reason} maxLength={300} rows={3} onChange={(e) => update({ reason: e.target.value })} placeholder="매출 증가를 확인했지만 이익 감소 원인은 더 확인하고 싶어요." className={field} /></LearningField>
      <LearningField label="다시 확인할 조건 (선택)"><input value={saved.condition} maxLength={200} onChange={(e) => update({ condition: e.target.value })} placeholder="예: 다음 실적 자료 확인" className={field} /></LearningField>
    </>}
    {stage === 1 && <><p className="text-sm">이 시나리오에서는 30주가 10,000원에 체결됐습니다. 예상과 실제 가격이 같습니다.</p><AccountSnapshot cash={700000} market={300000} total={1000000} /><p className="rounded-lg bg-brand-50 p-3 text-sm">현금 일부가 주식으로 바뀌었습니다. 가격 변화와 비용이 없어 총자산은 그대로입니다.</p><p className="whitespace-pre-wrap break-words text-sm">당시 근거: {saved.reason || '기록 없음'}</p></>}
    {stage === 2 && <><p className="text-sm">다음 장면의 현재가는 9,000원입니다. 가격 하락 외에 새로 확인한 정보가 있는지 점검해 보세요.</p><AccountSnapshot cash={700000} market={270000} total={970000} /><div className="rounded-lg bg-gray-50 p-3 text-sm"><p className="whitespace-pre-wrap break-words">최초 근거: {saved.reason || '기록 없음'}</p><p className="mt-2 break-words">재검토 조건: {saved.condition || '기록 없음'}</p></div><LearningField label="지금의 판단"><select value={saved.check} onChange={(e) => update({ check: e.target.value })} className={field}><option>계획 유지</option><option>계획 수정</option><option>판단 보류</option></select></LearningField><LearningField label="이유 또는 새로 확인한 정보 (선택)"><textarea value={saved.checkReason} maxLength={300} rows={2} onChange={(e) => update({ checkReason: e.target.value })} className={field} /></LearningField><p className="text-xs text-gray-500">유지·수정·보류 자체를 채점하지 않습니다. 최초 근거는 별도로 남습니다.</p></>}
    {stage === 3 && <><p className="break-words text-sm">보유 중 점검: {saved.check} · {saved.checkReason || '이유 기록 없음'}</p><LearningField label="가상 매도 수량"><select value={quantity} onChange={(e) => update({ quantity: Number(e.target.value) })} className={field}>{[0, 10, 20, 30].map((qty) => <option key={qty} value={qty}>{qty === 0 ? '매도하지 않음' : `${qty}주${qty === 30 ? ' · 전량' : ''}`}</option>)}</select></LearningField><p className="text-sm">현재가 9,000원 · 예상 매도금액 {won(quantity * 9000)} · 남은 수량 {sale.remaining}주 · 예상 현금 {won(sale.cash)}</p><LearningField label="선택 이유"><select value={saved.sellReason} onChange={(e) => update({ sellReason: e.target.value })} className={field}>{['비중 조절', '새 정보', '계획 달성', '현금 필요', '판단 보류', '기타', '기록하지 않음'].map((reason) => <option key={reason}>{reason}</option>)}</select></LearningField></>}
    {stage === 4 && <><ol className="space-y-3 border-l-2 border-brand-200 pl-4 text-sm"><li className="whitespace-pre-wrap break-words"><strong>매수 근거</strong><br />{saved.reason || '기록 없음'}</li><li><strong>가상 매수 체결</strong><br />10,000원 × 30주</li><li className="whitespace-pre-wrap break-words"><strong>보유 중 점검</strong><br />{saved.check} · {saved.checkReason || '이유 기록 없음'}</li><li><strong>{quantity ? '가상 매도 체결' : '매도하지 않음'}</strong><br />{quantity ? `9,000원 × ${quantity}주` : '새 체결 없음'} · {saved.sellReason}</li></ol><AccountSnapshot cash={sale.cash} market={sale.market} total={sale.total} /><p className="text-sm">실현손익 {wonSigned(sale.realized)} · 남은 평가손익 {wonSigned(sale.unrealized)}</p><LearningField label="다음에는 무엇을 확인할까요? (선택)"><textarea value={saved.nextCheck} maxLength={300} rows={2} onChange={(e) => update({ nextCheck: e.target.value })} className={field} /></LearningField><Link to="/learn?tab=courses&lesson=C2" className="text-sm text-brand-700 underline">관련 설명: 전량 매도와 일부 매도는 무엇이 다를까?</Link><p className="text-xs text-gray-500">추천 이유: 이번 실습에서 매도 수량에 따른 잔여 보유분의 차이를 살펴봤습니다.</p><LearningButton onClick={() => update({ completed: true })}>{saved.completed ? '복기 확인 완료' : '복기 확인 완료로 표시'}</LearningButton>{saved.completed && <p role="status" className="text-sm text-gray-600">이 가상 거래의 기록을 확인했어요. 선택의 수익률로 점수를 매기지 않습니다.</p>}</>}
    <div className="flex flex-wrap gap-2"><LearningButton secondary disabled={stage === 0} onClick={() => update({ stage: stage - 1 })}>이전 단계</LearningButton>{stage < 4 && <LearningButton onClick={() => update({ stage: stage + 1 })}>{['가상 체결 결과 보기', '보유 중 장면 보기', '매도 준비 장면 보기', '선택 후 복기 보기'][stage]}</LearningButton>}</div>
    <details className="text-xs text-gray-500"><summary className="cursor-pointer">이 가상 연습 초기화</summary><p className="my-2">이 연습의 근거·점검·복기 입력을 지우고 처음부터 시작합니다.</p><LearningButton secondary onClick={() => store.remove('scenario')}>연습 기록 지우고 시작</LearningButton></details>
    <StorageNotice state={state} />
  </div>;
}

function AccountSnapshot({ cash, market, total }) {
  return <dl className="grid gap-2 sm:grid-cols-3">{[['현금', cash], ['주식 평가액', market], ['총자산', total]].map(([label, value]) => <div key={label} className="rounded-lg bg-gray-50 p-3"><dt className="text-xs text-gray-500">{label}</dt><dd className="tabular mt-1 font-bold">{won(value)}</dd></div>)}</dl>;
}
