// Convert the provider's report-style sentence endings without changing facts.
export function formalCompanyOverview(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/(하였음|있음|없음|했음|됐음|였음|었음|았음|함|됨|임|한다|된다|이다|있다|없다|했다|됐다|였다|었다|았다)(?=[.!?。！？](?:\s|$)|\s*$)/g, ending => {
    const endings = { 함: '합니다', 됨: '됩니다', 임: '입니다', 한다: '합니다', 된다: '됩니다', 이다: '입니다' };
    return endings[ending] || `${ending.slice(0, -1)}습니다`;
  });
}
