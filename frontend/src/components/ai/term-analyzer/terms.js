// Definitions and optional spelling aliases come from the shared glossary.
export const QUICK_TERMS = ['PER', 'PBR', 'ROE', 'EPS', 'ETF', 'IPO'];
const normalize = (value) => String(value ?? '').normalize('NFKC').toUpperCase();
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const particles = '(?:으로는|에서는|이라는|입니다|이란|처럼|부터|까지|에도|으로|에서|에는|이다|이고|이며|은|는|이|가|을|를|와|과|의|에|로|도|만|랑|하고)';
const compiled = new WeakMap();
const ambiguous = new Set(['order', 'chart', 'price_rise', 'price_fall', 'settlement']);
const financialContext = /주식|주가|종목|매수|매도|거래|체결|호가|시세|계좌|증권|투자|수익|손익|봉|지수|트레이딩|\b(?:TRADING|ETF|PER|PBR|ROE|EPS|IPO)\b/u;

export function termAliases(entry) {
  return [...new Set([entry.term.split(' (')[0], ...[...entry.term.matchAll(/\(([^)]+)\)/g)].map((match) => match[1]), ...(entry.aliases ?? [])]
    .flatMap((name) => {
      const parts = name.split(/\s*·\s*/);
      const period = name.match(/^(\d+주)\s/u)?.[1];
      // "52주 최고 · 최저" shares the period; "최저" alone is not that term.
      return parts.map((part, index) => period && index ? `${period} ${part}` : part);
    }).map(normalize))];
}

function matchers(glossary) {
  if (!compiled.has(glossary)) {
    compiled.set(glossary, Object.entries(glossary).flatMap(([id, entry]) => termAliases(entry).map((alias) => {
      // Allow OCR-inserted horizontal spaces only inside a known Korean spelling.
      // Never guess a different letter (e.g. 시가종액 -> 시가총액 or R0E -> ROE).
      const word = /^[가-힣\s]+$/u.test(alias)
        ? [...alias.replace(/\s/g, '')].map(escape).join('[ \\t]*')
        : alias.split(/\s+/).map(escape).join('[ \\t]+');
      const suffix = /[가-힣]$/u.test(alias) ? `(?=$|[^\\p{L}_]|${particles}(?![\\p{L}_]))` : '(?=$|[^\\p{L}_])';
      return { id, pattern: new RegExp(`(^|[^\\p{L}\\p{N}_])(${word})${suffix}`, 'gu') };
    })));
  }
  return compiled.get(glossary);
}

function hasFinancialContext(source, start, end) {
  const lineStart = source.lastIndexOf('\n', start - 1) + 1;
  const nextBreak = source.indexOf('\n', end);
  const line = source.slice(lineStart, nextBreak < 0 ? source.length : nextBreak);
  // Standalone labels (optionally followed by a numeric value) are valid in this stock UI.
  const rest = source.slice(lineStart, start) + source.slice(end, nextBreak < 0 ? source.length : nextBreak);
  return financialContext.test(line) || /^[\s\d.,+\-:%원배주()·/]*$/u.test(rest);
}

// Where each dictionary term sits in text.normalize('NFKC'), for highlighting the read paragraph.
export function findTermSpans(text, glossary) {
  const source = normalize(text);
  const candidates = matchers(glossary).flatMap(({ id, pattern }) => [...source.matchAll(pattern)].flatMap((match) => {
    const start = match.index + match[1].length, end = start + match[2].length;
    if (ambiguous.has(id) && !hasFinancialContext(source, start, end)) return [];
    return [{ id, start, end }];
  }));
  // Reserve longest spans first: 시장가 주문 must not also produce 시가 or 주문.
  candidates.sort((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start);
  const accepted = [];
  for (const candidate of candidates) {
    if (!accepted.some((hit) => candidate.start < hit.end && candidate.end > hit.start)) accepted.push(candidate);
  }
  return accepted.sort((a, b) => a.start - b.start);
}

export function findDetectedTerms(text, glossary) {
  return [...new Set(findTermSpans(text, glossary).map(({ id }) => id))];
}

export function findUnknownTerms(text, glossary) {
  return QUICK_TERMS.filter((term) => !Object.values(glossary).some((entry) => termAliases(entry).includes(term))
    && new RegExp(`(^|[^A-Z0-9_])${term}(?=$|[^A-Z0-9_])`, 'u').test(normalize(text)));
}

export function validateFile(file) {
  if (!file) return 'PNG 또는 JPG 이미지를 선택해 주세요.';
  if (!['image/png', 'image/jpeg'].includes(file.type)) return 'PNG/JPG 파일만 사용할 수 있습니다.';
  if (file.size === 0) return '빈 파일입니다. 다른 이미지를 선택해 주세요.';
  if (file.size > 10 * 1024 * 1024) return '10 MiB 이하 이미지를 선택해 주세요.';
  return null;
}

export function validateDimensions(width, height) {
  return width < 1 || height < 1 || width * height > 16_000_000 ? '이미지는 16 MP 이하로 준비해 주세요.' : null;
}

export function isAnalyzerRoute(pathname, search = '') {
  const params = new URLSearchParams(search);
  return ['/dashboard', '/trading', '/assets', '/favorites', '/community', '/learn', '/learn/charts', '/mypage'].includes(pathname)
    && !params.has('tour') && !params.has('practice');
}
