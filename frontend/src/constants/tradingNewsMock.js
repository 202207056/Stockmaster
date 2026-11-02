// 뉴스 정리 UI 전용 예시. 실시간 시세·보유수량 및 브리핑 API와 분리한다.
export const tradingNewsMock = {
  code: '000660',
  name: 'SK하이닉스',
  change_rate: -8.85,
  quantity: 10,
  headline: 'AI 인프라 관련 HBM 후속 협의',
  recent_issues: [
    'SK하이닉스가 개최한 AI 해커톤 온라인 예선에서 시스템 장애가 발생했으며, 참가자 대상 재응시 기회를 검토 중이라고 보도됐습니다.',
    '해외 빅테크 주가 급락과 AI·반도체 업계 실적 및 AI 투자의 수익성 우려가 기사에 언급됐습니다.',
    '샘 올트먼 오픈AI CEO가 삼성·SK그룹과 만나 메모리 공급난 및 AI 인프라 관련 HBM 후속 협의를 논의했다는 보도가 있습니다.',
  ],
  positive_factors: ['샘 올트먼 CEO의 방한 중 삼성·SK그룹과 AI 인프라 및 메모리 공급 협력 논의가 있었다고 보도됐습니다.'],
  risk_factors: [
    'AI 해커톤 온라인 예선에서 시스템 장애가 발생했습니다.',
    '기사에서 해외 빅테크 주가 급락과 AI·반도체 업계 실적 기대 미달 및 AI 투자의 수익성 우려를 언급했습니다.',
  ],
  related: [
    { code: '005930', name: '삼성전자', quantity: 5, change_rate: -4.96, summary: 'AI 인프라 확대에 따른 메모리 공급 협력 논의' },
    { code: '000990', name: 'DB하이텍', quantity: 0, change_rate: 2.23, summary: '반도체 업황과 파운드리 수요 회복 기대' },
    { code: '042700', name: '한미반도체', quantity: 2, change_rate: -2.23, summary: 'HBM 투자와 첨단 패키징 장비 수요 주목' },
    { code: '403870', name: 'HPSP', quantity: 0, change_rate: -2.23, summary: 'AI 반도체 설비 투자 속도에 관심' },
  ],
};

const relatedDetails = {
  '005930': {
    recent_issues: ['AI 데이터센터 확대와 함께 고대역폭 메모리 공급 협력 논의가 주목받고 있습니다.', '메모리 수요 회복과 첨단 반도체 생산 역량이 주요 관심사입니다.'],
    positive_factors: ['AI 서버용 메모리 수요 확대는 고부가 제품 공급 기회로 이어질 수 있습니다.', '메모리와 파운드리를 함께 보유한 사업 구조가 협력 범위를 넓힐 수 있습니다.'],
    risk_factors: ['고객사 품질 검증과 실제 공급 일정은 추가 확인이 필요합니다.', '빅테크의 투자 속도와 반도체 가격 변동이 실적에 영향을 줄 수 있습니다.'],
  },
  '000990': {
    recent_issues: ['반도체 업황 회복 기대와 함께 파운드리 수요 변화에 관심이 모이고 있습니다.', '전력관리·아날로그 반도체 수요와 생산 가동률이 주요 확인 사항입니다.'],
    positive_factors: ['전력관리 반도체 수요가 회복되면 생산 가동률 개선에 도움이 될 수 있습니다.'],
    risk_factors: ['고객사 재고 조정이 길어지면 수요 회복이 지연될 수 있습니다.', '파운드리 공급 경쟁과 가격 압력을 함께 살펴볼 필요가 있습니다.'],
  },
  '042700': {
    recent_issues: ['HBM 생산 확대와 첨단 패키징 장비 수요가 주요 이슈입니다.', '메모리 업체의 설비 투자 일정과 장비 공급 계획에 관심이 이어지고 있습니다.'],
    positive_factors: ['HBM 적층 공정의 중요성이 커지면 관련 장비 수요 확대를 기대할 수 있습니다.'],
    risk_factors: ['고객사의 투자 일정 변경에 따라 장비 발주 시점이 달라질 수 있습니다.', '장비 경쟁과 특정 고객사 의존도를 함께 확인해야 합니다.'],
  },
  '403870': {
    recent_issues: ['AI 반도체 생산 확대와 함께 첨단 공정 장비 투자 속도가 주목받고 있습니다.', '주요 고객사의 공정 전환과 설비 투자 계획이 관심사입니다.'],
    positive_factors: ['미세 공정 전환이 이어지면 고부가 공정 장비 수요에 도움이 될 수 있습니다.'],
    risk_factors: ['고객사의 설비 투자 지연은 장비 매출 인식 시점에 영향을 줄 수 있습니다.', '기술 경쟁과 신규 장비 도입 속도를 확인할 필요가 있습니다.'],
  },
};

export const tradingNewsStocks = [
  { ...tradingNewsMock, summary: tradingNewsMock.headline },
  ...tradingNewsMock.related.map(stock => ({ ...stock, headline: stock.summary, ...relatedDetails[stock.code] })),
];

export const tradingThemeMock = {
  source: '예시 데이터', as_of: '2026-10-30T15:30:00+09:00',
  rising: [{
    id: 'infrastructure', name: 'AI 인프라', change_rate: 2.23,
    rise_count: 6, fall_count: 2, total_count: 8,
    reason: 'AI 데이터센터 확대와 인프라 협력 논의가 이어지며 관련 투자 기대가 주목받았어요.',
    leaders: [], evidence: [{ title: 'AI 데이터센터 인프라 협력 논의 확대' }],
  }],
  falling: [{
    id: 'hbm', name: '반도체 · HBM', change_rate: -5.42,
    rise_count: 2, fall_count: 10, total_count: 12,
    reason: '해외 빅테크 약세와 AI 투자 수익성 우려가 반도체 관련 이슈로 함께 언급됐어요.',
    leaders: [], evidence: [{ title: '빅테크 약세 속 AI 투자 수익성에 관심' }],
  }],
  disclaimer: '화면 구성을 위한 예시 분석입니다. 실제 시세나 현재 뉴스 분석이 아닙니다.',
};
