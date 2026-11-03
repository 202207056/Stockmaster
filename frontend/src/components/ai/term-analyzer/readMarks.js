const TIERS = new Set(['invest', 'company', 'general']);
export const TIER_LABELS = { invest: '투자 용어', company: '기업', general: '어려운 말' };
const CODE = /^[0-9A-Z]{6}$/u;
const SIZES = new Set(['초대형', '대형', '중견', '중소', '스타트업']);
// Dictionary words almost every reader already knows; they are shown faintly instead of hidden.
export const BASIC_IDS = new Set(['stock', 'shareholder', 'trading', 'paper_trading', 'current_price', 'chart', 'price_rise', 'price_fall',
  'buy', 'sell', 'order', 'kospi', 'kosdaq', 'line_chart']);

export const aiId = (term) => `ai:${term.term}`;

// Keeps only well-formed rows; the server already checked each word appears in the text.
export function validateDetected(data) {
  if (!data || !Array.isArray(data.terms)) throw new Error('AI 응답을 확인하지 못했어요.');
  const seen = new Set();
  return data.terms.filter((row) => row && typeof row.term === 'string' && row.term.trim()
    && typeof row.meaning === 'string' && TIERS.has(row.tier) && !seen.has(row.term) && seen.add(row.term))
    .map(({ term, tier, meaning, basic, symbol_code: code, basis, listing, index, sector, size, listing_checked: checked }) => {
      const company = tier === 'company';
      const short = (value, limit) => (company && typeof value === 'string' && value.trim().length <= limit ? value.trim() : '');
      return {
        term, tier, meaning, basic: basic === true,
        code: company && CODE.test(code ?? '') ? code : null,
        basis: company && ['context', 'data'].includes(basis) ? basis : 'knowledge',
        facts: company ? { listing: short(listing, 20), index: short(index, 30), sector: short(sector, 20),
          size: SIZES.has(size) ? size : '', checked: checked === true } : null,
      };
    });
}
