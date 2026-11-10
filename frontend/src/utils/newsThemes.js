import { newsParagraphs } from '../components/common/NewsSummaryBody';

// News topics, not an assertion of exchange industry membership.
const TOPICS = [
  ['반도체', /반도체|메모리|HBM|파운드리|웨이퍼/i],
  ['AI · 소프트웨어', /인공지능|\bAI\b|소프트웨어|클라우드|데이터센터/i],
  ['자동차 · 모빌리티', /자동차|자율주행|모빌리티|완성차/],
  ['배터리 · 에너지', /배터리|이차전지|2차전지|양극재|전력|태양광|원자력|에너지/],
  ['바이오 · 헬스케어', /바이오|신약|임상|제약|헬스케어|의료/],
  ['금융', /금융|은행|보험|증권사/],
  ['산업 · 방산', /방산|조선|항공|철강|건설|로봇/],
  ['소비 · 콘텐츠', /유통|화장품|식품|게임|콘텐츠|엔터테인먼트/],
];

export function newsTheme(brief) {
  const text = [brief?.title, ...newsParagraphs(brief)].filter(Boolean).join(' ');
  const ranked = TOPICS.map(([name, pattern]) => [name, [...text.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))].length]);
  ranked.sort((a, b) => b[1] - a[1]);
  return ranked[0][1] ? ranked[0][0] : '기타 뉴스';
}

export function newsColumns(stocks, briefs, selected) {
  const groups = new Map();
  const selectedTheme = selected ? newsTheme(briefs[selected]) : null;
  const explicit = new Set((briefs[selected]?.related || []).map(stock => stock.code));
  const related = selected ? stocks.filter(stock => stock.code !== selected && (
    explicit.has(stock.code)
    || briefs[stock.code]?.related?.some(peer => peer.code === selected)
    || (selectedTheme !== '기타 뉴스' && newsTheme(briefs[stock.code]) === selectedTheme)
  )) : [];
  const relatedCodes = new Set(related.map(stock => stock.code));
  for (const stock of [...related, ...stocks.filter(stock => !relatedCodes.has(stock.code))]) {
    if (stock.code === selected) continue;
    const theme = newsTheme(briefs[stock.code]);
    const priority = relatedCodes.has(stock.code);
    const key = `${priority ? 'related' : 'other'}:${theme}`;
    if (!groups.has(key)) groups.set(key, { theme, priority, items: [] });
    groups.get(key).items.push(stock);
  }
  let ordered = [...groups].sort(([, a], [, b]) => Number(b.priority) - Number(a.priority)
    || Number(b.theme === '반도체') - Number(a.theme === '반도체'));
  ordered = arrangeConnectedGroups(ordered, briefs);
  return ordered.flatMap(([key, { theme, priority, items }]) => Array.from({ length: Math.ceil(items.length / 5) }, (_, index) => ({
    key: `${key}-${index}`, theme, priority, continued: index > 0, stocks: items.slice(index * 5, (index + 1) * 5),
  })));
}

// Minimize the distance of explicit cross-theme links, keeping themes together,
// semiconductors first and the expanded stock's related groups nearest its body.
function arrangeConnectedGroups(groups, briefs) {
  const themes = new Map(groups.flatMap(([, group]) => group.items.map(stock => [stock.code, group.theme])));
  const edges = new Map();
  for (const [code, theme] of themes) {
    for (const peer of briefs[code]?.related || []) {
      if (!themes.has(peer.code) || themes.get(peer.code) === theme) continue;
      const pair = [code, peer.code].sort();
      edges.set(pair.join(':'), pair);
    }
  }
  if (!edges.size) return groups;
  const distance = () => {
    const positions = new Map();
    let column = 0;
    for (const [, group] of groups) {
      group.items.forEach((stock, index) => positions.set(stock.code, [column + Math.floor(index / 5), index % 5]));
      column += Math.ceil(group.items.length / 5);
    }
    let total = 0;
    for (const [a, b] of edges.values()) {
      const left = positions.get(a), right = positions.get(b);
      total += Math.abs(left[0] - right[0]) * 5 + Math.abs(left[1] - right[1]);
    }
    return total;
  };
  let best = distance();
  const improve = (list, a, b) => {
    [list[a], list[b]] = [list[b], list[a]];
    const next = distance();
    if (next < best) { best = next; return true; }
    [list[a], list[b]] = [list[b], list[a]];
    return false;
  };
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (let a = 0; a < groups.length; a++) {
      for (let b = a + 1; b < groups.length; b++) {
        const left = groups[a][1], right = groups[b][1];
        if (left.priority !== right.priority || left.theme === '반도체' || right.theme === '반도체') continue;
        changed = improve(groups, a, b) || changed;
      }
    }
    for (const [, group] of groups) {
      for (let a = 0; a < group.items.length; a++) {
        for (let b = a + 1; b < group.items.length; b++) changed = improve(group.items, a, b) || changed;
      }
    }
    if (!changed) break;
  }
  return groups;
}

export function relatedNewsPairs(stocks, briefs) {
  const held = new Set(stocks.map(stock => stock.code));
  const last = new Map(), pairs = new Map();
  function add(a, b) {
    if (a === b || !held.has(b)) return;
    const pair = [a, b].sort();
    pairs.set(pair.join(':'), pair);
  }
  for (const stock of stocks) {
    const theme = newsTheme(briefs[stock.code]);
    if (theme !== '기타 뉴스') {
      if (last.has(theme)) add(last.get(theme), stock.code);
      last.set(theme, stock.code);
    }
    for (const peer of briefs[stock.code]?.related || []) add(stock.code, peer.code);
  }
  return [...pairs.values()];
}
