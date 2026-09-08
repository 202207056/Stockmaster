import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { num, won } from '../utils/format';
import HelpIcon from '../components/learn/HelpIcon';
import LoginNotice from '../components/common/LoginNotice';
import AccountPicker from '../components/common/AccountPicker';

/**
 * 마이페이지 (F-2 라우팅 연결)
 *
 * 헤더의 사용자 이름이 여기로 옵니다. 라우트가 없으면 404 로 떨어지므로 함께 만듭니다.
 * 표시하는 값은 이미 AuthContext 가 들고 있는 것(/users/me, /trading/accounts)뿐이고,
 * 추가 API 호출은 하지 않습니다. 나머지는 F-20 에서 채웁니다.
 *
 * 로그인하지 않고 들어오면 빈 표 대신 로그인 안내를 보여 줍니다.
 * (개인정보 화면이라 "둘러보기"로 채울 내용이 없습니다)
 */
export default function MyPage() {
  const { user, account, isAuthenticated } = useAuth();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-xl font-extrabold text-gray-900">내 정보</h1>
      </div>

      {!isAuthenticated ? (
        <LoginNotice message="내 정보는 로그인해야 볼 수 있어요" />
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-gray-500">계정</h2>
            <dl className="divide-y divide-gray-100 rounded-xl border border-gray-200">
              <Row label="이름" value={user?.user_name} />
              <Row label="아이디" value={user?.login_id} />
              <Row label="이메일" value={user?.email} />
              <Row
                label={
                  <>
                    투자성향
                    <HelpIcon termId="risk_profile" />
                  </>
                }
                value={
                  user?.investment_style ?? (
                    <Link to="/survey" className="font-bold text-brand-600 hover:underline">
                      설문하고 확인하기 →
                    </Link>
                  )
                }
              />
            </dl>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-gray-500">계좌</h2>
            <AccountPicker />
            {account ? (
              <dl className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                <Row label="계좌명" value={account.account_name} />
                <Row
                  label={
                    <>
                      예수금
                      <HelpIcon termId="deposit" />
                    </>
                  }
                  /* 계좌 API 의 금액은 문자열로 옵니다 — 반드시 num() 을 거칩니다. (§4-1) */
                  value={<span className="tabular">{account.withdrawable_cash == null ? '—' : won(num(account.withdrawable_cash))}</span>}
                />
                <Row
                  label={
                    <>
                      주문가능금액
                      <HelpIcon termId="orderable_cash" />
                    </>
                  }
                  value={<span className="tabular">{won(num(account.withdrawable_cash))}</span>}
                />
              </dl>
            ) : (
              <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
                계좌 정보를 불러오지 못했어요.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="flex items-center text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-bold text-gray-900">{value ?? '-'}</dd>
    </div>
  );
}
