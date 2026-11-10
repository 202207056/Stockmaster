import { useEffect, useRef, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import { createAccount } from '../../api/auth';
import { getToken } from '../../api/client';
import { InlineError } from './ErrorState';
import SeedAmountInput from './SeedAmountInput';
import { validSeedAmount } from '../../utils/seedAmount';

export default function CreateAccount() {
  const { accounts, refresh, selectAccount, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('10000000');
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const locked = useRef(false);
  const completed = useRef(null);
  useEffect(() => {
    if (!created || !isAuthenticated || completed.current === created.account_id || !accounts.some(item => item.account_id === created.account_id)) return;
    completed.current = created.account_id;
    selectAccount(created.account_id);
  }, [created, accounts, isAuthenticated, selectAccount]);
  const synced = created && accounts.some(item => item.account_id === created.account_id);
  async function submit(event) {
    event.preventDefault();
    if (locked.current || !isAuthenticated || (!created && (!name.trim() || !validSeedAmount(amount)))) return;
    locked.current = true; setBusy(true); setError(null);
    const token = getToken();
    try {
      if (!created) {
        const result = await createAccount(Number(amount), name.trim());
        if (token !== getToken()) return;
        setCreated(result);
      }
      await refresh();
    } catch (err) { if (token === getToken()) setError(err); }
    finally { locked.current = false; setBusy(false); }
  }
  return <section className="settings-panel" aria-labelledby="create-account-title">
    <div className="settings-create-heading"><div><h3 id="create-account-title">계좌 추가</h3><p className="settings-caption">투자 목적에 맞게 계좌를 나누고 시작금액을 정하세요.</p></div>{!open && <button type="button" className="settings-button" onClick={() => { setOpen(true); setCreated(null); setError(null); setName(''); setAmount('10000000'); }}>새 계좌 만들기</button>}</div>
    {open && <form onSubmit={submit}>
      {!created && <fieldset disabled={busy} className="min-w-0 space-y-4"><div><label htmlFor="new-account-name" className="block text-sm font-bold">계좌 이름</label><input id="new-account-name" required maxLength={100} placeholder="예: 장기투자 계좌" value={name} onChange={event => setName(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-3 text-sm" /></div><SeedAmountInput id="new-account-amount" amount={amount} onChange={setAmount} /><p className="settings-caption">개설 시 사이트 고유 모의투자 계좌번호가 자동 부여됩니다. 실제 입금 없이 모의투자 자금으로 시작합니다.</p></fieldset>}
      {created && <div role="status" className="settings-created"><strong>{created.account_name} 계좌를 만들었어요.</strong><p>모의투자 계좌번호: {created.account_number || '계좌 목록에서 확인해 주세요'}</p><p>{synced ? '새 계좌가 선택되었습니다.' : '계좌 목록을 다시 불러오면 새 계좌가 선택됩니다.'}</p></div>}
      <InlineError error={error} />
      <div className="settings-form-actions"><button type="button" disabled={busy} className="settings-button" onClick={() => setOpen(false)}>{created ? '닫기' : '취소'}</button>{!synced && <button type="submit" disabled={busy || (!created && (!name.trim() || !validSeedAmount(amount)))} className="settings-button settings-button-primary">{busy ? '처리 중…' : created ? '계좌 목록 다시 불러오기' : '계좌 개설하기'}</button>}</div>
    </form>}
  </section>;
}
