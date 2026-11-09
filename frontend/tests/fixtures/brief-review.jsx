// Local visual regression fixture. Every article and holding here is sample data.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import '../../src/index.css';
import '../../src/theme.css';
import PortfolioBriefCard from '../../src/components/ai/PortfolioBriefCard';
import { AuthContext } from '../../src/contexts/auth-context';
import api from '../../src/api/client';

const samples = [
  ['005930', '삼성전자', '반도체 공급 계약과 메모리 생산 계획 발표'],
  ['000660', 'SK하이닉스', 'HBM 공급 확대와 신규 설비 투자 검토'],
  ['042700', '한미반도체', '반도체 장비 공급 계약 발표'],
  ['000990', 'DB하이텍', '반도체 생산 공정 개선 계획 발표'],
  ['403870', 'HPSP', '반도체 장비 수요와 투자 계획 확인'],
  ['005380', '현대차', '자동차 신규 모델 출시와 해외 생산 확대'],
  ['000270', '기아', '자동차 판매 실적과 신규 모델 발표'],
  ['207940', '삼성바이오로직스', '바이오 위탁생산 계약 확대'],
  ['068270', '셀트리온', '바이오 신약 임상 결과 발표'],
  ['051910', 'LG화학', '배터리 소재 생산 투자 계획 발표'],
  ['006400', '삼성SDI', '배터리 신규 공장 가동 준비'],
  ['105560', 'KB금융', '금융 실적과 자본 정책 발표'],
];
const holdings = samples.map(([symbol_code, security_name]) => ({ symbol_code, security_name, hold_quantity: 10, avg_price: 10000 }));
const time = new Date().toISOString();
function news(code) {
  const [, name, title] = samples.find(item => item[0] === code);
  const result = { symbol_code: code, name, title, price: 10000, change_rate: 1.3, generated_at: time, as_of: time,
    ai_available: true, related: code === '005930' ? [{ code: '051910', name: 'LG화학', change_rate: 1.3, title: null }] : [], recent_issues: [`${name}의 ${title} 관련 보도가 나왔습니다. 구체적인 계약 일정과 규모가 확인된 범위에서 내용을 정리했습니다.`],
    positive_factors: ['신규 계약은 생산과 매출 기반을 넓힐 가능성이 있습니다. 실제 실적 반영 규모는 아직 확인되지 않았습니다.'],
    risk_factors: ['수요 변화와 투자 집행 일정에 따라 실적 반영 시점이 달라질 수 있습니다.'],
    evidence: [{ title: `${name}, 공급 계획 발표`, source: '샘플 뉴스', url: 'https://example.com/article', published_at: time }],
    source: '네이버 증권', disclaimer: '기사 제목을 바탕으로 한 요약이며 전망이나 투자 조언이 아닙니다.' };
  result.citations = Object.fromEntries([...result.recent_issues, ...result.positive_factors, ...result.risk_factors].map(text => [text, result.evidence]));
  return result;
}
function personal(code) {
  const shared = news(code);
  return { id: 1, symbol_code: code, security_name: shared.name, generated_at: time, headline: shared.title, banner_summary: '반도체 공급계약·생산계획',
    current_status: [], entry_context: [], position_summary: [], recent_issues: shared.recent_issues,
    positive_factors: shared.positive_factors, risk_factors: shared.risk_factors, watch_points: ['후속 공시 [1]', '매출 반영 [1]'], limitations: [],
    news_brief: shared, sources: shared.evidence, trend_guesses: ['관련 보도와 같은 시기에 가격 변동이 관찰됐지만, 이것만으로 변동 원인을 단정할 수는 없습니다. [1]'],
    disclaimer: '모의투자 연습용 설명이며 투자 권유가 아닙니다.' };
}
let records = [personal('005930')];
api.defaults.adapter = async config => {
  let data;
  if (config.url.startsWith('/ai/stock-brief/')) data = news(config.url.split('/').at(-1));
  else if (config.url === '/ai/portfolio-briefs') data = { items: records };
  else if (config.url.startsWith('/ai/portfolio-brief/')) { data = personal(config.url.split('/').at(-1)); records = [data, ...records]; }
  else if (config.url === '/trading/portfolio') data = { holdings };
  else if (config.url === '/ai/theme-brief') data = { rising: [{ id: 'sample', name: 'AI 인프라', change_rate: 1.3,
    rise_count: 2, fall_count: 0, total_count: 2, reason: '샘플 테마 관련 소식입니다.', evidence: [],
    leaders: [{ code: '005930', name: '삼성전자', change_rate: 1.3, price: 10000 },
      { code: '000660', name: 'SK하이닉스', change_rate: 1.3, price: 10000 }] }],
    falling: [], source: '샘플', disclaimer: '샘플', as_of: time };
  else throw new Error(`Unexpected fixture request: ${config.url}`);
  return { config, data, status: 200, statusText: 'OK', headers: {} };
};
createRoot(document.getElementById('root')).render(<MemoryRouter><AuthContext.Provider value={{ isAuthenticated: true, accountId: 7 }}>
  <main style={{ maxWidth: 1280, margin: '32px auto', padding: '0 20px' }}>
    <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>StockMaster · 내 자산</h1>
    <PortfolioBriefCard accountId={7} holdings={holdings} />
  </main>
</AuthContext.Provider></MemoryRouter>);
