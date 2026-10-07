import useTutorialSetting from '../hooks/useTutorialSetting';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import AssetsTour from '../components/learn/AssetsTour';
import HelpIconButton from '../components/learn/HelpIconButton';
import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { won, wonSigned, signTextClass } from '../utils/format';
import HelpIcon from '../components/learn/HelpIcon';
import LoginNotice from '../components/common/LoginNotice';
import useSiteResource from '../hooks/useSiteResource';
import { useSitePractice } from '../contexts/site-practice';
import { PracticeTarget } from '../components/learn/SitePractice';
import { fetchValuedPortfolio } from '../api/data';
import { numberOrNull, portfolioTotals, quotePrice } from '../api/normalize';
import AccountPicker from '../components/common/AccountPicker';
import RemoteState from '../components/common/RemoteState';
import { LearningCard } from '../components/learn/LearningUI';

/** 기존 총자산·개인 지표·내 투자·보유종목 배치에 실제 조회 결과를 표시합니다. */
export default function Assets() {
  const practice = useSitePractice();
  const surface = useRef(null);
  const [tutorialsEnabled] = useTutorialSetting();
  const [params] = useSearchParams();
  const [tourOverride,setTourOpen] = useState(null);
  const tourOpen = tourOverride ?? (tutorialsEnabled || params.get('practice') === 'account');
  const { accounts = [], account, accountId, isAuthenticated, hasCachedSession } = useAuth();
  const resource = useSiteResource('portfolio', useCallback((signal) => fetchValuedPortfolio(accountId, signal), [accountId]), isAuthenticated && !!accountId, { keepPreviousData: true, cacheKey: JSON.stringify(['portfolio', accountId]), cachePreview: true });
  const totals = portfolioTotals(resource.data);

  const pending = !isAuthenticated ? '로그인하면 표시돼요' : resource.loading ? '불러오는 중이에요' : '조회 불가';

  return (
    <div ref={surface} className="mx-auto flex w-full max-w-4xl flex-col gap-12">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="flex items-center text-xl font-extrabold text-gray-900">내 자산{!practice && isAuthenticated && accounts.length > 0 && <HelpIconButton open={tourOpen} aria-label="계좌 선택과 자산 조회 안내" onClick={()=>setTourOpen(!tourOpen)}/>}</h1>
        {account && <p className="mt-1 text-sm text-gray-500">{account.account_name}</p>}
        {(isAuthenticated || hasCachedSession) && <div className="mt-3" data-assets-tour="account"><AccountPicker /></div>}
      </div>

      {!isAuthenticated && !hasCachedSession && <LoginNotice message="로그인하면 내 계좌의 실제 금액이 표시돼요" />}
      {resource.data?.holdings.some((holding) => holding.quoteError) && <div role="status" className="text-sm text-gray-600"><p>일부 종목의 시세 조회가 실패해 총자산·평가금액을 계산할 수 없어요.</p><ul>{resource.data.holdings.filter((holding) => holding.quoteError).map((holding) => <li key={holding.portfolio_id ?? holding.symbol_code}>{holding.security_name || holding.symbol_code}: {holding.quoteError}</li>)}</ul><button disabled={resource.loading} onClick={resource.reload} className="mt-2 underline">시세 다시 조회</button></div>}

      {/* ── 총자산 ──────────────────────────────────────────────── */}
      <PracticeTarget id="asset-total"><section data-assets-tour="total">
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
        {(totals?.debt > 0 || totals?.pendingProceeds > 0) && <p className="mt-3 text-sm text-amber-800">미수 부족금 {won(totals.debt)} 차감 · 결제 대기 매도대금 {won(totals.pendingProceeds)} 포함. <Link to="/trading" className="underline">트레이딩에서 결제 내역 확인</Link></p>}
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
      </section></PracticeTarget>

      {/* ── 내 투자 ─────────────────────────────────────────────── */}
      <PracticeTarget id="asset-investment"><section data-assets-tour="investment">
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
          매입금액과 평가손익은 평균 매입단가와 보유수량 기준이며 수수료·세금을 제외합니다.
          현금 주문은 체결 즉시 현금을 반영합니다. 미수 부족금이 있는 계좌의 매도대금은 T+2 거래일에 결제하며 총자산에서 부족금을 차감합니다.
        </p>
      </section></PracticeTarget>


      {/* ── 보유종목 ────────────────────────────────────────────── */}
      <PracticeTarget id="asset-holdings"><section data-assets-tour="holdings" className="pb-8">
        <h2 className="flex items-center text-lg font-bold text-gray-700">
          보유종목
          <HelpIcon termId="hold_quantity" />
        </h2>
        {/* TODO(F-14): GET /api/trading/portfolio?account_id= + 종목별 /stocks/{code}/price */}
        <RemoteState resource={resource} authenticated={isAuthenticated}>
        {resource.data?.holdings.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[600px] text-right text-sm"><thead className="bg-gray-50"><tr>{['종목', '보유수량', '평균단가', '현재가', '평가손익'].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{resource.data.holdings.map((holding) => {
          const price = quotePrice(holding.quote); const average = numberOrNull(holding.avg_price); const quantity = numberOrNull(holding.hold_quantity); const pnl = price !== null && average !== null && quantity !== null ? (price - average) * quantity : null;
          return <tr key={holding.portfolio_id ?? holding.symbol_code} className="border-b border-gray-100"><th className="p-3"><PracticeTarget id="trading-link"><Link to={practice ? practice.href('/trading', holding.symbol_code) : `/trading?code=${encodeURIComponent(holding.symbol_code)}`} onClick={() => practice?.event('trading')} className="text-brand-700">{holding.security_name || holding.symbol_code}</Link></PracticeTarget></th><td className="p-3">{quantity ?? '—'}</td><td className="p-3">{average === null ? '—' : won(average)}</td><td className="p-3">{price === null ? '시세 이용 불가' : won(price)}</td><td className={`p-3 ${signTextClass(pnl)}`}>{pnl === null ? '—' : wonSigned(pnl)}</td></tr>;
        })}</tbody></table></div> : <div className="mt-4 rounded-lg border border-dashed border-gray-200 px-4 py-12 text-center">
          <p className="text-sm text-gray-400">{accountId ? '보유한 종목이 없어요.' : '계좌를 선택해 주세요.'}</p>
          <PracticeTarget id="trading-link"><Link
            to={practice ? practice.href('/trading', '990001') : '/trading'} onClick={() => practice?.event('trading')}
            className="mt-3 inline-block rounded-md border border-gray-300 px-4 py-1.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
          >
            트레이딩으로 가기
          </Link></PracticeTarget>
        </div>}
        </RemoteState>
        {resource.data && <div className="mt-3 text-xs leading-relaxed text-gray-400"><p>조회 완료: {new Date(resource.data.fetchedAt).toLocaleString('ko-KR')} · 종목별 조회 시세와 평균단가 기준 참고 평가액입니다. 시세 누락 시 합계를 표시하지 않습니다.</p><button onClick={resource.reload} className="mt-2 underline" aria-label="새로고침" title="새로고침"><RefreshCw size={16} aria-hidden="true" /></button></div>}
      </section></PracticeTarget>
      {!practice && isAuthenticated && accounts.length > 0 && tourOpen && <AssetsTour surfaceRef={surface} accountCount={accounts.length} onClose={()=>setTourOpen(false)}/>}
      <LearningCard title="손실/이익 발생 시 관련 개념 학습 (현재 미구현)"><p className="text-sm text-gray-500">보유 종목의 손익과 연결된 개념을 살펴보는 기능을 준비하고 있습니다.</p></LearningCard>
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
