const scale = ['STRONG SELL · 강력매도', 'SELL · 매도', 'HOLD · 중립', 'BUY · 매수', 'STRONG BUY · 강력매수'];

// Fractional averages are between grades, never rounded into a broker recommendation.
export function consensusLabel(score) {
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 1 || score > 5) return '—';
  if (Number.isInteger(score)) return scale[score - 1];
  return `${scale[Math.floor(score) - 1].split(' · ')[0]} ~ ${scale[Math.ceil(score) - 1].split(' · ')[0]}`;
}

export function brokerRatingLabel(opinion) {
  const labels = { '강력매수': scale[4], '매수': scale[3], '중립': scale[2], '매도': scale[1], '강력매도': scale[0] };
  return labels[opinion] || opinion || '—';
}
