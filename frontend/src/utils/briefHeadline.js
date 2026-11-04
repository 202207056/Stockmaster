// Reuse a recent, news-backed headline without generating another AI response.
export function savedNewsHeadline(items, code, now = Date.now()) {
  const candidates = items.filter(item => {
    const age = now - Date.parse(item.generated_at);
    return item.symbol_code === String(code) && age >= 0 && age <= 24 * 60 * 60 * 1000
      && /\[(\d+)\]/g.test(item.headline)
      && [...item.headline.matchAll(/\[(\d+)\]/g)].every(match => item.sources?.[Number(match[1]) - 1]?.title);
  }).sort((a, b) => Date.parse(b.generated_at) - Date.parse(a.generated_at));
  const full = candidates[0]?.headline.replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim() || '';
  // Keep the first sentence intact when possible; ellipsis signals any shortening.
  const first = full.split(/(?<=[.!?])\s+/u)[0];
  const chars = Array.from(first);
  const short = chars.length <= 48 ? first : chars.slice(0, 47).join('').trimEnd() + '…';
  return { full, short };
}
