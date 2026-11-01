import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchThemeBrief } from '../../api/data';
import { getSessionId } from '../../api/client';
import { safeExternalUrl } from '../../api/normalize';
import useAuth from '../../hooks/useAuth';
import { useSitePractice } from '../../contexts/site-practice';
import { comma, rate, signTextClass } from '../../utils/format';
import StockLogo from '../common/StockLogo';
import { LearningCard } from '../learn/LearningUI';

const kstTime = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const kstDay = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short',
});

// 주말·휴일에는 지난 거래일 시세이므로 날짜를 함께 보여 준다.
function asOfLabel(value) {
  const at = new Date(value);
  if (kstDay.format(at) === kstDay.format(new Date())) return kstTime.format(at);
  const part = Object.fromEntries(kstDay.formatToParts(at).map(({ type, value }) => [type, value]));
  return `${part.month}.${part.day}(${part.weekday}) ${kstTime.format(at)}`;
}

export default function ThemeBriefCard() {
  const { isAuthenticated, user } = useAuth();
  const practice = useSitePractice();
  if (!isAuthenticated || practice) return null;
  return <ThemeRequest key={`${getSessionId()}:${user?.user_id}`} />;
}

function ThemeRequest() {
  const [state, setState] = useState({ loading: true, data: null });
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      // 개발 모드의 effect 재실행에서도 취소된 요청은 전송하지 않는다.
      await Promise.resolve();
      if (controller.signal.aborted) return;
      try {
        const data = await fetchThemeBrief(controller.signal);
        if (!controller.signal.aborted) setState({ loading: false, data });
      } catch {
        if (!controller.signal.aborted) setState({ loading: false, data: null });
      }
    }
    load();
    return () => controller.abort();
  }, []);

  if (state.loading) return <LearningCard title="오늘의 테마">
    <div role="status" aria-label="테마 브리핑 불러오는 중" className="grid animate-pulse gap-4 sm:grid-cols-2">
      {[0, 1].map(key => <div key={key} className="h-32 rounded-lg bg-gray-100" />)}
    </div>
  </LearningCard>;
  if (!state.data || (!state.data.rising.length && !state.data.falling.length)) return null;
  return <ThemeContent data={state.data} />;
}

function ThemeContent({ data }) {
  const first = [...data.rising, ...data.falling].find(theme => theme.reason)?.id;
  return <LearningCard title="오늘의 테마" aside={<span className="text-xs text-gray-500">
    {data.source} · {asOfLabel(data.as_of)} 기준
  </span>}>
    <div className="grid min-w-0 gap-5 sm:grid-cols-2">
      {['rising', 'falling'].map(direction => <section key={direction} className="min-w-0">
        <h3 className={`mb-2 text-sm font-bold ${direction === 'rising' ? 'text-up-600' : 'text-down-600'}`}>
          {direction === 'rising' ? '▲ 많이 오른 테마' : '▼ 많이 내린 테마'}
        </h3>
        {data[direction].length ? <div className="space-y-2">
          {data[direction].map(theme => <ThemeItem key={theme.id} theme={theme} initiallyExpanded={theme.id === first} />)}
        </div> : <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
          {direction === 'rising' ? '오늘은 많이 오른 테마가 없어요' : '오늘은 많이 내린 테마가 없어요'}
        </p>}
      </section>)}
    </div>
    <p className="mt-4 border-t border-gray-100 pt-3 text-xs leading-relaxed text-gray-500">{data.disclaimer}</p>
  </LearningCard>;
}

function ThemeItem({ theme, initiallyExpanded }) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const panelId = useId();
  return <article className="min-w-0 rounded-lg border border-gray-100 bg-gray-50">
    <h4><button type="button" aria-expanded={expanded} aria-controls={panelId}
      onClick={() => setExpanded(value => !value)}
      className="w-full rounded-lg p-3 text-left focus-visible:outline-2 focus-visible:outline-brand-600">
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0 break-words text-sm font-bold text-gray-800">{theme.name}</span>
        <span className={`tabular shrink-0 text-sm font-bold ${signTextClass(theme.change_rate)}`}>{rate(theme.change_rate)}</span>
      </span>
      <span className="mt-1 flex items-center justify-between gap-2 text-xs font-normal text-gray-500">
        <span>상승 {theme.rise_count} · 하락 {theme.fall_count} / {theme.total_count}종목</span>
        <span aria-hidden="true">{expanded ? '⌃' : '⌄'}</span>
      </span>
    </button></h4>
    {theme.reason && <p className="flex gap-2 px-3 pb-3 text-xs leading-relaxed text-gray-600">
      <span className="shrink-0 font-bold text-brand-600">AI</span><span className="min-w-0 break-words">{theme.reason}</span>
    </p>}
    {expanded && <div id={panelId} className="space-y-3 border-t border-gray-100 p-3">
      {theme.leaders.length > 0 && <ul className="space-y-3" aria-label="대표 종목">
        {theme.leaders.map(stock => <li key={stock.code}>
          <Link to={`/trading?code=${encodeURIComponent(stock.code)}`} className="flex min-w-0 items-center gap-2 text-sm">
            <StockLogo code={stock.code} name={stock.name} className="h-7 w-7" />
            <span className="min-w-0 flex-1 break-words font-medium text-gray-800">{stock.name}</span>
            <span className="tabular shrink-0 text-right text-xs">
              <span className="block text-gray-700">{comma(stock.price)}원</span>
              <span className={signTextClass(stock.change_rate)}>{rate(stock.change_rate)}</span>
            </span>
          </Link>
        </li>)}
      </ul>}
      {theme.evidence.length > 0 && <section>
        <h5 className="mb-1 text-xs font-bold text-gray-500">근거 기사</h5>
        <ul className="space-y-2 text-xs leading-relaxed text-gray-600">
          {theme.evidence.map((article, index) => <li key={index}>
            {safeExternalUrl(article.url) ? <a href={safeExternalUrl(article.url)} target="_blank" rel="noopener noreferrer" className="break-words hover:underline">{article.title}</a>
              : <span className="break-words">{article.title}</span>}
            {article.source && <span className="ml-1 text-gray-400">· {article.source}</span>}
          </li>)}
        </ul>
      </section>}
    </div>}
  </article>;
}
