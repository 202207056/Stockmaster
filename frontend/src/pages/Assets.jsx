import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { won, wonSigned, signTextClass } from '../utils/format';
import HelpIcon from '../components/learn/HelpIcon';
import LoginNotice from '../components/common/LoginNotice';
import useRemote from '../hooks/useRemote';
import { fetchValuedPortfolio } from '../api/data';
import { numberOrNull, portfolioTotals, quotePrice } from '../api/normalize';
import AccountPicker from '../components/common/AccountPicker';
import RemoteState from '../components/common/RemoteState';

/** 기존 총자산·개인 지표·내 투자·보유종목 배치에 실제 조회 결과를 표시합니다. */
export default function Assets() {
  const { account, accountId, isAuthenticated } = useAuth();
  const resource = useRemote(useCallback((signal) => fetchValuedPortfolio(accountId, signal), [accountId]), isAuthenticated && !!accountId);
  const totals = portfolioTotals(resource.data);

  const pending = !isAuthenticated ? '로그인하면 표시돼요' : resource.loading ? '불러오는 중이에요' : '조회 불가';

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-xl font-extrabold text-gray-900">내 자산</h1>
        {account && <p className="mt-1 text-sm text-gray-500">{account.account_name}</p>}
        {isAuthenticated && <div className="mt-3"><AccountPicker /></div>}
      </div>

      {!isAuthenticated && <LoginNotice message="로그인하면 내 계좌의 실제 금액이 표시돼요" />}

      {/* ── 총자산 ──────────────────────────────────────────────── */}
      <section>
        <h2 className="flex items-center text-sm font-bold text-gray-500">
          총자산
          <HelpIcon termId="total_asset" />
        </h2>
        {/* TODO(F-14): 예수금 + 보유종목 평가금액 합계 */}
        <p className="tabular mt-1 text-4xl font-extrabold text-gray-900">
          {totals?.total != null ? won(totals.total) : isAuthenticated ? (
            <span className="text-base font-medium text-gray-300">
              {pending}
            </span>
          ) : (
            <span className="text-base font-medium text-gray-300">로그인하면 표시돼요</span>
          )}
        </p>

        {/* 홈에서 옮겨 온 개인 지표 4종 */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={
              <>
                예수금
                <HelpIcon termId="deposit" />
              </>
            }
            /* 계좌 API 는 금액을 문자열로 돌려줍니다 — num() 필수 (Doc/13 §4-1) */
            value={numberOrNull(account?.withdrawable_cash) !== null ? won(account.withdrawable_cash) : null}
            pending={pending}
          />
          <StatCard
            label={
              <>
                주문가능금액
                <HelpIcon termId="orderable_cash" />
              </>
            }
            value={numberOrNull(account?.withdrawable_cash) !== null ? won(account.withdrawable_cash) : null}
            pending={pending}
          />
          <StatCard
            label={
              <>
                평가손익
                <HelpIcon termId="eval_pnl" />
              </>
            }
            /* TODO(F-14): 보유종목 현재가로 직접 계산 (Doc/13 §5-1) */
            value={totals?.unrealized != null ? wonSigned(totals.unrealized) : null}
            pending={pending}
          />
          {/* 랭킹은 백엔드 계산식 버그로 "투자를 안 한 사람"이 1위로 올라옵니다.
              고쳐지기 전까지 숫자를 띄우면 오히려 신뢰를 잃으므로 비워 둡니다. (Doc/13 §6) */}
          <StatCard label="내 랭킹" pending="랭킹 계산식 수정 대기" />
        </div>
      </section>

      {/* ── 내 투자 ─────────────────────────────────────────────── */}
      <section>
        <h2 className="flex items-center text-lg font-bold text-gray-700">
          내 투자
          <HelpIcon termId="portfolio" />
        </h2>

        <dl className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200">
          <PendingRow
            value={totals?.cost != null ? won(totals.cost) : pending}
            label={
              <>
                매입금액
                <HelpIcon termId="buy_amount" />
              </>
            }
          />
          <PendingRow
            value={totals?.market != null ? won(totals.market) : pending}
            label={
              <>
                평가금액
                <HelpIcon termId="eval_amount" />
              </>
            }
          />
          <PendingRow
            value={totals?.unrealized != null ? wonSigned(totals.unrealized) : pending}
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

      {/* ── 보유종목 ────────────────────────────────────────────── */}
      <section className="pb-8">
        <h2 className="flex items-center text-lg font-bold text-gray-700">
          보유종목
          <HelpIcon termId="hold_quantity" />
        </h2>
        {/* TODO(F-14): GET /api/trading/portfolio?account_id= + 종목별 /stocks/{code}/price */}
        <RemoteState resource={resource} authenticated={isAuthenticated}>
        {resource.data?.holdings.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[600px] text-right text-sm"><thead className="bg-gray-50"><tr>{['종목', '보유수량', '평균단가', '현재가', '평가손익'].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{resource.data.holdings.map((holding) => {
          const price = quotePrice(holding.quote); const average = numberOrNull(holding.avg_price); const quantity = numberOrNull(holding.hold_quantity); const pnl = price !== null && average !== null && quantity !== null ? (price - average) * quantity : null;
          return <tr key={holding.portfolio_id ?? holding.symbol_code} className="border-b border-gray-100"><th className="p-3"><Link to={`/trading?code=${encodeURIComponent(holding.symbol_code)}`} className="text-brand-700">{holding.security_name || holding.symbol_code}</Link></th><td className="p-3">{quantity ?? '—'}</td><td className="p-3">{average === null ? '—' : won(average)}</td><td className="p-3">{price === null ? '시세 이용 불가' : won(price)}</td><td className={`p-3 ${signTextClass(pnl)}`}>{pnl === null ? '—' : wonSigned(pnl)}</td></tr>;
        })}</tbody></table></div> : <div className="mt-4 rounded-lg border border-dashed border-gray-200 px-4 py-12 text-center">
          <p className="text-sm text-gray-400">{accountId ? '보유한 종목이 없어요.' : '계좌를 선택해 주세요.'}</p>
          <Link
            to="/trading"
            className="mt-3 inline-block rounded-md border border-gray-300 px-4 py-1.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
          >
            트레이딩으로 가기
          </Link>
        </div>}
        </RemoteState>
        {resource.data && <div className="mt-3 text-xs leading-relaxed text-gray-400"><p>조회 완료: {new Date(resource.data.fetchedAt).toLocaleString('ko-KR')} · 종목별 조회 시세와 평균단가 기준 참고 평가액입니다. 시세 누락 시 합계를 표시하지 않습니다.</p><button onClick={resource.reload} className="mt-2 underline">새로고침</button></div>}
      </section>
    </div>
  );
}

function StatCard({ label, value, pending }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-center text-sm font-medium text-gray-500">{label}</div>
      {value != null ? (
        <div className="tabular mt-2 text-xl font-extrabold text-gray-900">{value}</div>
      ) : (
        <div className="mt-2 text-sm text-gray-300">{pending}</div>
      )}
    </div>
  );
}

function PendingRow({ label, value }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="flex items-center text-sm text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-600">{value}</dd>
    </div>
  );
}
