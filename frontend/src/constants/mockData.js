/**
 * 목업 데이터 — 연동 전 레이아웃 확인용
 * ═══════════════════════════════════════════════════════════════════════
 *
 * 🔴 이 파일의 값은 전부 가짜입니다. 실제 시세·뉴스·게시글이 아닙니다.
 *
 * 왜 한 파일에 몰아넣었나
 *  화면 곳곳에 가짜 숫자를 흩어 놓으면 (1) 연동할 때 빠뜨리기 쉽고
 *  (2) 어디까지가 진짜인지 아무도 모르게 됩니다. 여기 한 곳에 모아 두면
 *  연동이 끝났을 때 이 파일과 그것을 import 하는 줄만 지우면 됩니다.
 *
 * 화면에서 쓸 때 규칙
 *  이 데이터를 그리는 영역에는 반드시 <MockBadge /> 를 함께 붙입니다.
 *  시연 중에 실제 데이터로 오해되는 것을 막기 위한 최소 장치입니다.
 *
 * 연동 시 체크리스트
 *  [ ] MOCK_INDICES          → GET /api/market/indices    (국내 지수 + 해외 지수 + 금·환율)
 *  [ ] MOCK_SEARCH_KEYWORDS  → GET /api/search/trending   (엔드포인트 자체가 없음)
 *  [ ] MOCK_RANKINGS         → GET /api/ranking/*         (KIS 순위분석 TR)
 *  [ ] MOCK_NEWS             → GET /api/news/market       (F-16)
 *  [ ] MOCK_POSTS            → GET /api/community/posts   (F-17)
 */

/** 화면에서 "이건 목업이다"를 판단할 때 쓰는 플래그 */
export const IS_MOCK = true;

/* ═══════════════════════════════════════════════════════════════════
 * 주요 시세 — 헤더 티커 + 홈 상단 카드
 *
 * 지수뿐 아니라 금·환율도 함께 보여 주므로 "지수"가 아니라 "시세"로 부릅니다.
 *
 * 필요 데이터 소스 — 셋 다 서로 다른 계열입니다 (Doc/17 §12-1)
 *   ① 국내 지수(코스피·코스닥) : KIS 업종/지수 시세 `.../inquire-index-price` 계열
 *   ② 해외 지수(나스닥·S&P)    : KIS 해외주식 시세 TR (별도)
 *   ③ 금·환율                  : KIS 제공 여부 불확실 — 한국은행/외부 API 필요할 수 있음
 *
 * 필드
 *   decimals : 소수점 자릿수 (지수 2 / 금 0 / 환율 2)
 *   unit     : 값 뒤에 붙는 단위 (지수는 없음, 금·환율은 '원')
 * ═════════════════════════════════════════════════════════════════ */
export const MOCK_INDICES = [
  { name: '코스피', value: 2712.34, change: 18.22, rate: 0.68, decimals: 2, unit: '' },
  { name: '코스닥', value: 861.05, change: -4.13, rate: -0.48, decimals: 2, unit: '' },
  { name: '나스닥', value: 20143.22, change: 122.4, rate: 0.61, decimals: 2, unit: '' },
  { name: 'S&P 500', value: 6012.88, change: -8.31, rate: -0.14, decimals: 2, unit: '' },
  // 금은 KRX 금시장 기준 1g 가격입니다.
  { name: '금', value: 128400, change: 540, rate: 0.42, decimals: 0, unit: '원' },
  // 원/달러 환율.
  { name: '달러', value: 1382.5, change: -4.2, rate: -0.3, decimals: 2, unit: '원' },
];

/* ═══════════════════════════════════════════════════════════════════
 * 인기 검색어 — 헤더 티커
 *
 * 🔴 완전한 더미입니다. 검색 로그를 쌓는 곳이 아직 없습니다.
 *
 * 이걸 실제로 만들려면 백엔드에 두 가지가 필요합니다 (Doc/17 §12-2)
 *   ① 사용자가 검색할 때마다 검색어를 기록하는 테이블
 *   ② 최근 N시간 집계해서 상위를 돌려주는 엔드포인트 (예: GET /api/search/trending)
 * 둘 다 없으므로 당분간은 이 목록이 고정입니다.
 *
 * delta : 직전 집계 대비 순위 변동 (양수=상승, 0=유지, null=신규)
 * ═════════════════════════════════════════════════════════════════ */
export const MOCK_SEARCH_KEYWORDS = [
  { rank: 1, keyword: '삼성전자', delta: 0 },
  { rank: 2, keyword: 'SK하이닉스', delta: 2 },
  { rank: 3, keyword: '에코프로', delta: -1 },
  { rank: 4, keyword: 'LG에너지솔루션', delta: 1 },
  { rank: 5, keyword: '카카오', delta: -2 },
  { rank: 6, keyword: '현대차', delta: null },
  { rank: 7, keyword: '셀트리온', delta: 3 },
  { rank: 8, keyword: 'NAVER', delta: -1 },
];

/* ═══════════════════════════════════════════════════════════════════
 * 실시간 랭킹 3열
 *
 * 어떤 순위를 고를지는 Doc/17 §3 에 근거를 적어 두었습니다.
 * 다른 순위로 바꾸려면 이 배열의 항목만 교체하면 화면은 그대로 동작합니다.
 * ═════════════════════════════════════════════════════════════════ */
export const MOCK_RANKINGS = [
  {
    key: 'value',
    title: '거래대금 상위',
    hint: '오늘 돈이 가장 많이 몰린 종목',
    api: 'KIS 거래량순위 (volume-rank / FHPST01710000, 거래대금 구분)',
    items: [
      { rank: 1, code: '005930', name: '삼성전자', price: 74800, rate: 1.22, sub: '1.82조' },
      { rank: 2, code: '000660', name: 'SK하이닉스', price: 208500, rate: 3.47, sub: '1.34조' },
      { rank: 3, code: '373220', name: 'LG에너지솔루션', price: 385000, rate: -1.03, sub: '6,820억' },
      { rank: 4, code: '005380', name: '현대차', price: 241500, rate: 0.62, sub: '4,150억' },
      { rank: 5, code: '035420', name: 'NAVER', price: 187600, rate: -2.14, sub: '3,470억' },
    ],
  },
  {
    key: 'gainers',
    title: '급상승',
    hint: '어제보다 많이 오른 종목',
    api: 'KIS 등락률순위 (fluctuation 계열)',
    items: [
      { rank: 1, code: '096770', name: 'SK이노베이션', price: 128900, rate: 12.4, sub: '+14,200원' },
      { rank: 2, code: '068270', name: '셀트리온', price: 196300, rate: 8.15, sub: '+14,800원' },
      { rank: 3, code: '000660', name: 'SK하이닉스', price: 208500, rate: 3.47, sub: '+7,000원' },
      { rank: 4, code: '051910', name: 'LG화학', price: 412000, rate: 2.88, sub: '+11,500원' },
      { rank: 5, code: '005930', name: '삼성전자', price: 74800, rate: 1.22, sub: '+900원' },
    ],
  },
  {
    key: 'popular',
    title: '인기 종목',
    hint: '거래가 가장 활발한 종목',
    api: 'KIS 거래량순위 (volume-rank / FHPST01710000, 거래량 구분)',
    items: [
      { rank: 1, code: '005930', name: '삼성전자', price: 74800, rate: 1.22, sub: '2,431만주' },
      { rank: 2, code: '035720', name: '카카오', price: 41250, rate: 0.85, sub: '1,872만주' },
      { rank: 3, code: '000660', name: 'SK하이닉스', price: 208500, rate: 3.47, sub: '843만주' },
      { rank: 4, code: '035420', name: 'NAVER', price: 187600, rate: -2.14, sub: '512만주' },
      { rank: 5, code: '005380', name: '현대차', price: 241500, rate: 0.62, sub: '388만주' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════
 * 뉴스 — 홈 하단
 * 필요 API: GET /api/news/market  (이미 존재, F-16 에서 연동)
 * ⚠️ 실제 응답에는 { title, url, date } 만 있고 요약·썸네일이 없습니다.
 *    아래 summary 는 백엔드 확장이 필요한 항목입니다. (Doc/17 §5)
 * ═════════════════════════════════════════════════════════════════ */
export const MOCK_NEWS = [
  {
    id: 1,
    title: '반도체 수출 호조에 3분기 성장률 상향… 속보치보다 0.2%p↑',
    summary:
      '반도체 수출이 예상보다 크게 늘면서 3분기 경제성장률이 속보치보다 0.2%포인트 높아졌다. 한국은행은 설비투자 회복도 함께 나타났다고 밝혔다.',
    source: '연합뉴스',
    time: '32분 전',
  },
  {
    id: 2,
    title: '"AI 전환 가속"… 대기업 3곳 중 2곳, 내년 IT 예산 늘린다',
    summary:
      '국내 대기업의 63%가 내년 IT 예산을 올해보다 늘릴 계획인 것으로 나타났다. 인공지능 인프라 투자가 증가분의 대부분을 차지했다.',
    source: '디지털타임스',
    time: '1시간 전',
  },
  {
    id: 3,
    title: '2차전지株 반등… 유럽 전기차 보조금 재개 기대감',
    summary:
      '유럽 주요국이 전기차 보조금을 다시 늘릴 것이라는 관측에 2차전지 관련주가 일제히 상승 마감했다.',
    source: '한국경제',
    time: '2시간 전',
  },
];

/* ═══════════════════════════════════════════════════════════════════
 * 커뮤니티 — 홈 하단 + 커뮤니티 페이지
 * 필요 API: GET /api/community/posts  (이미 존재, F-17 에서 연동)
 * ═════════════════════════════════════════════════════════════════ */
export const MOCK_POSTS = [
  {
    id: 1,
    title: '처음 시작하는데 어떤 종목부터 봐야 할까요?',
    author: '초보투자자',
    symbol: null,
    time: '12분 전',
    likes: 8,
    comments: 5,
  },
  {
    id: 2,
    title: '삼성전자 지금이 매수 타이밍일까요? 의견 궁금합니다',
    author: '가치투자중',
    symbol: '005930',
    time: '48분 전',
    likes: 24,
    comments: 17,
  },
  {
    id: 3,
    title: '분산투자 비중 어떻게 나누시나요',
    author: '월급개미',
    symbol: null,
    time: '2시간 전',
    likes: 15,
    comments: 9,
  },
  {
    id: 4,
    title: 'PER 개념 이제야 이해했습니다… 도움말 기능 좋네요',
    author: '공부중',
    symbol: null,
    time: '3시간 전',
    likes: 31,
    comments: 6,
  },
];
