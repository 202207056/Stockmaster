import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { num, won } from '../utils/format';
import HelpIcon from '../components/learn/HelpIcon';
import LoginNotice from '../components/common/LoginNotice';

/**
 * 내 자산 (Doc/13 §5-1)
 *
 * 걷어낸 것
 *  - 총자산 22,616,925원 / 내 투자 12,616,925원 → 하드코딩된 가짜 숫자
 *  - "달러 $5,000" 카드 → 이 서비스에는 외화 계좌 개념 자체가 없습니다
 *  - "총 수익 / 일간 수익" 항목 → 체결 테이블과 일별 스냅샷이 없어 계산이 불가능합니다
 *
 * 표시 원칙
 *  - 예수금·주문가능금액은 AuthContext 가 이미 들고 있는 값이라 로그인하면 바로 정확합니다.
 *  - 평가금액·평가손익은 보유종목의 현재가를 조회해 프론트가 직접 계산해야 합니다.
 *    (/trading/portfolio 의 total_value 는 평가금액이 아니라 "매입금액"입니다 — §3-5)
 *    이 계산은 F-14 에서 붙입니다.
 *  - 실현손익("총 수익")은 프론트에서도 계산할 수 없으므로 화면에서 뺐습니다.
 *
 * 로그인하지 않아도 화면 구조는 그대로 보이고, 금액 자리에만 안내가 들어갑니다.
 */
export default function Assets() {
  const { account, isAuthenticated } = useAuth();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-12">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-xl font-extrabold text-gray-900">내 자산</h1>
        {account && <p className="mt-1 text-sm text-gray-500">{account.account_name}</p>}
      </div>

      {!isAuthenticated && (
        <LoginNotice message="로그인하면 내 계좌의 실제 금액이 표시돼요" />
      )}

      {/* 총자산 */}
      <section>
        <h2 className="flex items-center text-lg font-bold text-gray-700">
          총자산
          <HelpIcon termId="total_asset" />
        </h2>
        {/* TODO(F-14): 예수금 + 보유종목 평가금액 합계 */}
        <p className="mt-2 text-sm text-gray-300">보유종목 시세 연동 후 표시</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <AmountBox
            label={
              <>
                예수금
                <HelpIcon termId="deposit" />
              </>
            }
            /* 계좌 API 는 금액을 문자열로 돌려줍니다 — num() 필수 (§4-1) */
            value={account ? won(num(account.balance)) : null}
            pending={isAuthenticated ? '불러오는 중이에요' : '로그인하면 표시돼요'}
          />
          <AmountBox
            label={
              <>
                주문가능금액
                <HelpIcon termId="orderable_cash" />
              </>
            }
            value={account ? won(num(account.withdrawable_cash)) : null}
            pending={isAuthenticated ? '불러오는 중이에요' : '로그인하면 표시돼요'}
          />
        </div>
      </section>

      {/* 투자 */}
      <section>
        <h2 className="flex items-center text-lg font-bold text-gray-700">
          내 투자
          <HelpIcon termId="portfolio" />
        </h2>

        <dl className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200">
          <PendingRow
            label={
              <>
                매입금액
                <HelpIcon termId="buy_amount" />
              </>
            }
          />
          <PendingRow
            label={
              <>
                평가금액
                <HelpIcon termId="eval_amount" />
              </>
            }
          />
          <PendingRow
            label={
              <>
                평가손익
                <HelpIcon termId="eval_pnl" />
              </>
            }
          />
        </dl>

        {/* 왜 "총 수익"이 없는지 사용자에게도 설명해 둡니다. */}
        <p className="mt-3 text-xs leading-relaxed text-gray-400">
          지금은 아직 팔지 않은 종목의 평가손익만 보여 드려요. 실제로 팔아서 확정된
          <HelpIcon termId="realized_pnl" label="실현손익 설명 보기" />는 준비 중입니다.
        </p>
      </section>

      {/* 보유종목 */}
      <section className="pb-8">
        <h2 className="flex items-center text-lg font-bold text-gray-700">
          보유종목
          <HelpIcon termId="hold_quantity" />
        </h2>
        {/* TODO(F-14): GET /api/trading/portfolio?account_id= + 종목별 /stocks/{code}/price */}
        <div className="mt-4 rounded-lg border border-dashed border-gray-200 px-4 py-12 text-center">
          <p className="text-sm text-gray-400">보유종목 연동 준비 중이에요</p>
          <Link
            to="/trading"
            className="mt-3 inline-block rounded-md border border-gray-300 px-4 py-1.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
          >
            트레이딩으로 가기
          </Link>
        </div>
      </section>
    </div>
  );
}

function AmountBox({ label, value, pending }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-6">
      <div className="mb-1 flex items-center text-sm text-gray-500">{label}</div>
      {value != null ? (
        <div className="tabular text-xl font-extrabold text-gray-900">{value}</div>
      ) : (
        <div className="text-sm text-gray-300">{pending}</div>
      )}
    </div>
  );
}

function PendingRow({ label }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="flex items-center text-sm text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-300">연동 예정</dd>
    </div>
  );
}
