import { useState } from 'react';
import { won, wonSigned, signTextClass } from '../../utils/format';
import { partialSale } from '../../utils/learning';
import { LearningButton, LearningField, SimulationLabel } from './LearningUI';
import AllocationPractice from './AllocationPractice';

const inputClass = 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';

function Value({ title, value }) { return <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-gray-500">{title}</p><p className="tabular mt-1 font-bold">{value}</p></div>; }

export default function InteractivePractice({ type, lessonId, onEvidence }) {
  const [amount, setAmount] = useState(type === 'sale' ? 0 : 30);
  const [change, setChange] = useState(0);
  const [selection, setSelection] = useState('');
  const [memo, setMemo] = useState('');
  const [copied, setCopied] = useState(false);
  if (type === 'allocation') return <AllocationPractice />;
  if (type === 'plan' || type === 'hindsight') return <ReasoningPractice lessonId={lessonId || (type === 'hindsight' ? 'E3' : 'E1')} onEvidence={onEvidence} />;
  let presets = [];
  if (type === 'account') presets = [['30만원 매수 · 가격 그대로', () => { setAmount(30); setChange(0); }], ['매수 후 10% 하락', () => { setAmount(30); setChange(-10); }]];
  if (type === 'sale') presets = [['보유 유지', () => setAmount(0)], ['10주 매도', () => setAmount(10)], ['전량 매도', () => setAmount(30)]];
  if (type === 'depth') presets = [['10주 매수', () => setSelection('10')], ['20주 매수', () => setSelection('20')]];
  if (type === 'average') presets = [['추가 매수 안 함', () => setSelection('0')], ['10주 추가 매수', () => setSelection('10')]];
  let body;
  if (type === 'account') {
    const cost = amount * 10_000; const market = cost * (1 + change / 100);
    body = <><LearningField label={`가상 매수 금액: ${amount}만원`}><input type="range" min="0" max="100" step="10" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="accent-brand-600" /></LearningField><LearningField label={`매수 후 주가 변화: ${change}%`}><input type="range" min="-30" max="30" step="10" value={change} onChange={(e) => setChange(Number(e.target.value))} className="accent-brand-600" /></LearningField><div className="grid gap-2 sm:grid-cols-3"><Value title="현금" value={won(1_000_000 - cost)} /><Value title="주식 평가액" value={won(market)} /><Value title="총자산" value={won(1_000_000 - cost + market)} /></div><p>가격 변화가 없으면 현금이 주식으로 바뀔 뿐 총자산은 같습니다.</p></>;
  } else if (type === 'sale') {
    const qty = Math.min(amount, 30); const result = partialSale(qty);
    body = <><p>10,000원에 매수한 30주 · 현재가 9,000원 · 현금 700,000원</p><LearningField label={`매도 수량: ${qty}주 (0주는 매도하지 않음)`}><input type="range" min="0" max="30" step="10" value={qty} onChange={(e) => setAmount(Number(e.target.value))} className="accent-brand-600" /></LearningField><div className="grid gap-2 sm:grid-cols-3"><Value title="매도 후 현금" value={won(result.cash)} /><Value title="남은 주식" value={`${result.remaining}주`} /><Value title="총자산" value={won(result.total)} /></div><div aria-live="polite" className="space-y-3">{lessonId === 'C2' ? <><Value title="여기서 주가가 1,000원 더 하락하면 생기는 추가 손실" value={won(result.remaining * 1000)} /><p>남은 {result.remaining}주 × 1,000원 = {won(result.remaining * 1000)}. {result.remaining === 0 ? '모두 현금으로 바꿔 이 종목의 추가 가격 변화는 계좌에 영향을 주지 않습니다.' : '매도한 주식이 아니라, 남겨 둔 주식만 이후 가격 변화의 영향을 받습니다.'}</p></> : <><p className={signTextClass(result.realized)}>실현손익 {wonSigned(result.realized)} · 남은 평가손익 {wonSigned(result.unrealized)}</p><Value title="실현손익 + 남은 평가손익" value={wonSigned(result.realized + result.unrealized)} /><p>{qty === 0 ? '아직 팔지 않았지만 현재 평가손실은 3만원입니다.' : `${qty}주를 팔아 손실 일부가 실현손실로 바뀌었습니다. 손실 합계는 여전히 3만원입니다.`}</p></>}</div></>;
  } else if (type === 'limit') {
    const limit = selection || '9900';
    body = <><p>매도호가 10,000원에 10주가 있다고 가정합니다. 내 매수 수량은 1주입니다.</p><LearningField label="지정 매수 가격"><select value={limit} onChange={(e) => setSelection(e.target.value)} className={inputClass}><option value="9900">9,900원</option><option value="10000">10,000원</option><option value="10100">10,100원</option></select></LearningField><p role="status" className="rounded-lg bg-brand-50 p-3">{Number(limit) < 10000 ? '조건이 맞지 않아 대기합니다.' : '이 가상 호가에서는 10,000원에 체결 가능한 조건입니다.'}</p><p>단순화한 교육 모델입니다. 실제 대기열·시세 변화·체결 보장은 포함하지 않습니다.</p></>;
  } else if (type === 'depth') {
    const qty = Number(selection || 20); const cost = Math.min(qty, 10) * 10000 + Math.max(qty - 10, 0) * 10100;
    body = <><p>매도호가: 10,000원에 10주 / 10,100원에 20주</p><LearningField label={`가상 매수 수량: ${qty}주`}><input type="range" min="1" max="30" value={qty} onChange={(e) => setSelection(e.target.value)} className="accent-brand-600" /></LearningField><div aria-live="polite"><p className="mb-3">10,000원 × {Math.min(qty, 10)}주 + 10,100원 × {Math.max(qty - 10, 0)}주 = {won(cost)}</p><Value title="총 체결금액 / 평균 체결가" value={`${won(cost)} / ${(cost / qty).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}원`} /><p className="mt-3">{qty <= 10 ? '전부 첫 번째 가격으로 살 수 있어 평균 체결가도 10,000원입니다.' : `첫 번째 가격의 10주를 넘는 ${qty - 10}주는 더 높은 가격으로 사므로 평균 체결가가 올라갑니다.`}</p></div></>;
  } else if (type === 'recovery') {
    const fall = Number(selection || 20); const base = 100 * (1 - fall / 100);
    body = <><LearningField label={`100에서 ${fall}% 하락한 뒤 같은 비율 상승`}><input type="range" min="10" max="50" step="10" value={fall} onChange={(e) => setSelection(e.target.value)} className="accent-brand-600" /></LearningField><Value title="가격 경로" value={`100 → ${base} → ${(base * (1 + fall / 100)).toFixed(1)}`} /><p>원금 회복에 필요한 상승률: {((100 / base - 1) * 100).toFixed(1)}%. 상승률을 적용하는 기준금액이 달라집니다.</p></>;
  } else if (type === 'average') {
    const qty = Number(selection || 10); const cost = 100000 + 8000 * qty;
    body = <><p>기존 10,000원 × 10주에 8,000원으로 추가 매수합니다.</p><LearningField label={`추가 매수: ${qty}주`}><input type="range" min="0" max="30" step="5" value={qty} onChange={(e) => setSelection(e.target.value)} className="accent-brand-600" /></LearningField><div className="grid gap-2 sm:grid-cols-3"><Value title="평균 매입가" value={won(cost / (10 + qty))} /><Value title="총매입금액" value={won(cost)} /><Value title="보유 수량" value={`${10 + qty}주`} /></div><div aria-live="polite" className="rounded-lg bg-brand-50 p-4"><p>현재 평가손실: {won(cost - (10 + qty) * 8000)}</p><p className="mt-2 font-bold">여기서 7,000원으로 더 하락하면 추가 손실: {won((10 + qty) * 1000)}</p><p className="mt-2">{10 + qty}주 × 1,000원. {qty > 0 ? '평균단가가 내려가도 보유수량이 늘어 같은 추가 하락의 손실이 커집니다.' : '추가 매수 전의 손실 규모입니다. 10주 추가 매수와 비교하세요.'}</p></div></>;
  } else if (type === 'shock') {
    body = <><p>각 종목에 10만원씩 보유합니다. 가상 묶음 A는 같은 업종, B는 다른 조건의 기업들입니다.</p><LearningField label="교육용 충격 시나리오"><select value={selection || 'industry'} onChange={(e) => setSelection(e.target.value)} className={inputClass}><option value="industry">특정 업종 충격</option><option value="market">시장 전체 충격</option></select></LearningField><p className="rounded-lg bg-gray-50 p-3">{selection === 'market' ? 'A: −10%, −10%, −10% → −30,000원 / B: −10%, −10%, −10% → −30,000원' : 'A: −10%, −10%, −10% → −30,000원 / B: −10%, 0%, +5% → −5,000원'}</p><p>미리 정한 가상 수익률입니다. 한 사례의 결과를 모든 상황에 일반화하지 않습니다.</p></>;
  } else if (type === 'evidence') {
    body = <><p className="rounded-lg bg-gray-50 p-3">가상 기사 · 실습 1일차: X기업 매출 +20%, 영업이익 −10%.</p><LearningField label="자료에서 확인되는 사실"><select value={selection} onChange={(e) => { setSelection(e.target.value); setCopied(false); }} className={inputClass}><option value="">선택해 주세요</option><option value="매출은 늘고 영업이익은 줄었다">매출은 늘고 영업이익은 줄었다</option><option value="주가가 반드시 오른다">주가가 반드시 오른다</option><option value="영업이익도 증가했다">영업이익도 증가했다</option></select></LearningField>{selection && <p role="status">{selection.startsWith('매출') ? '자료가 뒷받침하는 사실입니다. 이익 감소의 원인은 더 확인해야 합니다.' : '제시된 기사만으로 뒷받침되지 않습니다. 두 숫자를 다시 살펴보세요.'}</p>}<LearningField label="더 확인하고 싶은 정보"><textarea maxLength={300} rows={2} value={memo} onChange={(e) => { setMemo(e.target.value); setCopied(false); }} className={inputClass} placeholder="예: 이익 감소의 원인" /></LearningField>{onEvidence && <div><LearningButton disabled={!selection.startsWith('매출') || !memo.trim()} onClick={() => { onEvidence(`${selection}. 추가 확인: ${memo.trim()}`); setCopied(true); }}>가상 판단 메모로 가져오기</LearningButton>{copied && <p role="status" className="mt-2 text-xs">가상 거래 연습의 매수 근거에 반영했습니다. 실제 주문은 생성하지 않습니다.</p>}</div>}</>;
  } else if (type === 'context') {
    body = <><div className="grid gap-3 sm:grid-cols-2"><Value title="X기업" value="발표 전 기대 +20% → 실제 이익 +10%" /><Value title="Y기업" value="발표 전 기대 +5% → 실제 이익 +10%" /></div><LearningField label="발표 전 기대를 웃돈 기업은 어디인가요?"><select value={selection} onChange={(e) => setSelection(e.target.value)} className={inputClass}><option value="">비교해서 선택해 주세요</option><option value="x">X기업</option><option value="y">Y기업</option><option value="same">둘 다 이익 +10%이므로 같다</option></select></LearningField>{selection && <div role="status" className="rounded-lg bg-brand-50 p-4"><p className="font-bold">{selection === 'y' ? '맞습니다. Y기업은 기대를 웃돌았습니다.' : '증가율 자체보다 기대와의 차이를 비교해 보세요.'}</p><p className="mt-2">X는 기대보다 10%p 낮고, Y는 기대보다 5%p 높습니다. 같은 +10%도 비교 기준이 다르면 의미가 달라집니다. 실제 주가 반응은 다른 정보도 필요합니다.</p></div>}</>;
  } else if (type === 'metric') {
    body = <><p>가상 X: PER 8, 일회성 자산매각 이익 포함. 가상 Y: PER 15, 반복 영업이익 중심. 업종도 다릅니다.</p><LearningField label="다음에 살펴볼 항목"><select value={selection} onChange={(e) => setSelection(e.target.value)} className={inputClass}><option value="">선택해 주세요</option><option value="earnings">반복 가능한 이익과 업종 비교</option><option value="price">PER 숫자만 비교</option></select></LearningField>{selection && <p role="status">{selection === 'earnings' ? '이익이 지속 가능한지와 비교 가능한 기업인지 확인합니다.' : '한 숫자만으로 기업의 차이를 모두 설명하기 어렵습니다.'}</p>}</>;
  } else {
    body = <p>이 활동을 찾을 수 없습니다. 투자 기초 과정에서 수업을 다시 선택해 주세요.</p>;
  }
  return <div className="flex flex-col gap-4 text-sm leading-relaxed text-gray-600"><div><SimulationLabel /></div>{presets.length > 0 && <div className="flex flex-wrap gap-2" aria-label="비교할 상황 선택">{presets.map(([label, action]) => <LearningButton key={label} secondary onClick={action}>{label}</LearningButton>)}</div>}{body}</div>;
}

function ReasoningPractice({ lessonId, onEvidence }) {
  const [fact, setFact] = useState('');
  const [expectation, setExpectation] = useState('');
  const [condition, setCondition] = useState('');
  const [choice, setChoice] = useState('');
  const [saved, setSaved] = useState(false);
  const change = (setter) => (event) => { setter(event.target.value); setSaved(false); };
  const ready = lessonId === 'E1' ? fact.trim() && expectation.trim() && condition.trim() : choice && condition.trim();
  const scenario = lessonId === 'E1'
    ? '가상 공시: 매출은 20% 증가했습니다. 아직 비용과 영업이익 자료는 확인하지 않았습니다.'
    : lessonId === 'E2'
      ? '처음 계획: “매출 증가가 이익 증가로 이어지는지 확인하며 보유한다.” 새 공시: 매출 +20%, 영업이익 −10%, 원가 상승. 주가는 매수가보다 5% 올랐습니다.'
      : '가상 거래 A는 +10%, B는 −10%로 끝났습니다. 두 거래 모두 “매출 증가”만 보고 결정했고, 당시 공개된 영업이익 감소 자료는 검토하지 않았습니다.';
  return <div className="space-y-4 text-sm leading-relaxed text-gray-700"><SimulationLabel /><p className="rounded-lg bg-gray-50 p-4">{scenario}</p>
    {lessonId === 'E1' ? <><LearningField label="1. 자료에서 확인한 사실"><textarea rows={2} maxLength={300} value={fact} onChange={change(setFact)} className={inputClass} placeholder="예: 공시에서 매출이 20% 늘어난 것을 확인했다." /></LearningField><LearningField label="2. 아직 확인하지 못한 나의 기대"><textarea rows={2} maxLength={300} value={expectation} onChange={change(setExpectation)} className={inputClass} placeholder="예: 이익도 늘었을 것이라고 기대하지만 아직 모른다." /></LearningField></>
      : <LearningField label={lessonId === 'E2' ? '새 정보를 보고 계획을 어떻게 점검할까요?' : '결과와 별개로 두 판단의 공통 문제는 무엇인가요?'}><select value={choice} onChange={change(setChoice)} className={inputClass}><option value="">선택해 주세요</option>{(lessonId === 'E2' ? ['계획 유지', '계획 수정', '판단 보류'] : ['수익이 난 A는 검토할 필요가 없다', '둘 다 공개된 이익 감소 자료를 놓쳤다', '손실이 난 B만 근거를 점검하면 된다']).map((option) => <option key={option}>{option}</option>)}</select></LearningField>}
    {lessonId === 'E3' && choice && <p role="status" className="rounded-lg bg-brand-50 p-3">{choice === '둘 다 공개된 이익 감소 자료를 놓쳤다' ? '맞습니다. 결과는 달라도 두 판단에서 같은 정보가 빠졌습니다.' : '수익 여부로 과정을 판정하지 말고, 당시 확인할 수 있었던 자료를 두 거래 모두에 적용해 보세요.'}</p>}
    <LearningField label={lessonId === 'E1' ? '3. 다음에 확인할 자료와 판단을 다시 볼 조건' : lessonId === 'E2' ? '달라진 근거와 다음에 확인할 조건' : '다음 거래에서 개선할 확인 절차 한 가지'}><textarea rows={3} maxLength={300} value={condition} onChange={change(setCondition)} className={inputClass} placeholder={lessonId === 'E1' ? '예: 비용·영업이익을 확인하고, 매출 증가가 이익으로 이어지지 않았다면 근거를 다시 검토한다.' : lessonId === 'E2' ? '예: 이익 증가 기대와 다른 결과다. 원가 상승이 일시적인지 확인한 뒤 계획을 다시 정한다.' : '예: 매출뿐 아니라 영업이익과 비용의 변화도 확인한다.'} /></LearningField>
    {ready && <section className="rounded-lg border border-brand-200 p-4"><h4 className="mb-2 font-bold">내가 정리한 판단 메모</h4>{lessonId === 'E1' ? <><p className="whitespace-pre-wrap">확인한 사실: {fact}</p><p className="whitespace-pre-wrap">나의 기대: {expectation}</p></> : <p>{choice}</p>}<p className="whitespace-pre-wrap">다음 점검: {condition}</p><p className="mt-3 text-xs text-gray-500">내 문장에 확인한 사실과 아직 모르는 점이 구분되어 있는지 비교해 보세요. 자유서술은 자동 채점하지 않습니다.</p></section>}
    {onEvidence && <LearningButton disabled={!ready || (lessonId === 'E3' && choice !== '둘 다 공개된 이익 감소 자료를 놓쳤다')} onClick={() => { onEvidence(lessonId === 'E1' ? `사실: ${fact}\n기대: ${expectation}\n점검 조건: ${condition}` : `${choice}\n다음 점검: ${condition}`); setSaved(true); }}>이 메모를 가상 거래 연습에 사용하기</LearningButton>}{saved && <p role="status">가상 거래 연습의 판단 메모에 반영했습니다.</p>}
  </div>;
}
