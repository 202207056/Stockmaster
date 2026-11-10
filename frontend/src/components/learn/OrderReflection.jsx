import { useState } from 'react';
import useLearning from '../../hooks/useLearning';
import { LearningButton, LearningField } from './LearningUI';

export default function OrderReflection({ scope, order, onClose }) {
  const { store } = useLearning(scope);
  const recordKey = `order-review:${order.order_id}`;
  const saved = store.read(recordKey, { title: '', note: '', nextCheck: '', updatedAt: '' });
  const defaultTitle = `주문#${order.order_id}`;
  const [title, setTitle] = useState(saved.title || defaultTitle);
  const [note, setNote] = useState(saved.note);
  const [nextCheck, setNextCheck] = useState(saved.nextCheck);
  const [message, setMessage] = useState('');
  return <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><input aria-label="복기 제목" placeholder={defaultTitle} className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-900" maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} /><LearningButton secondary onClick={onClose}>닫기</LearningButton></div><div className="mt-4 space-y-3"><LearningField label="당시 확인했던 정보와 지금 돌아본 점"><textarea className="rounded-lg border border-gray-300 px-3 py-2 text-sm" maxLength={500} rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></LearningField><LearningField label="다음에는 무엇을 확인할까요? (선택)"><textarea className="rounded-lg border border-gray-300 px-3 py-2 text-sm" maxLength={300} rows={2} value={nextCheck} onChange={(e) => setNextCheck(e.target.value)} /></LearningField><LearningButton disabled={!note.trim()} onClick={() => { const persistent = store.write(recordKey, { title: title.trim() || defaultTitle, note: note.trim(), nextCheck: nextCheck.trim(), updatedAt: new Date().toISOString() }); setTitle(title.trim() || defaultTitle); setMessage(persistent ? '이 기기에 사후 복기를 저장했습니다.' : '저장에 실패해 이번 방문 동안만 유지됩니다.'); }}>사후 복기 저장</LearningButton>{message && <p role="status" className="text-xs">{message}</p>}{saved.updatedAt && <details className="text-xs text-gray-500"><summary className="cursor-pointer">이 사후 복기 삭제</summary><LearningButton secondary className="mt-2" onClick={() => { store.remove(recordKey); setTitle(''); setNote(''); setNextCheck(''); setMessage('삭제를 요청했습니다.'); }}>기기 복기 기록 삭제</LearningButton></details>}</div></div>;
}
