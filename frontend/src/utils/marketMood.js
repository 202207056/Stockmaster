const labels = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'];
const levels = ['LOW', 'MEDIUM', 'HIGH'];

export function aggregateMarketMood(news = [], analyses = []) {
  const counts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
  let highTitle = null;
  const byId = new Map();
  for (const analysis of analyses || []) {
    if (!byId.has(analysis?.article_id)) byId.set(analysis?.article_id, analysis);
  }
  for (const [index, article] of (news || []).slice(0, 10).entries()) {
    const analysis = byId.get(String(index));
    if (!labels.includes(analysis?.sentiment?.label) || !levels.includes(analysis?.importance?.label)) continue;
    counts[analysis.sentiment.label]++;
    if (highTitle === null && analysis.importance.label === 'HIGH' && article?.title) highTitle = article.title;
  }
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
  return { counts, total, highTitle, percentages: Object.fromEntries(labels.map(label => [label, total ? counts[label] / total * 100 : 0])) };
}
