import { GLOSSARY } from '../../../constants/glossary.js';
import { exactGlossaryId, privacyIssue } from './termAiContract.js';

export const WIKI_ENDPOINT = 'https://ko.wikipedia.org/w/api.php';
export const WIKI_AGENT = 'StockmasterTermLookupExperiment/0.1 (https://github.com/202207056/Stockmaster)';
export const WIKI_ENABLED = import.meta.env?.VITE_ENABLE_TERM_WIKI === 'true';
const normalize = value => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toUpperCase();
const titleKey = value => normalize(value);
const finance = /금융|경제학|채권|주식|증권|재무|회계|자본시장|통화|물가|투자|이자율|금리|파생상품/u;
const nonFinance = /동음이의|인명|인물|가수|배우|동물|식물|영화|의학|의료|경제학자|기업인|출생|사망/u;
const qualified = /^(.*)\s*\((금융|경제학|경제|채권|주식|재무|회계|투자|증권)\)$/u;
const aborted = () => new DOMException('Lookup cancelled', 'AbortError');

export function validateWikiTerm(value) {
  if (typeof value !== 'string' || [...value].length > 60 || /[\r\n\t\p{Cc}]/u.test(value)) return null;
  const term = value.normalize('NFKC').trim().replace(/ +/gu, ' ');
  if ([...term].length < 2 || !/^[\p{L}\p{N} .·%()+/-]+$/u.test(term) || !/\p{L}/u.test(term)
    || term.split(' ').length > 6 || privacyIssue(term)) return null;
  return term;
}

function resolvedTitle(data, input) {
  let title = input;
  for (const type of ['normalized', 'converted', 'redirects']) {
    const links = data.query?.[type] ?? [];
    if (!Array.isArray(links) || links.length > 10) return null;
    for (let i = 0; i < links.length; i++) {
      const next = links.find(link => typeof link.from === 'string' && typeof link.to === 'string' && titleKey(link.from) === titleKey(title));
      if (!next || titleKey(next.to) === titleKey(title)) break;
      title = next.to;
    }
  }
  return title;
}

export function inspectWikiArticle(data, requestedTitle, term = requestedTitle) {
  const pages = data?.query?.pages;
  if (!Array.isArray(pages) || pages.length !== 1) return { status: 'invalid_response', term };
  const page = pages[0];
  if (!page || typeof page !== 'object' || Array.isArray(page)) return { status: 'invalid_response', term };
  if (page.missing === true || page.invalid === true || page.pageid < 0) return { status: 'not_found', term };
  if (typeof page.title !== 'string' || page.title.length > 200 || page.ns !== 0
    || !Number.isSafeInteger(page.pageid) || page.pageid < 1) return { status: 'invalid_response', term };
  const canonical = resolvedTitle(data, requestedTitle);
  if (!canonical || titleKey(canonical) !== titleKey(page.title)) return { status: 'unrelated', term };
  const categories = page.categories ?? [];
  if (!Array.isArray(categories) || categories.length > 100 || categories.some(c => typeof c.title !== 'string')) return { status: 'invalid_response', term };
  const categoryText = categories.map(c => c.title).join(' ');
  if (Object.hasOwn(page.pageprops ?? {}, 'disambiguation') || /동음이의/u.test(categoryText)) return { status: 'ambiguous', term };
  if (typeof page.extract !== 'string' || page.extract.length > 5000 || !page.extract.trim()) return { status: 'no_summary', term };
  const intro = page.extract.replace(/\s+/gu, ' ').trim();
  const lead = intro.slice(0, 240);
  if (nonFinance.test(categoryText) || !finance.test(lead)
    || !(finance.test(categoryText) || qualified.test(page.title) || /금융|경제학|채권|주식|증권|재무|회계/u.test(lead.slice(0, 100)))) return { status: 'not_financial', term };
  const summary = intro.length > 600 ? intro.slice(0, 600).trimEnd() + '…' : intro;
  const encoded = encodeURIComponent(page.title.replace(/ /gu, '_'));
  return {
    status: 'found', term, title: page.title, summary, pageId: page.pageid,
    url: `https://ko.wikipedia.org/wiki/${encoded}`,
    historyUrl: `https://ko.wikipedia.org/w/index.php?title=${encodeURIComponent(page.title)}&action=history`,
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/deed.ko',
    credit: '한국어 위키백과 기여자', license: 'CC BY-SA 4.0', modification: '문서 도입부 발췌·공백 및 길이 조정',
  };
}

function searchCandidates(data, term) {
  const rows = data?.query?.search;
  if (!Array.isArray(rows) || rows.length > 5 || rows.some(row => typeof row?.title !== 'string' || row.title.length > 200 || row.ns !== 0)) return null;
  // The exact title was already inspected. Never substitute a merely similar word.
  return [...new Set(rows.map(row => row.title).filter(title => qualified.test(title)
    && titleKey(title.match(qualified)[1]) === titleKey(term) && titleKey(title) !== titleKey(term)))];
}

export function createWikiLookup({ enabled = false, glossary = GLOSSARY, fetchImpl = (...args) => fetch(...args), now = Date.now,
  timeoutMs = 12_000, maxRequestsPerMinute = 20, successTtlMs = 300_000, negativeTtlMs = 60_000 } = {}) {
  const cache = new Map(), pending = new Map(), requests = [];
  let cooldownUntil = 0;
  const discard = key => { clearTimeout(cache.get(key)?.timer); cache.delete(key); };
  function defer(response) {
    const retry = response.headers?.get('Retry-After');
    const wait = retry && /^\d+$/u.test(retry) ? Number(retry) * 1000 : Date.parse(retry ?? '') - now();
    cooldownUntil = now() + Math.max(5000, Number.isFinite(wait) ? wait : 5000);
  }
  async function request(params, signal) {
    signal.throwIfAborted();
    const time = now();
    while (requests.length && time - requests[0] >= 60_000) requests.shift();
    if (time < cooldownUntil || requests.length >= maxRequestsPerMinute) throw Object.assign(new Error('Rate limited'), { safeStatus: 'rate_limited' });
    requests.push(time);
    const url = new URL(WIKI_ENDPOINT);
    url.search = new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', origin: '*', maxlag: '5', ...params });
    const response = await fetchImpl(url.href, { method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer',
      headers: { Accept: 'application/json', 'Api-User-Agent': WIKI_AGENT }, signal });
    signal.throwIfAborted();
    if (response.status === 429 || response.status === 503) {
      defer(response);
      throw Object.assign(new Error('Rate limited'), { safeStatus: 'rate_limited' });
    }
    if (!response.ok) throw Object.assign(new Error('Unavailable'), { safeStatus: 'unavailable' });
    if (Number(response.headers?.get('content-length') ?? 0) > 128_000) throw Object.assign(new Error('Invalid response'), { safeStatus: 'invalid_response' });
    let data;
    try { data = await response.json(); } catch { throw Object.assign(new Error('Invalid JSON'), { safeStatus: 'invalid_response' }); }
    if (!data || typeof data !== 'object') throw Object.assign(new Error('Invalid response'), { safeStatus: 'invalid_response' });
    if (data.error) {
      if (['maxlag', 'ratelimited'].includes(data.error.code)) { defer(response); throw Object.assign(new Error('Rate limited'), { safeStatus: 'rate_limited' }); }
      throw Object.assign(new Error('Invalid response'), { safeStatus: 'invalid_response' });
    }
    return data;
  }
  const article = (title, signal) => request({ titles: title, redirects: '1', converttitles: '1',
    prop: 'extracts|pageprops|info|categories', exintro: '1', explaintext: '1', exchars: '1000', inprop: 'url', cllimit: '50', clshow: '!hidden' }, signal);
  async function run(term, signal) {
    const result = inspectWikiArticle(await article(term, signal), term);
    if (!['not_found', 'ambiguous', 'no_summary', 'not_financial'].includes(result.status)) return result;
    const data = await request({ list: 'search', srsearch: `intitle:"${term}"`, srnamespace: '0', srlimit: '5', srprop: '' }, signal);
    const candidates = searchCandidates(data, term);
    if (!candidates) return { status: 'invalid_response', term };
    if (!candidates.length) return result;
    // Inspect up to five candidates together: exact + search + batch = at most 3 GETs.
    const details = await article(candidates.join('|'), signal), pages = details?.query?.pages;
    if (!Array.isArray(pages) || !pages.length || pages.length > candidates.length
      || pages.some(page => typeof page?.title !== 'string')) return { status: 'invalid_response', term };
    const verified = new Map(), unverifiedTitles = [];
    for (const title of candidates) {
      const canonical = resolvedTitle(details, title);
      if (!canonical) return { status: 'invalid_response', term };
      const matching = pages.filter(page => titleKey(page.title) === titleKey(canonical));
      const found = inspectWikiArticle({ query: { ...details.query, pages: matching } }, title, term);
      if (found.status === 'invalid_response') return found;
      if (found.status === 'found') verified.set(found.pageId, found);
      else if (['ambiguous', 'no_summary'].includes(found.status)) unverifiedTitles.push(title);
    }
    const choices = [...verified.values()];
    // A truncated search / incomplete candidate must not masquerade as uniqueness.
    if (choices.length === 1 && !data.continue && !details.continue && !unverifiedTitles.length) return choices[0];
    if (choices.length || unverifiedTitles.length) return { status: 'ambiguous', term, candidates: choices, unverifiedTitles };
    return result;
  }
  function subscribe(job, signal) {
    if (signal?.aborted) return Promise.reject(aborted());
    return new Promise((resolve, reject) => {
      const token = {}; job.subscribers.add(token);
      const cleanup = () => { signal?.removeEventListener('abort', cancel); job.subscribers.delete(token); };
      const cancel = () => { cleanup(); reject(aborted()); if (!job.subscribers.size) job.controller.abort('cancelled'); };
      signal?.addEventListener('abort', cancel, { once: true });
      job.promise.then(result => { if (!job.subscribers.has(token)) return; cleanup(); resolve(result); }, error => { if (!job.subscribers.has(token)) return; cleanup(); reject(error); });
    });
  }
  function lookup(value, { signal } = {}) {
    if (signal?.aborted) return Promise.reject(aborted());
    const term = validateWikiTerm(value);
    if (!term) return Promise.resolve({ status: 'invalid_input' });
    const glossaryId = exactGlossaryId(term, glossary);
    if (glossaryId) return Promise.resolve({ status: 'local', glossaryId, term });
    if (!enabled) return Promise.resolve({ status: 'disabled', term });
    const key = normalize(term), cached = cache.get(key);
    for (const [otherKey, job] of pending) if (otherKey !== key) job.controller.abort('superseded');
    if (cached && cached.until > now()) return Promise.resolve({ ...cached.result, term, cached: true });
    discard(key);
    if (pending.has(key) && !pending.get(key).controller.signal.aborted) return subscribe(pending.get(key), signal);
    const controller = new AbortController(), job = { controller, subscribers: new Set() };
    let timer;
    const interruption = new Promise((resolve, reject) => {
      controller.signal.addEventListener('abort', () => reject(Object.assign(new Error('Interrupted'), { safeStatus: controller.signal.reason === 'timeout' ? 'timeout' : 'cancelled' })), { once: true });
      timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
    });
    job.promise = Promise.race([run(term, controller.signal), interruption])
      .catch(error => ({ status: controller.signal.aborted ? (controller.signal.reason === 'timeout' ? 'timeout' : 'cancelled') : error?.safeStatus ?? 'unavailable', term }))
      .then(result => {
        if (['found', 'not_found', 'ambiguous', 'not_financial', 'no_summary', 'unrelated'].includes(result.status) && !controller.signal.aborted) {
          const ttl = result.status === 'found' ? successTtlMs : negativeTtlMs;
          const entry = { result, until: now() + ttl };
          entry.timer = setTimeout(() => { if (cache.get(key) === entry) cache.delete(key); }, ttl);
          entry.timer.unref?.();
          cache.set(key, entry);
          while (cache.size > 40) discard(cache.keys().next().value);
        }
        return result;
      }).finally(() => { clearTimeout(timer); if (pending.get(key) === job) pending.delete(key); });
    pending.set(key, job);
    return subscribe(job, signal);
  }
  return { lookup, cancel: () => { for (const job of pending.values()) job.controller.abort('cancelled'); }, clear: () => { for (const key of cache.keys()) discard(key); } };
}

export const wikiLookup = createWikiLookup({ enabled: WIKI_ENABLED });
