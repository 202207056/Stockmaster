import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { createAccount } from '../api/auth';
import { getToken } from '../api/client';
import { InlineError } from '../components/common/ErrorState';
import { setOnboarding } from '../utils/onboarding';
import ThemeToggle from '../components/common/ThemeToggle';
import SeedAmountInput from '../components/common/SeedAmountInput';
import { validSeedAmount } from '../utils/seedAmount';

export default function SeedMoney() {
  const { user, isAuthenticated, isLoading, accounts, refresh, selectAccount } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('10000000');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [createdId, setCreatedId] = useState(null);
  const [ready, setReady] = useState(false);
  const locked = useRef(false);
  const value = Number(amount);
  const valid = validSeedAmount(amount);

  useEffect(() => {
    if (!ready || !isAuthenticated || !accounts.some(a => a.account_id === createdId)) return;
    selectAccount(createdId);
    setOnboarding(user?.user_id, 'tour:start');
    navigate('/dashboard?tour=start', { replace: true });
  }, [ready, isAuthenticated, accounts, createdId, selectAccount, navigate, user?.user_id]);

  async function submit(event) {
    event.preventDefault();
    if (!valid || locked.current || !isAuthenticated) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    const token = getToken();
    try {
      // Reuse the untouched default account; never reset an existing portfolio.
      const existing = accounts.find(a => Number(a.balance) === value && Number(a.withdrawable_cash) === value);
      let id = createdId ?? existing?.account_id;
      if (id == null) {
        const account = await createAccount(value);
        if (token !== getToken()) return;
        id = account.account_id;
        setCreatedId(id);
      }
      await refresh();
      if (token !== getToken()) return;
      setCreatedId(id);
      setReady(true);
    } catch (err) {
      if (token === getToken()) setError(err);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return <main className="min-h-screen bg-white">
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-extrabold text-white">MI</span>
        <span className="text-sm font-extrabold text-gray-900">프로젝트</span>
        </div>
      </div>
    <section className="mt-8">
      <p className="text-sm font-bold text-brand-600">시드머니 설정</p>
      <h1 className="mt-2 text-3xl font-extrabold text-gray-900">얼마로 투자를 시작할까요?</h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">시드머니는 모의투자에 사용할 시작 자금이에요.</p>
      {!isAuthenticated ? <p className="mt-6">{isLoading ? '계좌를 불러오는 중이에요…' : <Link className="text-brand-700 underline" to="/login">로그인 후 설정하기</Link>}</p> : <form onSubmit={submit} className="mt-8">
        <fieldset disabled={busy || createdId != null} className="min-w-0 rounded-xl border border-gray-200 p-6"><legend className="px-2 text-sm font-bold text-gray-900">시작 금액 선택</legend><SeedAmountInput id="seed-amount" amount={amount} onChange={setAmount} />
        </fieldset>
        <div className="mt-4"><InlineError error={error} /></div>
        {ready && !accounts.some(a => a.account_id === createdId) && <p role="status" className="text-sm">계좌가 생성되었어요. 다시 눌러 계좌 정보를 불러와 주세요.</p>}
        <div className="mt-8 flex flex-wrap gap-3 pb-8">
          <button disabled={!valid || busy} className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-50">{busy ? '계좌 준비 중…' : '설정하기'}</button>
        </div>
      </form>}
    </section>
    <div className="mt-6 flex justify-end border-t border-gray-100 pt-3"><ThemeToggle /></div>
    </div>
  </main>;
}
