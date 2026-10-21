export const SITE_TOUR_STEPS = [
  { path: '/dashboard', target: 'navigation', title: '메뉴바 소개', text: '홈, 즐겨찾기, 트레이딩, 내 자산, 커뮤니티, 학습 메뉴에서 시장 확인부터 모의투자와 학습까지 이용할 수 있어요. 먼저 홈 화면을 살펴볼게요.' },
  { path: '/dashboard', target: 'navigation', navPath: '/dashboard', title: '홈 버튼', text: '메뉴바의 홈 버튼을 누르면 언제든 이 화면으로 돌아올 수 있어요. 홈에서는 주요 시세, 종목 랭킹, 뉴스와 관심종목을 한눈에 확인할 수 있어요.' },
  { path: '/dashboard', target: 'market', title: '주요 시세', text: '코스피·코스닥과 해외 지수, 금·달러의 흐름을 비교해 보세요. 숫자는 현재 시세, 등락률은 이전 기준값 대비 변화예요. 작은 차트는 가격 흐름을 보여주며, 좌우로 끌면 다른 지표도 볼 수 있어요.' },
  { path: '/dashboard', target: 'ranking-amount', title: '거래대금 상위', text: '거래에 사용된 금액이 큰 종목을 모았어요. 시장의 자금이 어디에 몰리는지 살펴볼 수 있어요. 종목 오른쪽에는 현재가와 등락률이 표시되고, 종목명을 누르면 트레이딩 화면으로 이동해요.' },
  { path: '/dashboard', target: 'ranking-change', title: '급상승', text: '이전 거래일보다 가격이 많이 오른 종목을 확인하는 곳이에요. 현재가와 상승률을 함께 비교해 보세요. 상승률이 높다는 이유만으로 고르기보다 뉴스와 차트에서 움직인 이유를 확인해 보세요.' },
  { path: '/dashboard', target: 'ranking-volume', title: '인기 종목', text: '거래량이 많은 종목을 보여줘요. 거래량은 사고판 주식 수이고, 거래대금은 거래된 금액이에요. 거래가 활발한 종목을 찾을 때 두 기준을 함께 참고해 보세요.' },
  { path: '/dashboard', target: 'news', title: '오늘의 뉴스', text: '기사 제목과 요약, 출처와 시간을 확인해 보세요. 제목을 누르면 원문이 새 탭으로 열려요. AI 분석이 제공되면 투자영향과 중요도도 표시돼요. 분석을 불러오지 못한 경우에는 재시도할 수 있어요.' },
  { path: '/dashboard', target: 'favorites', title: '관심종목 미리보기', text: '즐겨찾기에 담아둔 종목을 홈에서도 최대 5개까지 확인할 수 있어요. 아직 비어 있다면 관심 종목을 먼저 추가해 보세요. 제목 옆 > 버튼을 누르면 즐겨찾기 전체 목록으로 이동해요.' },
  { path: '/dashboard', target: 'favorites', clickSelector: '[data-site-tour="favorites"] a[href="/favorites"]', title: '여기를 클릭', text: '관심종목 >을 눌러 즐겨찾기 화면으로 이동해 보세요.' },
  { path: '/favorites', target: 'page', title: '즐겨찾기', text: '관심 종목을 모아 시세를 비교하는 화면이에요. 종목의 별을 눌러 추가하거나 해제하고, 그룹을 만들어 관심 종목을 나눠 관리할 수 있어요.' },
  { path: '/favorites', target: 'navigation', clickSelector: 'nav[aria-label="주 메뉴"] a[href="/trading"]', title: '여기를 클릭', text: '메뉴바의 트레이딩 버튼을 눌러 이동해 보세요.' },
  { path: '/trading', target: 'page', title: '트레이딩', text: '종목을 검색하고 차트·호가를 확인한 뒤 매수·매도를 진행하는 화면이에요. 주문 전 계좌, 수량, 가격을 확인하세요. 매수 방법이 낯설면 학습 메뉴에서 주문 튜토리얼을 먼저 체험할 수 있어요.' },
  { path: '/trading', target: 'navigation', clickSelector: 'nav[aria-label="주 메뉴"] a[href="/assets"]', title: '여기를 클릭', text: '메뉴바의 내 자산 버튼을 눌러 이동해 보세요.' },
  { path: '/assets', target: 'page', title: '내 자산', text: '선택한 계좌의 현금, 보유 종목과 평가손익을 확인해요. 계좌를 바꾸면 해당 계좌의 결과가 표시돼요. 현금과 주식 평가액을 함께 확인하면 현재 자산 구성을 이해하기 쉬워요.' },
  { path: '/assets', target: 'navigation', clickSelector: 'nav[aria-label="주 메뉴"] a[href="/community"]', title: '여기를 클릭', text: '메뉴바의 커뮤니티 버튼을 눌러 이동해 보세요.' },
  { path: '/community', target: 'page', title: '커뮤니티', text: '게시글과 댓글로 투자 경험을 나누는 곳이에요. 다른 사람의 의견은 참고하되 뉴스와 공시 등 판단 근거도 직접 확인해 보세요.' },
  { path: '/community', target: 'navigation', clickSelector: 'nav[aria-label="주 메뉴"] a[href="/learn"]', title: '여기를 클릭', text: '메뉴바의 학습 버튼을 눌러 이동해 보세요.' },
  { path: '/learn', target: 'page', title: '학습', text: '투자 기초, 차트와 주문 튜토리얼을 살펴보세요. 실제 화면의 강조 표시와 안내를 따라 하나씩 연습할 수 있어요. 둘러보기를 마치면 홈으로 돌아가요.' },
];

export function siteTourIndex(value) {
  if (!/^\d+$/.test(value || '')) return -1;
  const index = Number(value);
  return index < SITE_TOUR_STEPS.length ? index : -1;
}
