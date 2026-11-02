import { useId, useState } from 'react';
import { reportBrief } from '../../api/data';
import './BriefReport.css';

const reasons = [
  ['wrong_fact', '사실과 달라요'],
  ['wrong_stock', '다른 종목 내용이에요'],
  ['hard_to_read', '이해하기 어려워요'],
  ['other', '기타'],
];

// A small "신고하기" link that opens an inline form under a briefing.
export default function BriefReport({ kind, code, generatedAt, accountId }) {
  const [state, setState] = useState('idle');
  const [reason, setReason] = useState('wrong_fact');
  const [note, setNote] = useState('');
  const name = useId();

  async function send(event) {
    event.preventDefault();
    setState('sending');
    try {
      await reportBrief({ kind, code, generatedAt, accountId, reason, note });
      setState('done');
    } catch (error) {
      // A duplicate means this viewer already reported it; never show raw server details.
      setState(error?.response?.status === 409 ? 'done' : error?.response?.status === 429 ? 'limit' : 'error');
    }
  }

  if (state === 'done') return <p className="brief-report__done" role="status">신고가 접수됐어요. 확인 후 개선에 반영할게요.</p>;
  if (state === 'idle') return <button type="button" className="brief-report__open" onClick={() => setState('open')}>신고하기</button>;
  return <form className="brief-report" onSubmit={send} aria-label="브리핑 신고">
    <fieldset>
      <legend>어떤 점이 이상한가요?</legend>
      <div className="brief-report__reasons">
        {reasons.map(([value, label]) => <label key={value}>
          <input type="radio" name={name} value={value} checked={reason === value} onChange={() => setReason(value)} />{label}
        </label>)}
      </div>
    </fieldset>
    <input type="text" maxLength={200} value={note} onChange={event => setNote(event.target.value)}
      placeholder="자세한 내용 (선택, 200자까지)" aria-label="신고 내용" />
    {state === 'error' && <p role="alert">신고를 보내지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
    {state === 'limit' && <p role="alert">오늘은 더 이상 신고할 수 없어요.</p>}
    <div className="brief-report__actions">
      <button type="submit" disabled={state === 'sending'}>{state === 'sending' ? '보내는 중...' : '보내기'}</button>
      <button type="button" onClick={() => setState('idle')}>취소</button>
    </div>
  </form>;
}
