import { readResource, resourceKey, writeResource, CACHE_STORAGE_KEY } from './resourceCache';

const EVENT = 'stockmaster:stock-brief-updated';
const key = code => resourceKey('stock-brief', null, code);
const headingKey = code => resourceKey('portfolio-news-heading', null, code);
export const readStockBrief = code => readResource(key(code))?.data || null;

export function rememberPortfolioHeadline(record) {
  if (!record?.symbol_code || !record.headline?.trim()) return;
  const previous = readResource(headingKey(record.symbol_code))?.data;
  if (!previous || Date.parse(record.generated_at) >= Date.parse(previous.generated_at)) {
    writeResource(headingKey(record.symbol_code), { headline: record.headline, generated_at: record.generated_at,
      banner_summary: record.banner_summary || null }, true);
  }
  const news = record.news_brief || readStockBrief(record.symbol_code);
  if (news) publishStockBrief(news);
}

export function publishStockBrief(brief) {
  if (!brief?.symbol_code) return brief;
  const previous = readStockBrief(brief.symbol_code);
  const incomingTime = Date.parse(brief.generated_at), previousTime = Date.parse(previous?.generated_at);
  let shared = previousTime > incomingTime ? previous : brief;
  if (previousTime === incomingTime && previous) {
    const portfolioHeadline = brief.portfolio_headline || previous.portfolio_headline;
    shared = { ...brief, banner_summary: brief.banner_summary || previous.banner_summary,
      banner_title: Object.hasOwn(brief, 'banner_title') ? brief.banner_title : previous.banner_title || brief.title,
      ...(portfolioHeadline ? { title: portfolioHeadline, portfolio_headline: portfolioHeadline } : {}),
      citations: Object.keys(brief.citations || {}).length ? brief.citations : previous.citations };
  }
  // The saved portfolio title is selected independently from the news refresh time.
  // Legacy briefings without an embedded news snapshot still supply their original title.
  const heading = readResource(headingKey(brief.symbol_code))?.data;
  if (heading) shared = { ...shared, banner_title: shared.banner_title || shared.title,
    title: heading.headline, portfolio_headline: heading.headline,
    banner_summary: heading.banner_summary || shared.banner_summary };
  if (JSON.stringify(previous) !== JSON.stringify(shared)) {
    writeResource(key(brief.symbol_code), shared, true);
    if (typeof window !== 'undefined') window.dispatchEvent(new window.CustomEvent(EVENT, { detail: shared }));
  }
  return shared;
}

export function subscribeStockBrief(callback) {
  const update = event => callback(event.detail);
  const storage = event => { if (event.key === CACHE_STORAGE_KEY) callback(null); };
  window.addEventListener(EVENT, update);
  window.addEventListener('storage', storage);
  return () => { window.removeEventListener(EVENT, update); window.removeEventListener('storage', storage); };
}
