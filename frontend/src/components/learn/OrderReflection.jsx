import { useState } from 'react';
import { Link } from 'react-router-dom';
import useLearning from '../../hooks/useLearning';
import { won } from '../../utils/format';
import { numberOrNull } from '../../api/normalize';
import { LearningButton, LearningField, StorageNotice } from './LearningUI';

export default function OrderReflection({ scope, order, onClose }) {
  const { store, state } = useLearning(scope);
  const recordKey = `order-review:${order.order_id}`;
  const saved = store.read(recordKey, { note: '', nextCheck: '', updatedAt: '' });
  const [note, setNote] = useState(saved.note);
  const [nextCheck, setNextCheck] = useState(saved.nextCheck);
  const [message, setMessage] = useState('');
  const price = numberOrNull(order.price);
  return <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">주문 #{order.order_id} 돌아보기</h3><LearningButton secondary onClick={onClose}>닫기</LearningButton></div><p className="text-sm">{order.symbol_code} · {order.order_type} · {order.quantity}주 · {price === null ? '가격 확인 불가' : won(price)} · {order.status}</p><p className="mt-2 text-xs text-gray-500">주문 당시의 판단 기록과 거래별 손익 연결은 준비 중입니다. 아래 내용은 지금 작성하는 사후 복기입니다.</p><div className="mt-4 space-y-3"><LearningField label="당시 확인했던 정보와 지금 돌아본 점"><textarea className="rounded-lg border border-gray-300 px-3 py-2 text-sm" maxLength={500} rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></LearningField><LearningField label="다음에는 무엇을 확인할까요? (선택)"><textarea className="rounded-lg border border-gray-300 px-3 py-2 text-sm" maxLength={300} rows={2} value={nextCheck} onChange={(e) => setNextCheck(e.target.value)} /></LearningField><LearningButton disabled={!note.trim()} onClick={() => { const persistent = store.write(recordKey, { note: note.trim(), nextCheck: nextCheck.trim(), updatedAt: new Date().toISOString() }); setMessage(persistent ? '이 기기에 사후 복기를 저장했습니다.' : '저장에 실패해 이번 방문 동안만 유지됩니다.'); }}>사후 복기 저장</LearningButton>{message && <p role="status" className="text-xs">{message}</p>}<StorageNotice state={state} /><Link to="/learn?tab=courses&lesson=E3" className="inline-block text-xs text-brand-700 underline">선택과 결과를 구분하는 설명 보기</Link>{saved.updatedAt && <details className="text-xs text-gray-500"><summary className="cursor-pointer">이 사후 복기 삭제</summary><LearningButton secondary className="mt-2" onClick={() => { store.remove(recordKey); setNote(''); setNextCheck(''); setMessage('삭제를 요청했습니다.'); }}>기기 복기 기록 삭제</LearningButton></details>}</div></div>;
}
