import { useState } from 'react';
import useAuth from '../../hooks/useAuth';
import ErrorState from './ErrorState';
import { PracticeTarget } from '../learn/SitePractice';

export default function AccountPicker({ showLabel = true }) {
  const { accounts, accountId, selectAccount, accountError, sessionError, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const retry = async () => { setBusy(true); setError(null); try { await refresh(); } catch (err) { setError(err); } finally { setBusy(false); } };
  if ((accountError || error || sessionError) && !accounts.length) return <ErrorState error={error || accountError || sessionError} onRetry={busy ? undefined : retry} />;
  if (!accounts.length) return <div className="text-sm text-gray-500">선택할 계좌가 없어요. <button disabled={busy} onClick={retry} className="underline">계좌 다시 조회</button></div>;
  return <PracticeTarget id="account"><label className="flex min-w-0 items-center gap-2 whitespace-nowrap text-sm text-gray-600">{showLabel && '계좌'}<select aria-label="계좌" className="min-w-0 max-w-full flex-1 rounded border border-gray-300 bg-white px-3 py-2" value={accountId ?? ''} onChange={(event) => selectAccount(Number(event.target.value))}>{accounts.map((account) => <option key={account.account_id} value={account.account_id}>{account.account_name}{account.account_number ? ` · ${account.account_number}` : ''}</option>)}</select></label>
  </PracticeTarget>;
}
