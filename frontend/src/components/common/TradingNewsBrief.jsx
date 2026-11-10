import { useEffect, useRef, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import Modal from './Modal';
import HelpIconButton from '../learn/HelpIconButton';
import '../learn/AssetsTour.css';
import '../../pages/TradingTutorial.css';
import BriefReport from '../ai/BriefReport';
import { ThemeContent } from '../ai/ThemeBriefCard';
import { fetchStockBrief, fetchThemeBrief } from '../../api/data';
import { safeExternalUrl } from '../../api/normalize';
import { readResource, resourceKey, writeResource } from '../../api/resourceCache';
import { readStockBrief, subscribeStockBrief } from '../../api/stockBriefCache';
import { useAuth } from '../../hooks/useAuth';
import { comma, rate, signTextClass } from '../../utils/format';
import { kstStamp } from '../../utils/kstStamp';
import './TradingNewsBrief.css';
import { newsHeadline } from './NewsSummaryBody';
import PortfolioNewsBoard from '../ai/PortfolioNewsBoard';

// Show the browser copy at once, then replace it with the server result.
// The server shares one briefing per stock for three hours, so this rarely generates.
function useStockBrief(code, enabled) {
  const key = resourceKey('stock-brief', null, code);
  const [state, setState] = useState(() => ({ data: readResource(key)?.data ?? null, loading: enabled, error: false }));
  useEffect(() => subscribeStockBrief(update => {
    const data = update || readStockBrief(code);
    if (data?.symbol_code === code) setState({ data, loading: false, error: false });
  }), [code]);
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

// 관련 종목 카드 첫 줄에 펼친 종목과의 관계를 쓴다.
// 경쟁사·고객사처럼 누구 기준인지 필요한 관계는 '본 종목의 …'로, 제조사·업체는 그대로 쓴다.
function relationLabels(brief) {
  return Object.fromEntries((brief?.related || []).filter(stock => stock.code && stock.relation).map(stock => {
    const peer = /(제조사|업체)$/.test(stock.relation) && !/동종업체$/.test(stock.relation);
    return [stock.code, peer ? stock.relation : `${brief.name}의 ${stock.relation}`];
  }));
}

export default function TradingNewsBrief({ code, triggerLabel, initialBrief }) {
  const { isAuthenticated } = useAuth();
  const fetchedMain = useStockBrief(code, isAuthenticated && !initialBrief);
  const sharedInitial = initialBrief && (Date.parse(fetchedMain.data?.generated_at) >= Date.parse(initialBrief.generated_at) ? fetchedMain.data : initialBrief);
  const main = sharedInitial ? { data: sharedInitial, loading: false, error: false } : fetchedMain;
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState(-1);
  const [selectedCode, setSelectedCode] = useState(code);
  // Name and rate of a stock picked from a related card or theme leader.
  const [pickedStock, setPickedStock] = useState(null);
  // null shows the selected stock; a theme id shows that theme in the main panel.
  const [themeId, setThemeId] = useState(null);
  const themes = useThemes(open);
  const [picked, setPicked] = useState(false);
  const activeState = useStockBrief(selectedCode, open && !!selectedCode && selectedCode !== code);
  if (!isAuthenticated || (!main.data && !main.loading) || (main.data && !main.data.ai_available)) return null;

  const brief = main.data;
  const stocks = brief ? [
    { code: brief.symbol_code, name: brief.name, change_rate: brief.change_rate, title: brief.banner_title || brief.title },
    ...brief.related,
  ] : [];
  const themeList = themes ? [...themes.rising, ...themes.falling] : [];
  const theme = themeList.find(item => item.id === themeId);
  const activeBrief = selectedCode === code ? brief : activeState.data?.symbol_code === selectedCode ? activeState.data : null;
  const relatedStocks = (activeBrief?.related?.length ? activeBrief.related : stocks).filter(stock => stock.code !== selectedCode);
  const relatedCodes = new Set([selectedCode, ...relatedStocks.map(stock => stock.code)]);
  const relatedThemes = themeList.filter(item => item.leaders.some(stock => relatedCodes.has(stock.code))
    && item.leaders.some(stock => stock.code !== selectedCode));
  const boardStocks = [...new Map([
    ...stocks, ...relatedStocks,
    ...relatedThemes.flatMap(item => item.leaders),
    ...(pickedStock ? [{ code: pickedStock.code, name: pickedStock.name, change_rate: pickedStock.changeRate }] : []),
  ].map(stock => [stock.code, { ...stock, change: stock.change_rate }])).values()];
  const selectStock = (next, name, changeRate) => {
    const stock = boardStocks.find(item => item.code === next);
    setPicked(true);
    setThemeId(null);
    setSelectedCode(next);
    if (next) setPickedStock({ code: next, name: name || stock?.name || next, changeRate: changeRate ?? stock?.change });
  };
  const selectTheme = (id) => {
    setPicked(true);
    setThemeId(id);
  };
  const tabStock = !selectedCode || selectedCode === code ? { name: brief?.name, changeRate: brief?.change_rate } : { name: pickedStock?.name || selectedCode, changeRate: pickedStock?.changeRate };
  return <>
    <button type="button" className="trading-news-banner" data-site-tour="ai-news" disabled={!brief}
      onClick={() => { setPicked(false); setSelectedCode(code); setThemeId(null); setOpen(true); }} aria-haspopup="dialog" aria-expanded={open}>
      <span className="min-w-0 flex-1">{triggerLabel ? <span>{triggerLabel}</span> : <>
        <span className="trading-news-banner__label"><span className="trading-news-banner__icon"><Sparkles size={14} aria-hidden="true" /></span>{brief ? question(brief.change_rate) : 'AI 뉴스'}</span>
        <span className="trading-news-banner__headline">{brief ? brief.banner_summary || brief.banner_title || newsHeadline(brief) : '뉴스 요약을 불러오고 있어요…'}</span>
      </>} </span>
      <ChevronRight size={18} className="shrink-0" aria-hidden="true" />
    </button>
    {brief && <Modal open={open} onClose={() => setOpen(false)} title="AI 뉴스" size="xl" draggable resizable dimBackdrop={false}>
      <span style={{position:'absolute',top:20,right:62}}><HelpIconButton open={guide >= 0} aria-label="AI 뉴스 이용 안내" onClick={() => setGuide(guide < 0 ? 0 : -1)} /></span>
      {guide >= 0 && <section className="assets-tour-note tutorial-local-note" style={{position:'fixed',left:12,bottom:112,top:'auto',width:'min(300px, calc(100vw - 24px))'}} role="region" aria-label="AI 뉴스 이용 안내" aria-live="polite" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setGuide(-1);}}}>
        <button type="button" className="assets-tour-close" aria-label="AI 뉴스 안내 종료" onClick={()=>setGuide(-1)}>×</button>
        <strong className="block text-sm text-brand-700">{['AI 뉴스와 테마', '관련 종목으로 넓혀 보기', '테마별 흐름 비교'][guide]}</strong>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{[
          '종목의 최근 이슈와 긍정·주의 요인, 근거 기사를 함께 살펴보세요. 관련 종목과 테마를 누르면 다른 종목의 뉴스와 테마별 흐름으로 이어져요.',
          '종목 배너를 누르면 뉴스가 펼쳐지고 연결된 종목이 가까이 배치돼요. 종목명과 등락률, 한줄요약을 함께 확인할 수 있어요.',
          '관련 테마가 제공되면 테마를 눌러 상승·하락 흐름과 대표 종목을 비교해 보세요. 분석은 참고 자료이며 투자 판단은 직접 확인한 정보를 바탕으로 해 주세요.',
        ][guide]}</p>
        <div className="mt-3 flex gap-3">{guide > 0 && <button type="button" className="text-sm text-gray-600" onClick={() => setGuide(guide - 1)}>이전</button>}<button type="button" className="tutorial-action" onClick={() => setGuide(guide === 2 ? -1 : guide + 1)}>{guide === 2 ? '안내 마치기' : '다음'}</button><button type="button" className="text-sm text-gray-500" onClick={() => setGuide(-1)}>닫기</button></div>
      </section>}
      {themeList.length > 0 && <div className="trading-news-tabs" role="group" aria-label="뉴스 보기 선택">
        <button type="button" aria-pressed={!theme} onClick={() => selectStock(selectedCode || code, tabStock.name, tabStock.changeRate)}>
          <Direction changeRate={tabStock.changeRate} /> {tabStock.name}
        </button>
        {themeList.map(item => <button type="button" key={item.id} aria-pressed={item.id === themeId} onClick={() => selectTheme(item.id)}>
          <Direction changeRate={item.change_rate} /> {item.name}
        </button>)}
      </div>}
      {theme ? <ThemeDetail key={theme.id} theme={theme} data={themes} autoFocus={picked} onStock={selectStock} />
        : <PortfolioNewsBoard stocks={boardStocks} selected={selectedCode} onSelect={selectStock}
          title={null} publicOnly autoFocus={picked} relations={relationLabels(activeBrief)}
          initialBriefs={{ [code]: brief, ...(activeBrief ? { [activeBrief.symbol_code]: activeBrief } : {}) }}
          renderNewsFooter={news => <BriefReport key={`${news.symbol_code}-${news.generated_at}`} kind="stock"
            code={news.symbol_code} generatedAt={news.generated_at} />} />}

      {themes && <aside className="trading-news-themes mt-6" aria-label="오늘의 테마 AI 분석">
        <ThemeContent data={themes} showMetadata={false} onSelect={selectTheme} />
      </aside>}
    </Modal>}
  </>;
}

// Today's top themes, not the themes this stock belongs to.
function ThemeDetail({ autoFocus, data, onStock, theme }) {
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
        <span className="text-xs text-gray-500">상승 {comma(theme.rise_count)} · 하락 {comma(theme.fall_count)} / {comma(theme.total_count)}종목</span>
      </div>
      {theme.reason && <div className="trading-news-summary"><p>{theme.reason}</p></div>}
    </header>
    <div className="trading-news-sections">
      {theme.leaders.length > 0 && <section>
        <h4>대표 종목</h4>
        <div className="trading-news-leaders">{theme.leaders.map(stock => <button type="button" key={stock.code}
          onClick={() => onStock(stock.code, stock.name, stock.change_rate)} aria-label={`${stock.name} 뉴스 상세 보기`}>
          <span className="font-bold text-gray-900">{stock.name}</span>
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
