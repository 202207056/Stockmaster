import { useState } from 'react';
import useLearning from '../../hooks/useLearning';
import { LearningButton, LearningField, StorageNotice } from './LearningUI';

const defaults = { reason: '', evidence: '', uncertainty: '', condition: '', createdAt: '', revisions: [] };
const fieldClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm';

/** A symbol-scoped local notebook; never presented as an order-time snapshot. */
export default function DecisionNotebook({ scope, symbol, mode = '매수' }) {
  const { state, store } = useLearning(scope);
  const key = `plan:${symbol}`;
  const plan = store.read(key, defaults);
  const [reason, setReason] = useState(plan.reason);
  const [evidence, setEvidence] = useState(plan.evidence);
  const [uncertainty, setUncertainty] = useState(plan.uncertainty);
  const [condition, setCondition] = useState(plan.condition);
  const [check, setCheck] = useState('판단 보류');
  const [checkReason, setCheckReason] = useState('');
  const [message, setMessage] = useState('');
  const revisions = plan.revisions.filter((item) => typeof item.createdAt === 'string' && typeof item.reason === 'string' && typeof item.choice === 'string');
  const save = () => {
    const now = new Date().toISOString();
    const persistent = !plan.createdAt
      ? store.write(key, { reason: reason.trim(), evidence: evidence.trim(), uncertainty: uncertainty.trim(), condition: condition.trim(), createdAt: now, revisions: [] })
      : store.write(key, { ...plan, revisions: [...revisions, { choice: check, reason: checkReason.trim(), createdAt: now }].slice(-50) });
    setMessage(persistent ? '이 기기에 기록했습니다.' : '이번 방문 동안만 기록을 유지합니다.');
    setCheckReason('');
  };
  return <div className="flex flex-col gap-3">
    <p className="text-xs leading-relaxed text-gray-500">{symbol} · 현재 계좌의 종목 판단 노트입니다. 특정 주문의 당시 근거로 자동 연결되지 않습니다. 입력하지 않아도 주문할 수 있어요.</p>
    {plan.createdAt ? <><div className="rounded-lg bg-gray-50 p-3 text-sm leading-relaxed"><h3 className="font-bold">처음 남긴 기록</h3><p className="mt-2 whitespace-pre-wrap break-words">{plan.reason}</p>{[['확인한 자료', plan.evidence], ['불확실한 점', plan.uncertainty], ['다시 확인할 조건', plan.condition]].map(([label, value]) => <p key={label} className="mt-1 whitespace-pre-wrap break-words"><strong>{label}:</strong> {value || '기록 없음'}</p>)}<p className="mt-2 text-xs text-gray-500">기록 시각 {new Date(plan.createdAt).toLocaleString('ko-KR')}</p></div>
      {revisions.length > 0 && <details className="text-sm"><summary className="cursor-pointer text-gray-600">계획 점검 이력 {revisions.length}개</summary><ol className="mt-3 space-y-3 border-l-2 border-gray-200 pl-3">{revisions.map((item, i) => <li key={`${item.createdAt}-${i}`}><p className="font-bold">{item.choice}</p><p className="whitespace-pre-wrap break-words">{item.reason}</p><p className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleString('ko-KR')}</p></li>)}</ol></details>}
      <LearningField label={mode === '매도' ? '지금 매도하려는 이유' : '처음 생각이 달라졌나요?'}><select value={check} onChange={(e) => setCheck(e.target.value)} className={fieldClass}>{['판단 보류', '계획 유지', '계획 수정', '비중 조절', '새 정보', '계획 달성', '현금 필요'].map((choice) => <option key={choice}>{choice}</option>)}</select></LearningField>
      <LearningField label="변경 이유 또는 새로 확인한 정보"><textarea value={checkReason} onChange={(e) => setCheckReason(e.target.value)} rows={2} maxLength={300} className={fieldClass} /></LearningField>
    </> : <>
      <LearningField label={mode === '매도' ? '지금의 매도 판단 기록' : '어떤 근거로 판단하나요?'}><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} className={fieldClass} /></LearningField>
      <LearningField label="확인한 자료·출처 (선택)"><input value={evidence} onChange={(e) => setEvidence(e.target.value)} maxLength={300} className={fieldClass} placeholder="기사 제목·발행 시각 등" /></LearningField>
      <LearningField label="아직 불확실한 점 (선택)"><input value={uncertainty} onChange={(e) => setUncertainty(e.target.value)} maxLength={300} className={fieldClass} /></LearningField>
      <LearningField label="다시 확인할 조건 (선택)"><input value={condition} onChange={(e) => setCondition(e.target.value)} maxLength={200} className={fieldClass} /></LearningField>
      <p className="text-xs text-gray-500">과거 매수 근거가 없다면 지금의 기록부터 시작합니다. 조건 도달을 자동 판정하지 않습니다.</p>
    </>}
    <div><LearningButton disabled={plan.createdAt ? !checkReason.trim() : !reason.trim()} onClick={save}>{plan.createdAt ? '점검 기록 남기기' : '현재 판단 기록하기'}</LearningButton></div>
    {message && <p role="status" className="text-xs text-gray-600">{message}</p>}
    <StorageNotice state={state} />
    {plan.createdAt && <details className="text-xs text-gray-500"><summary className="cursor-pointer">이 종목의 기기 기록 삭제</summary><p className="my-2">원본과 점검 이력을 지웁니다. 실제 주문은 삭제하지 않습니다.</p><LearningButton secondary onClick={() => { store.remove(key); setReason(''); setEvidence(''); setUncertainty(''); setCondition(''); setMessage('기록 삭제를 요청했습니다.'); }}>종목 판단 기록 삭제</LearningButton></details>}
  </div>;
}
