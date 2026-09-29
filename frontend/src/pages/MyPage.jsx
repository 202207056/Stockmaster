import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { num, won } from '../utils/format';
import HelpIcon from '../components/learn/HelpIcon';
import LoginNotice from '../components/common/LoginNotice';
import AccountPicker from '../components/common/AccountPicker';
import useMiniAssetsSetting from '../hooks/useMiniAssetsSetting';

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
  const [miniAssetsEnabled, setMiniAssetsEnabled] = useMiniAssetsSetting();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-xl font-extrabold text-gray-900">내 정보</h1>
      </div>

      <section className="flex flex-col gap-3" aria-labelledby="display-settings-title">
        <h2 id="display-settings-title" className="text-sm font-bold text-gray-500">화면 설정</h2>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 px-4 py-4">
          <div>
            <p id="mini-assets-setting-label" className="text-sm font-bold text-gray-900">미니 내 자산 탭</p>
            <p id="mini-assets-setting-description" className="mt-1 text-xs text-gray-500">모든 화면에서 내 자산 버튼을 표시해요. 설정은 이 브라우저에 저장돼요.</p>
          </div>
          <button type="button" role="switch" aria-checked={miniAssetsEnabled} aria-labelledby="mini-assets-setting-label" aria-describedby="mini-assets-setting-description"
            onClick={() => setMiniAssetsEnabled(!miniAssetsEnabled)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition-colors ${miniAssetsEnabled ? 'bg-brand-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
            {miniAssetsEnabled ? 'ON' : 'OFF'}
            <span aria-hidden="true" className={`relative h-5 w-9 rounded-full ${miniAssetsEnabled ? 'bg-brand-400' : 'bg-gray-400'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${miniAssetsEnabled ? 'translate-x-4' : 'translate-x-0.5'} left-0`} />
            </span>
          </button>
        </div>
      </section>

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
