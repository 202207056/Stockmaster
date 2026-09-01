import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { Heart, MessageSquare, Newspaper, Star } from 'lucide-react';
import { comma, rateWithMark, signTextClass } from '../utils/format';
import { FAVORITES_EVENT, getFavorites } from '../utils/favorites';
import EmptyState from '../components/common/EmptyState';
import MockBadge from '../components/common/MockBadge';
import HelpIcon from '../components/learn/HelpIcon';
import MarketStrip from '../components/dashboard/MarketStrip';
import { MOCK_NEWS, MOCK_POSTS, MOCK_RANKINGS } from '../constants/mockData';

/**
 * 홈 (대시보드)
 *
 * 구성 원칙 — 홈은 "시장"을 보여 주고, "내 돈"은 내 자산 화면이 보여 줍니다.
 *  예수금·주문가능금액·평가손익·내 랭킹은 개인 정보이므로 /assets 에 있습니다.
 *  홈에 남은 것은 로그인 여부와 무관하게 누구나 볼 수 있는 시장 정보뿐입니다.
 *
 * 🔴 아래 지수·순위·뉴스·게시글은 전부 **목업**입니다. (constants/mockData.js)
 *    연동 전 레이아웃을 확인하기 위한 자리이며, 각 영역에 <MockBadge /> 를 붙여
 *    실제 데이터로 오해되지 않도록 했습니다.
 *
 *    TODO(F-지수)  지수 카드   → GET /api/market/indices (국내 + 해외)
 *    TODO(F-랭킹)  랭킹 3열    → GET /api/ranking/* (KIS 순위분석 TR 필요)
 *    TODO(F-16)   뉴스        → GET /api/news/market
 *    TODO(F-17)   커뮤니티     → GET /api/community/posts?page=1&size=4
 */
export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
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
      {isAuthenticated && (
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">
            {user?.user_name ? `${user.user_name}님, 안녕하세요` : '안녕하세요'}
          </h1>
          {!user?.investment_style && (
            <p className="mt-1 text-sm text-gray-500">
              아직 투자성향을 알려 주지 않으셨어요.{' '}
              <Link to="/survey" className="font-bold text-brand-600 hover:underline">
                1분 설문하기 →
              </Link>
            </p>
          )}
        </div>
      )}

      {/* ── 주요 시세 (자동 스크롤) ─────────────────────────────── */}
      <MarketStrip />

      {/* ── 실시간 랭킹 3열 ─────────────────────────────────────── */}
      <section>
        <SectionTitle mock>실시간 랭킹</SectionTitle>
        <div className="grid gap-8 lg:grid-cols-3">
          {MOCK_RANKINGS.map((col) => (
            <div key={col.key}>
              <div className="mb-2">
                <h3 className="text-sm font-bold text-gray-700">{col.title}</h3>
                <p className="text-xs text-gray-400">{col.hint}</p>
              </div>
              <ol className="border-t border-gray-400 pt-1">
                {col.items.map((item) => (
                  <li
                    key={item.rank}
                    className="flex items-center justify-between gap-2 border-b border-gray-100 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="tabular w-3 shrink-0 text-sm font-bold text-gray-400">
                        {item.rank}
                      </span>
                      {/* 기업 로고 자리 — 로고 데이터가 없어 빈 원으로 자리만 잡아 둡니다.
                          TODO(F-랭킹): 종목 로고 이미지가 생기면 이 원을 <img> 로 교체 */}
                      <span
                        className="h-6 w-6 shrink-0 rounded-full bg-gray-200"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-gray-800">{item.name}</p>
                        <p className="tabular text-xs text-gray-400">{item.sub}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tabular text-sm font-bold text-gray-800">
                        {comma(item.price)}
                      </p>
                      <p className={`tabular text-xs ${signTextClass(item.rate)}`}>
                        {rateWithMark(item.rate)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* ── 뉴스 + 오른쪽 사이드 ────────────────────────────────── */}
      <div className="grid gap-10 lg:grid-cols-3">
        {/* 뉴스 */}
        <section className="lg:col-span-2">
          <SectionTitle mock>오늘의 뉴스</SectionTitle>
          <ul className="flex flex-col gap-5 rounded-xl border border-gray-100 bg-gray-50 p-6">
            {MOCK_NEWS.map((n) => (
              <li key={n.id} className="flex gap-5">
                {/* 기사 썸네일이 들어갈 자리 */}
                <div
                  className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white"
                  aria-hidden="true"
                >
                  <Newspaper size={24} strokeWidth={1.5} className="text-gray-300" />
                </div>
                <div className="flex min-w-0 flex-col justify-center gap-1.5">
                  <h3 className="text-sm font-bold text-gray-900">{n.title}</h3>
                  <p className="line-clamp-2 text-sm leading-relaxed text-gray-500">{n.summary}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {n.source} · {n.time}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 오른쪽 — 관심종목 + 커뮤니티 */}
        <div className="flex flex-col gap-10">
          <section>
            <SectionTitle to="/favorites">관심종목</SectionTitle>
            {favorites.length === 0 ? (
              <EmptyState
                Icon={Star}
                title="관심종목이 아직 없어요"
                description="마음에 드는 종목을 담아 두면 여기서 바로 확인할 수 있어요."
                className="py-8"
              />
            ) : (
              <ul className="divide-y divide-gray-100 border-t border-gray-300">
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
          </section>

          <section>
            <SectionTitle mock to="/community">
              커뮤니티
            </SectionTitle>
            <ul className="divide-y divide-gray-100 border-t border-gray-300">
              {MOCK_POSTS.map((p) => (
                <li key={p.id} className="py-3">
                  <p className="truncate text-sm font-medium text-gray-800">{p.title}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                    <span>{p.author}</span>
                    <span aria-hidden="true">·</span>
                    <span>{p.time}</span>
                    {p.symbol && (
                      <span className="tabular rounded bg-gray-100 px-1.5 py-0.5 font-bold text-gray-500">
                        {p.symbol}
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-2">
                      <span className="flex items-center gap-0.5">
                        <Heart size={12} strokeWidth={1.75} aria-hidden="true" />
                        {p.likes}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageSquare size={12} strokeWidth={1.75} aria-hidden="true" />
                        {p.comments}
                      </span>
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* 초보자 안내 — 홈에서 학습 동선으로 연결 */}
      <section className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-brand-50 px-6 py-5">
        <div>
          <p className="flex items-center text-sm font-extrabold text-brand-700">
            처음이라 용어가 어렵나요?
            <HelpIcon termId="per" label="PER 설명 미리보기" />
          </p>
          <p className="mt-1 text-sm text-gray-600">
            화면 곳곳의 물음표를 누르면 그 자리에서 뜻을 알려 드려요. 용어 66개를 모아 두었어요.
          </p>
        </div>
        <Link
          to="/learn"
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          용어사전 보기
        </Link>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SectionTitle({ children, to, mock, hint }) {
  return (
    <div className="mb-3">
      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
        {children}
        {to && (
          <Link to={to} className="text-sm font-normal text-gray-400 hover:text-gray-700">
            &gt;
          </Link>
        )}
        {mock && <MockBadge className="ml-1" />}
      </h2>
      {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
