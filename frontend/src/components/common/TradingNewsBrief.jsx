import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import Modal from './Modal';
import BriefReport from '../ai/BriefReport';
import { ThemeContent } from '../ai/ThemeBriefCard';
import { fetchPortfolio, fetchStockBrief, fetchThemeBrief } from '../../api/data';
import { safeExternalUrl } from '../../api/normalize';
import { readResource, resourceKey, writeResource } from '../../api/resourceCache';
import { useAuth } from '../../hooks/useAuth';
import { comma, rate, signTextClass } from '../../utils/format';
import { kstStamp } from '../../utils/kstStamp';
import './TradingNewsBrief.css';

const sections = [
  ['recent_issues', '최근 확인되는 이슈'],
  ['positive_factors', '긍정적으로 볼 수 있는 요인'],
  ['risk_factors', '주의해서 볼 요인'],
];

// Show the browser copy at once, then replace it with the server result.
// The server shares one briefing per stock for three hours, so this rarely generates.
function useStockBrief(code, enabled) {
  const key = resourceKey('stock-brief', null, code);
  const [state, setState] = useState(() => ({ data: readResource(key)?.data ?? null, loading: enabled, error: false }));
  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    fetchStockBrief(code, controller.signal).then(data => {
      writeResource(key, data, true);
      setState({ data, loading: false, error: false });
    }).catch(() => {
      if (!controller.signal.aborted) setState(value => ({ ...value, loading: false, error: true }));
    });
    return () => controller.abort();
  }, [code, enabled, key]);
  return state;
}

function useHeldQuantities(accountId, enabled) {
  const [held, setHeld] = useState({});
  useEffect(() => {
    if (!enabled || !accountId) return undefined;
    const controller = new AbortController();
    fetchPortfolio(accountId, controller.signal).then(data => {
      setHeld(Object.fromEntries(data.holdings.map(item => [item.symbol_code, Number(item.hold_quantity) || 0])));
    }).catch(() => { /* Holding badges are optional. */ });
    return () => controller.abort();
  }, [accountId, enabled]);
  return held;
}

function useThemes(enabled) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    fetchThemeBrief(controller.signal).then(setData).catch(() => { /* The theme column hides itself. */ });
    return () => controller.abort();
  }, [enabled]);
  return data;
}

// ▲ up, ▼ down, — flat or unknown, matching the theme tabs.
function Direction({ changeRate }) {
  const value = Number(changeRate);
  const mark = !Number.isFinite(value) || value === 0 ? '—' : value < 0 ? '▼' : '▲';
  return <span className={signTextClass(value)} aria-hidden="true">{mark}</span>;
}

const question = changeRate => changeRate > 0 ? '왜 올랐을까?' : changeRate < 0 ? '왜 내렸을까?' : '최근 뉴스 정리';

export default function TradingNewsBrief({ code }) {
  const { accountId, isAuthenticated } = useAuth();
  const main = useStockBrief(code, isAuthenticated);
  const held = useHeldQuantities(accountId, isAuthenticated);
  const [open, setOpen] = useState(false);
  const [selectedCode, setSelectedCode] = useState(code);
  // Name and rate of a stock picked from a related card or theme leader.
  const [pickedStock, setPickedStock] = useState(null);
  // null shows the selected stock; a theme id shows that theme in the main panel.
  const [themeId, setThemeId] = useState(null);
  const themes = useThemes(open);
  const [picked, setPicked] = useState(false);
  if (!isAuthenticated || (!main.data && !main.loading) || (main.data && !main.data.ai_available)) return null;

  const brief = main.data;
  const stocks = brief ? [
    { code: brief.symbol_code, name: brief.name, change_rate: brief.change_rate, title: brief.title },
    ...brief.related,
  ] : [];
  const themeList = themes ? [...themes.rising, ...themes.falling] : [];
  const theme = themeList.find(item => item.id === themeId);
  const selectStock = (next, name, changeRate) => {
    setPicked(true);
    setThemeId(null);
    setSelectedCode(next);
    setPickedStock({ name, changeRate });
  };
  const selectTheme = (id) => {
    setPicked(true);
    setThemeId(id);
  };
  const tabStock = selectedCode === code ? { name: brief?.name, changeRate: brief?.change_rate } : { name: pickedStock?.name || selectedCode, changeRate: pickedStock?.changeRate };
  return <>
    <button type="button" className="trading-news-banner" disabled={!brief}
      onClick={() => { setPicked(false); setSelectedCode(code); setThemeId(null); setOpen(true); }} aria-haspopup="dialog" aria-expanded={open}>
      <span className="min-w-0 flex-1">
        <span className="trading-news-banner__label"><span className="trading-news-banner__icon"><Sparkles size={14} aria-hidden="true" /></span>{brief ? question(brief.change_rate) : 'AI 뉴스'}</span>
        <span className="trading-news-banner__headline">{brief ? brief.title || '최근 확인되는 뉴스를 정리했어요' : 'AI가 뉴스를 정리하고 있어요…'}</span>
      </span>
      <ChevronRight size={18} className="shrink-0" aria-hidden="true" />
    </button>
    {brief && <Modal open={open} onClose={() => setOpen(false)} title="AI 뉴스" size="xl" draggable dimBackdrop={false}>
      {themeList.length > 0 && <div className="trading-news-tabs" role="group" aria-label="뉴스 보기 선택">
        <button type="button" aria-pressed={!theme} onClick={() => selectStock(selectedCode, tabStock.name, tabStock.changeRate)}>
          <Direction changeRate={tabStock.changeRate} /> {tabStock.name}
        </button>
        {themeList.map(item => <button type="button" key={item.id} aria-pressed={item.id === themeId} onClick={() => selectTheme(item.id)}>
          <Direction changeRate={item.change_rate} /> {item.name}
        </button>)}
      </div>}
      <div className="trading-news-grid">
        {theme ? <ThemeDetail key={theme.id} theme={theme} data={themes} autoFocus={picked} held={held} onStock={selectStock} />
          : <BriefDetail key={selectedCode} autoFocus={picked} code={selectedCode} initial={selectedCode === code ? brief : null} quantity={held[selectedCode]} />}
        <section className="trading-news-related" aria-label="관련 종목">
          <h3 className="trading-news-eyebrow">함께 살펴볼 관련 종목</h3>
          {stocks.filter(stock => theme || stock.code !== selectedCode).map(stock => <button type="button" key={stock.code} className="trading-news-related-card text-left" onClick={() => selectStock(stock.code, stock.name, stock.change_rate)} aria-label={`${stock.name} 뉴스 상세 보기`}>
            <span className="flex flex-wrap items-baseline justify-between gap-1"><span className="flex flex-wrap items-baseline gap-1.5"><span className="font-bold text-gray-900">{stock.name}</span>{held[stock.code] > 0 && <span className="text-xs text-gray-500">보유</span>}</span><span className={`text-xs font-bold ${signTextClass(stock.change_rate)}`}>{rate(stock.change_rate)}</span></span>
            <span className={`mt-3 block text-xs leading-relaxed ${stock.title ? 'text-gray-600' : 'text-gray-400'}`}>{stock.title || '관련 기사 없음 · 등락률만 표시'}</span>
          </button>)}
        </section>
        {themes && <aside className="trading-news-themes" aria-label="관련 테마 AI 분석"><ThemeContent data={themes} showMetadata={false} onSelect={selectTheme} /></aside>}
      </div>
    </Modal>}
  </>;
}

// Today's top themes, not the themes this stock belongs to.
function ThemeDetail({ autoFocus, data, held, onStock, theme }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!autoFocus) return;
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView?.({ block: 'nearest' });
  }, [autoFocus]);
  return <article ref={ref} tabIndex={-1} className="trading-news-main" aria-label={`${theme.name} 테마 상세`}>
    <header>
      <p className="trading-news-eyebrow">오늘의 테마</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-2">
        <h3 className="text-xl font-extrabold text-gray-900">{theme.name}</h3>
        <span className={`font-bold ${signTextClass(theme.change_rate)}`}>{rate(theme.change_rate)}</span>
        <span className="text-xs text-gray-500">상승 {theme.rise_count} · 하락 {theme.fall_count} / {theme.total_count}종목</span>
      </div>
      {theme.reason && <div className="trading-news-summary"><p>{theme.reason}</p></div>}
    </header>
    <div className="trading-news-sections">
      {theme.leaders.length > 0 && <section>
        <h4>대표 종목</h4>
        <div className="trading-news-leaders">{theme.leaders.map(stock => <button type="button" key={stock.code}
          onClick={() => onStock(stock.code, stock.name, stock.change_rate)} aria-label={`${stock.name} 뉴스 상세 보기`}>
          <span className="font-bold text-gray-900">{stock.name}</span>
          {held[stock.code] > 0 && <span className="text-xs text-gray-500">보유</span>}
          <span className="ml-auto text-xs text-gray-700">{comma(stock.price)}원</span>
          <span className={`text-xs font-bold ${signTextClass(stock.change_rate)}`}>{rate(stock.change_rate)}</span>
        </button>)}</div>
      </section>}
      {theme.evidence.length > 0 && <section className="trading-news-evidence">
        <h4>근거 기사</h4>
        <ul>{theme.evidence.slice(0, 3).map(article => {
          const url = safeExternalUrl(article.url);
          return <li key={article.title}>{url ? <a href={url} target="_blank" rel="noreferrer noopener">{article.title}</a> : article.title}
            {article.source && <span> · {article.source}</span>}</li>;
        })}</ul>
      </section>}
      <p className="trading-news-footnote">{data.source} · {kstStamp(data.as_of)} 기준 · {data.disclaimer}</p>
    </div>
  </article>;
}

function BriefDetail({ autoFocus, code, initial, quantity }) {
  const ref = useRef(null);
  const fetched = useStockBrief(code, !initial);
  // The panel remounts per stock, so focus moves only after the new one exists.
  useEffect(() => {
    if (!autoFocus) return;
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView?.({ block: 'nearest' });
  }, [autoFocus]);
  const brief = initial || fetched.data;
  const filled = brief ? sections.filter(([field]) => brief[field].length > 0) : [];
  return <article ref={ref} tabIndex={-1} className="trading-news-main" aria-label={`${brief?.name || code} 뉴스 상세`} aria-busy={!brief && fetched.loading}>
    {!brief ? <p className="trading-news-pending">{fetched.loading ? 'AI가 뉴스를 정리하고 있어요…' : '브리핑을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'}</p> : <>
      <header>
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="text-xl font-extrabold text-gray-900">{brief.name}</h3>
          <span className={`font-bold ${signTextClass(brief.change_rate)}`}>{rate(brief.change_rate)}</span>
          {quantity > 0 && <span className="text-xs text-gray-500">{quantity}주 보유</span>}
        </div>
        {brief.title && <div className="trading-news-summary"><p>{brief.title}</p></div>}
      </header>
      <div className="trading-news-sections">
        {filled.length ? filled.map(([field, title]) => <section key={field}>
          <h4>{title}</h4>
          <ul>{brief[field].map(text => <li key={text}>{text}</li>)}</ul>
        </section>) : <p className="text-sm text-gray-500">최근 확인되는 관련 기사가 많지 않아요.</p>}
        {brief.evidence.length > 0 && <section className="trading-news-evidence">
          <h4>근거 기사</h4>
          <ul>{brief.evidence.slice(0, 3).map(article => {
            const url = safeExternalUrl(article.url);
            return <li key={article.title}>{url ? <a href={url} target="_blank" rel="noreferrer noopener">{article.title}</a> : article.title}
              {article.source && <span> · {article.source}</span>}</li>;
          })}</ul>
        </section>}
        <p className="trading-news-footnote">{brief.source} · {kstStamp(brief.generated_at)} 생성 · {brief.disclaimer}</p>
        <BriefReport key={brief.generated_at} kind="stock" code={brief.symbol_code} generatedAt={brief.generated_at} />
      </div>
    </>}
  </article>;
}
