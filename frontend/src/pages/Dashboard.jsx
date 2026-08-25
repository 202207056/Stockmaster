import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { num, won } from '../utils/format';
import { FAVORITES_EVENT, getFavorites } from '../utils/favorites';
import HelpIcon from '../components/learn/HelpIcon';
import EmptyState from '../components/common/EmptyState';
import LoginNotice from '../components/common/LoginNotice';

/**
 * 대시보드 (Doc/13 §6 — 설계 변경 적용)
 *
 * 왜 시안대로 만들지 않았나
 * 원래 시안은 코스피/코스닥 지수 카드 4개와 "거래대금·급상승·급하락" 랭킹 3열을
 * 요구하는데, 이 셋을 지원하는 API 가 아예 없습니다. 기존 코드는 그 자리를
 * 하드코딩된 가짜 숫자로 채워 두었습니다.
 *
 *   - 코스피 8,096.93 / +612.52(8.1%)   ← 실제 지수가 아님
 *   - 랭킹 3열 전체가 같은 목업 5줄의 반복
 *   - 뉴스 2건, 커뮤니티 글 3건도 하드코딩
 *
 * 시연 중에 이 숫자들이 실제 데이터로 오해될 위험이 커서 전부 걷어냈습니다.
 * 대신 Doc/13 §6 이 권장한 구성(있는 데이터로 채울 수 있는 구성)으로 바꿨습니다.
 *
 *   상단 카드 : 예수금 · 주문가능금액 (로그인 시 동작) / 평가손익 · 내 랭킹 (연동 대기)
 *   3열       : 보유종목(F-14) · 관심종목(로그인 없이도 동작) · 수익률 랭킹(F-18)
 *   뉴스(F-16) · 커뮤니티(F-17)
 *
 * 로그인하지 않아도 이 화면은 열립니다. 개인 데이터 자리에는 무한 스켈레톤 대신
 * "로그인하면 표시돼요" 안내가 나옵니다.
 */
export default function Dashboard() {
  const { user, account, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState(getFavorites);

  useEffect(() => {
    const sync = () => setFavorites(getFavorites());
    window.addEventListener(FAVORITES_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(FAVORITES_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return (
    <div className="flex flex-col gap-12">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900">
          {user?.user_name ? `${user.user_name}님, 안녕하세요` : '안녕하세요'}
        </h1>
        {isAuthenticated ? (
          !user?.investment_style && (
            <p className="mt-1 text-sm text-gray-500">
              아직 투자성향을 알려 주지 않으셨어요.{' '}
              <Link to="/survey" className="font-bold text-brand-600 hover:underline">
                1분 설문하기 →
              </Link>
            </p>
          )
        ) : (
          <p className="mt-1 text-sm text-gray-500">
            지금은 둘러보기 모드예요.{' '}
            <Link to="/login" className="font-bold text-brand-600 hover:underline">
              로그인
            </Link>
            하면 내 자산과 주문 내역이 표시됩니다.
          </p>
        )}
      </div>

      {/* ── 상단 카드 4개 ───────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* 계좌 금액은 AuthContext 가 로그인 직후 받아 둔 값입니다. 추가 호출 없음.
            ⚠️ /trading/accounts 의 금액은 문자열로 옵니다 — num() 필수 (§4-1) */}
        <StatCard
          label={
            <>
              예수금
              <HelpIcon termId="deposit" />
            </>
          }
          value={account ? won(num(account.balance)) : null}
          pending={isAuthenticated ? '불러오는 중이에요' : '로그인하면 표시돼요'}
        />
        <StatCard
          label={
            <>
              주문가능금액
              <HelpIcon termId="orderable_cash" />
            </>
          }
          value={account ? won(num(account.withdrawable_cash)) : null}
          pending={isAuthenticated ? '불러오는 중이에요' : '로그인하면 표시돼요'}
        />
        {/* 평가손익은 보유종목의 현재가를 조회해 직접 계산해야 합니다. (§5-1, F-14) */}
        <StatCard
          label={
            <>
              평가손익
              <HelpIcon termId="eval_pnl" />
            </>
          }
          pending="보유종목 시세 연동 후 표시"
        />
        {/* 랭킹은 백엔드 계산식 버그로 "투자를 안 한 사람"이 1위로 올라옵니다.
            고쳐지기 전까지 숫자를 띄우면 오히려 신뢰를 잃으므로 비워 둡니다. (§6) */}
        <StatCard label="내 랭킹" pending="랭킹 계산식 수정 대기" />
      </section>

      {/* ── 3열 ─────────────────────────────────────────────────── */}
      <section className="grid gap-8 lg:grid-cols-3">
        <Panel title="내 보유종목" moreTo="/assets">
          {isAuthenticated ? (
            /* TODO(F-14): GET /api/trading/portfolio + 종목별 현재가 */
            <PendingBox text="보유종목 연동 준비 중이에요" />
          ) : (
            <LoginNotice message="로그인하면 보유종목이 표시돼요" className="border-0 py-8" />
          )}
        </Panel>

        <Panel title="관심종목" moreTo="/favorites">
          {favorites.length === 0 ? (
            <EmptyState
              icon="⭐"
              title="관심종목이 아직 없어요"
              description="마음에 드는 종목을 담아 두면 여기서 바로 확인할 수 있어요."
              className="py-8"
            />
          ) : (
            <ul className="divide-y divide-gray-100">
              {favorites.slice(0, 5).map((code) => (
                <li key={code} className="flex items-center justify-between py-3">
                  <span className="tabular rounded bg-gray-100 px-2 py-1 text-xs font-bold text-gray-600">
                    {code}
                  </span>
                  {/* TODO(F-12): 종목명·현재가 표시 */}
                  <span className="text-xs text-gray-400">시세 연동 예정</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="수익률 랭킹">
          {/* TODO(F-18): GET /api/ranking — 단, 계산식 수정 후에 노출 */}
          <PendingBox text="랭킹 계산식이 수정되면 열립니다" />
        </Panel>
      </section>

      {/* ── 뉴스 ────────────────────────────────────────────────── */}
      <section>
        <SectionTitle>실시간 뉴스</SectionTitle>
        {/* TODO(F-16): GET /api/news/market — 크롤링 실패 시 빈 배열이 오므로
            오류가 아니라 EmptyState 로 처리해야 합니다. (§3-6) */}
        <PendingBox text="뉴스 연동 준비 중이에요" />
      </section>

      {/* ── 커뮤니티 ────────────────────────────────────────────── */}
      <section className="pb-8">
        <SectionTitle to="/community">커뮤니티</SectionTitle>
        {/* TODO(F-17): GET /api/community/posts?page=1&size=5 */}
        <PendingBox text="커뮤니티 연동 준비 중이에요" />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StatCard({ label, value, pending }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <div className="flex items-center text-sm font-medium text-gray-500">{label}</div>
      {value != null ? (
        <div className="tabular mt-2 text-2xl font-extrabold text-gray-900">{value}</div>
      ) : (
        <div className="mt-2 text-sm text-gray-300">{pending}</div>
      )}
    </div>
  );
}

function SectionTitle({ children, to }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-800">
      {children}
      {to && (
        <Link to={to} className="text-sm font-normal text-gray-400 hover:text-gray-700">
          &gt;
        </Link>
      )}
    </h2>
  );
}

function Panel({ title, moreTo, children }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">{title}</h3>
        {moreTo && (
          <Link to={moreTo} className="text-xs text-gray-400 hover:text-gray-700">
            더보기 &gt;
          </Link>
        )}
      </div>
      <div className="border-t border-gray-300 pt-1">{children}</div>
    </div>
  );
}

function PendingBox({ text }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-400">
      {text}
    </div>
  );
}
