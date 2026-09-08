import { useState } from 'react';
import useAuth from '../../hooks/useAuth';
import ErrorState from './ErrorState';

export default function AccountPicker() {
  const { accounts, accountId, selectAccount, accountError, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const retry = async () => { setBusy(true); setError(null); try { await refresh(); } catch (err) { setError(err); } finally { setBusy(false); } };
  if (accountError || error) return <ErrorState error={error || accountError} onRetry={busy ? undefined : retry} />;
  if (!accounts.length) return <div className="text-sm text-gray-500">선택할 계좌가 없어요. <button disabled={busy} onClick={retry} className="underline">계좌 다시 조회</button></div>;
  return <label className="flex items-center gap-2 text-sm text-gray-600">계좌<select className="max-w-full rounded border border-gray-300 bg-white px-3 py-2" value={accountId ?? ''} onChange={(event) => selectAccount(Number(event.target.value))}>{accounts.map((account) => <option key={account.account_id} value={account.account_id}>{account.account_name}</option>)}</select></label>;
}
