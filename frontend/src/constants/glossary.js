/**
 * 투자 용어집 (F-9) ★
 *
 * 발표에서 약속한 핵심 기능이고, 백엔드 없이 프론트만으로 완성됩니다.
 * 화면 곳곳의 어려운 용어 옆에 <HelpIcon termId="..." /> 를 붙여 쓰세요.
 *
 * 작성 원칙
 *  - 초보자가 읽는다고 가정합니다. 설명 안에서 또 다른 어려운 용어를 쓰지 않습니다.
 *  - desc 는 두 문장 이내. example 은 숫자가 들어간 구체적인 예.
 *  - related 로 이어지는 용어를 연결해 두면 팝오버에서 바로 타고 넘어갑니다.
 *  - aliases 는 선택 항목으로, 같은 뜻의 표기·약칭만 넣습니다. OCR과 사전 검색에서 재사용합니다.
 *
 * 나중에 GET /api/learn/glossary 가 생기면 이 파일을 useGlossary(termId) 훅으로
 * 바꾸면 되고, 화면 쪽 <HelpIcon /> 코드는 손대지 않아도 됩니다.
 */

export const CATEGORIES = {
  basic: '기초',
  price: '시세 · 차트',
  order: '주문 · 체결',
  asset: '계좌 · 자산',
  metric: '투자지표',
  risk: '위험 관리',
  event: '시장 이벤트',
};

export const GLOSSARY = {
  /* ---------------------------------------------------------------- 기초 */
  stock: {
    term: '주식',
    category: 'basic',
    desc: '회사의 소유권을 잘게 나눈 증서예요. 주식을 사면 그 회사의 아주 작은 주인이 됩니다.',
    example: '삼성전자 주식 10주 = 삼성전자라는 회사의 지분을 10주만큼 갖고 있다는 뜻',
    related: ['shareholder', 'market_cap'],
  },
  shareholder: {
    term: '주주',
    category: 'basic',
    desc: '주식을 갖고 있는 사람이에요. 회사가 번 돈의 일부를 배당으로 받을 수 있어요.',
    example: '1주만 갖고 있어도 주주입니다.',
    related: ['stock', 'dividend'],
  },
  kospi: {
    term: '코스피',
    category: 'basic',
    desc: '우리나라 대표 기업들이 모여 있는 주식시장이에요. 시장 전체가 오르내리는 정도를 숫자로 나타낸 것을 코스피 지수라고 합니다.',
    example: '삼성전자, SK하이닉스, 현대차 같은 큰 회사들이 코스피에 있어요.',
    related: ['kosdaq', 'market_cap'],
  },
  kosdaq: {
    term: '코스닥',
    category: 'basic',
    desc: '성장 중인 중소·벤처기업이 주로 상장된 시장이에요. 코스피보다 가격이 크게 움직이는 편입니다.',
    example: '바이오, 게임, IT 기업이 많아요.',
    related: ['kospi', 'volatility'],
  },
  listing: {
    term: '상장',
    category: 'basic',
    desc: '회사 주식을 시장에서 누구나 사고팔 수 있게 등록하는 일이에요.',
    example: '비상장 주식은 상장시장과 다른 장외 거래 제도·위험을 확인해야 합니다.',
    related: ['stock', 'kospi'],
  },
  market_cap: {
    term: '시가총액',
    category: 'basic',
    desc: '해당 주식의 시장 가치 합계예요. 주가에 해당 주식 수를 곱하며 부채 등을 반영한 기업가치와는 구분합니다.',
    example: '주가 7만원 × 60억주 = 시가총액 420조원',
    related: ['stock', 'per'],
  },
  symbol_code: {
    term: '종목코드',
    category: 'basic',
    desc: '종목을 구분하기 위한 식별 코드예요. 이름이 비슷한 회사를 구분할 때 씁니다.',
    example: '삼성전자 = 005930, SK하이닉스 = 000660',
    related: ['stock'],
  },
  trading: {
    term: '트레이딩', aliases: ['Trading'], category: 'basic',
    desc: '주식 같은 금융상품을 사고파는 거래를 말해요. 화면의 트레이딩 메뉴에서는 시세를 보고 매수·매도 주문을 낼 수 있어요.',
    example: '1주를 사고 나중에 그 1주를 파는 것도 트레이딩이에요.',
    related: ['buy', 'sell', 'order'],
  },
  etf: {
    term: 'ETF (상장지수펀드)', aliases: ['Exchange Traded Fund'], category: 'basic',
    desc: '거래소에 상장되어 주식처럼 사고팔 수 있는 펀드예요. 지수 등을 따르거나 정해진 전략으로 운용하며, 상품에 따라 투자 대상과 손실 위험이 달라요.',
    example: '주가지수를 따르는 ETF 1주를 사면 그 펀드가 운용하는 자산에 간접 투자해요.',
    related: ['stock', 'portfolio', 'volatility'],
  },
  ipo: {
    term: 'IPO (기업공개)', aliases: ['Initial Public Offering'], category: 'basic',
    desc: '기업이 처음으로 일반 투자자에게 주식을 공개적으로 파는 과정이에요. 거래소에 주식을 등록하는 상장과는 구분해요.',
    example: '회사가 처음 공모로 주식을 모집한 뒤 상장하면 거래소에서 그 주식을 거래할 수 있어요.',
    related: ['listing', 'stock'],
  },

  /* ---------------------------------------------------------- 시세·차트 */
  current_price: {
    term: '현재가',
    aliases: ['주가'],
    category: 'price',
    desc: '조회한 최근 체결가격이에요. 시세 지연이나 장 종료 여부에 따라 지금 거래할 수 있는 가격과 다를 수 있습니다.',
    example: '현재가 75,000원 = 방금 75,000원에 거래가 체결됐다는 뜻',
    related: ['open_price', 'close_price'],
  },
  open_price: {
    term: '시가',
    category: 'price',
    desc: '그날 장이 열리고 처음 체결된 가격이에요.',
    example: '오전 9시에 처음 거래된 가격이 시가입니다.',
    related: ['close_price', 'candle'],
  },
  close_price: {
    term: '종가',
    category: 'price',
    desc: '그날 장이 끝날 때의 마지막 가격이에요. 뉴스에서 "오늘 주가"라고 하면 보통 종가입니다.',
    example: '오후 3시 30분 장 마감 시점의 가격',
    related: ['open_price', 'candle'],
  },
  high_low: {
    term: '고가 · 저가',
    category: 'price',
    desc: '하루 동안 가장 비쌌던 가격과 가장 쌌던 가격이에요.',
    example: '고가 76,000원 / 저가 74,500원 → 하루에 1,500원 폭으로 움직였다는 뜻',
    related: ['candle', 'volatility'],
  },
  change_rate: {
    term: '등락률',
    category: 'price',
    desc: '직전 거래일 종가와 비교해 오늘 가격이 몇 % 움직였는지예요. 빨강은 상승, 파랑은 하락입니다.',
    example: '어제 70,000원 → 오늘 73,500원이면 등락률 +5.0%',
    related: ['prev_close', 'current_price'],
  },
  prev_close: {
    term: '전일대비',
    category: 'price',
    desc: '직전 거래일 종가에서 얼마나 오르거나 내렸는지를 금액으로 나타낸 값이에요.',
    example: '전일대비 +3,500원 = 직전 거래일보다 3,500원 비싸졌다는 뜻',
    related: ['change_rate'],
  },
  upper_limit: {
    term: '상한가 · 하한가',
    category: 'price',
    desc: '일반 국내 상장주식의 일일 가격제한폭은 기준가격 대비 ±30%예요. 현재가 기준이 아니며 신규상장 등에는 별도 규칙이 적용됩니다.',
    example: '일반 주식의 기준가격이 10,000원이면 상한가 13,000원, 하한가 7,000원입니다.',
    related: ['volatility', 'circuit_breaker'],
  },
  volume: {
    term: '거래량',
    category: 'price',
    desc: '해당 기간 체결된 주식 수예요. 거래량만으로 매수세·주가 방향·투자 가치를 단정할 수 없습니다.',
    example: '거래량 1,500만주 = 그날 1,500만 주가 손바뀜했다는 뜻',
    related: ['trading_value', 'liquidity'],
  },
  trading_value: {
    term: '거래대금',
    category: 'price',
    desc: '해당 기간의 각 체결가격 × 체결수량을 모두 합한 금액이에요. 현재가에 하루 거래량을 곱한 값과는 다를 수 있습니다.',
    example: '거래량 100만주 × 평균 7만원 = 거래대금 700억원',
    related: ['volume'],
  },
  candle: {
    term: '캔들차트',
    aliases: ['캔들 차트', '봉차트'],
    category: 'price',
    desc: '한 봉의 기간에 해당하는 시가·종가·고가·저가를 나타내요. 일반적인 국내 표시에서 빨강은 종가가 시가보다 높고 파랑은 낮음을 뜻하며 전일대비와 다를 수 있습니다.',
    example: '몸통은 시가~종가 구간, 위아래 꼬리는 고가·저가를 뜻해요.',
    related: ['open_price', 'close_price', 'moving_average'],
  },
  moving_average: {
    term: '이동평균선',
    aliases: ['이평선'],
    category: 'price',
    desc: '최근 며칠간 종가의 평균을 이어 그린 선이에요. 들쭉날쭉한 가격에서 큰 흐름만 보려고 씁니다.',
    example: '20일선 = 최근 20일 종가의 평균을 매일 이어 그린 선',
    related: ['candle'],
  },
  week52: {
    term: '52주 최고 · 최저',
    category: 'price',
    desc: '최근 1년 동안의 가장 높은 가격과 가장 낮은 가격이에요. 현재 가격의 과거 범위 내 위치를 보며 기업 가치 대비 고평가 여부는 별도 분석이 필요합니다.',
    example: '52주 최고 9만원 / 최저 5만원인데 지금 8만 8천원이면 1년 중 비싼 구간',
    related: ['high_low'],
  },
  liquidity: {
    term: '유동성',
    category: 'price',
    desc: '원할 때 원하는 가격에 사고팔기 쉬운 정도예요. 거래량이 적으면 팔고 싶어도 안 팔릴 수 있어요.',
    example: '거래량이 하루 몇백 주뿐인 종목은 유동성이 낮습니다.',
    related: ['volume', 'slippage'],
  },
  chart: {
    term: '차트', aliases: ['Chart'], category: 'price',
    desc: '주가나 거래량 등의 변화를 그림으로 나타낸 것이에요. 가로축의 시간과 세로축의 가격 등 표시 기준을 함께 확인해요.',
    example: '하루씩 가격을 표시한 차트에서 최근 20일의 움직임을 볼 수 있어요.',
    related: ['candle', 'volume'],
  },
  bullish_candle: {
    term: '양봉', category: 'price',
    desc: '한 봉의 종가가 시가보다 높은 캔들이에요. 전날 종가보다 올랐다는 뜻은 아니며 색상은 화면 설정에 따라 달라요.',
    example: '시가 10,000원, 종가 10,500원이면 양봉이에요.',
    related: ['bearish_candle', 'candle'],
  },
  bearish_candle: {
    term: '음봉', category: 'price',
    desc: '한 봉의 종가가 시가보다 낮은 캔들이에요. 전날 종가보다 내렸다는 뜻과는 달라요.',
    example: '시가 10,000원, 종가 9,500원이면 음봉이에요.',
    related: ['bullish_candle', 'candle'],
  },
  price_rise: {
    term: '상승', category: 'price',
    desc: '주가나 지수가 비교 기준보다 오른 상태예요. 전일 종가와 비교하는지 등 기준을 확인해요.',
    example: '기준가격 10,000원에서 10,500원이면 500원 상승이에요.',
    related: ['price_fall', 'change_rate'],
  },
  price_fall: {
    term: '하락', category: 'price',
    desc: '주가나 지수가 비교 기준보다 내려간 상태예요. 차트의 봉 색과 전일 대비 하락은 기준이 다를 수 있어요.',
    example: '기준가격 10,000원에서 9,500원이면 500원 하락이에요.',
    related: ['price_rise', 'change_rate'],
  },
  daily_candle: {
    term: '일봉', category: 'price',
    desc: '하나의 봉에 하루의 시가·고가·저가·종가를 담은 차트 표시예요. 오늘 봉은 장이 끝나기 전까지 바뀔 수 있어요.',
    example: '일봉 20개는 보통 20거래일의 움직임을 나타내요.', related: ['candle', 'weekly_candle'],
  },
  weekly_candle: {
    term: '주봉', category: 'price',
    desc: '하나의 봉에 한 주의 첫 가격·최고가·최저가·마지막 가격을 담은 표시예요.',
    example: '주봉 4개는 약 4주의 가격 움직임이에요.', related: ['daily_candle', 'monthly_candle'],
  },
  monthly_candle: {
    term: '월봉', category: 'price',
    desc: '하나의 봉에 한 달의 첫 가격·최고가·최저가·마지막 가격을 담은 표시예요.',
    example: '월봉 12개는 12개월의 움직임을 나타내요.', related: ['daily_candle', 'weekly_candle'],
  },
  rsi: {
    term: 'RSI (상대강도지수)', category: 'price',
    desc: '최근 가격의 상승 폭과 하락 폭을 비교해 0~100으로 나타낸 지표예요. 값이 높거나 낮다는 이유만으로 다음 가격 방향을 확정할 수 없어요.',
    example: 'RSI 70은 최근 상승 움직임이 강했다는 해석에 쓰지만 즉시 하락한다는 뜻은 아니에요.', related: ['chart', 'volatility'],
  },
  macd: {
    term: 'MACD', category: 'price',
    desc: '기간이 다른 두 이동평균의 차이로 추세 변화를 살피는 지표예요. 신호가 늦게 나타나거나 자주 뒤바뀔 수 있어요.',
    example: '흔한 설정에서는 12기간과 26기간 지수이동평균의 차이를 봐요.', related: ['moving_average', 'chart'],
  },

  /* --------------------------------------------------------- 주문·체결 */
  buy: {
    term: '매수',
    aliases: ['Buy'],
    category: 'order',
    desc: '주식을 사는 것이에요. 주문을 넣으면 조건이 맞을 때 체결됩니다.',
    example: '삼성전자 10주 매수 = 삼성전자 주식 10주를 사겠다는 주문',
    related: ['sell', 'execution'],
  },
  sell: {
    term: '매도',
    aliases: ['Sell'],
    category: 'order',
    desc: '주식을 파는 거래예요. 이 사이트의 현금주식 매도는 보유 수량 안에서만 가능합니다. 차입한 주식의 공매도는 별도 거래입니다.',
    example: '10주를 갖고 있으면 최대 10주까지 매도 주문을 낼 수 있어요.',
    related: ['buy', 'hold_quantity'],
  },
  limit_order: {
    term: '지정가 주문',
    aliases: ['지정가', 'Limit Order'],
    category: 'order',
    desc: '매수는 지정가 이하, 매도는 지정가 이상에서 거래하도록 가격 조건을 정하는 주문이에요. 조건이 맞아도 대기 순서와 물량에 따라 체결되지 않을 수 있습니다.',
    example: '10,000원 지정가 매수는 10,000원 이하 매도 물량과 거래할 수 있지만 체결을 보장하지 않습니다.',
    related: ['market_order', 'pending_order'],
  },
  market_order: {
    term: '시장가 주문',
    aliases: ['시장가', 'Market Order'],
    category: 'order',
    desc: '가격을 지정하지 않는 주문이에요. 상대 주문 물량과 가격에 따라 여러 가격에 체결되거나 체결되지 않을 수 있습니다.',
    example: '10,000원 2주와 10,100원 2주에 체결되면 평균 체결가는 10,050원입니다.',
    related: ['limit_order', 'slippage'],
  },
  order_book: {
    term: '호가',
    category: 'order',
    desc: '지금 사겠다는 사람과 팔겠다는 사람이 부른 가격 목록이에요. 매수 호가와 매도 호가가 만나면 거래가 성사됩니다.',
    example: '매도 1호가 75,100원 / 매수 1호가 75,000원 → 100원 차이에서 눈치싸움 중',
    related: ['tick_size', 'execution'],
  },
  tick_size: {
    term: '호가 단위',
    category: 'order',
    desc: '주문 가격을 올리고 내릴 수 있는 최소 간격이에요. 가격대마다 다릅니다.',
    example: '5만원짜리 주식은 100원 단위 → 75,050원 주문은 낼 수 없어요.',
    related: ['order_book'],
  },
  execution: {
    term: '체결',
    category: 'order',
    desc: '주문이 실제 거래로 성사된 상태예요. 체결과 대금 결제는 다르며 실제 국내주식은 T+2 영업일에 결제합니다.',
    example: '"체결" 상태 = 거래 완료, "미체결" = 아직 기다리는 중',
    related: ['pending_order', 'order_book'],
  },
  pending_order: {
    term: '미체결',
    category: 'order',
    desc: '주문은 넣었지만 아직 거래가 이뤄지지 않은 상태예요. 취소할 수 있습니다.',
    example: '지정가를 시세보다 너무 낮게 걸면 계속 미체결로 남아요.',
    related: ['execution', 'limit_order'],
  },
  cancel_order: {
    term: '주문 취소',
    category: 'order',
    desc: '아직 체결되지 않은 주문을 물리는 일이에요. 이미 체결된 주문은 취소할 수 없어요.',
    example: '미체결 주문 목록에서 취소 버튼을 누릅니다.',
    related: ['pending_order'],
  },
  fee: {
    term: '수수료 · 거래세',
    category: 'order',
    desc: '수수료는 증권사·매체별 요율로 매수·매도 체결대금에 부과합니다. 일반 과세 주식의 매도에는 이익 여부와 관계없이 거래세 등이 부과됩니다. ETF 등은 과세 방식이 다릅니다.',
    example: '사이트 코스피 일반주식 100만원 매도: 수수료 150원 + 거래세 500원 + 농특세 1,500원 (2026년 기준).',
    related: ['realized_pnl'],
  },
  slippage: {
    term: '슬리피지',
    category: 'order',
    desc: '주문을 낼 때 본 가격과 실제 체결된 가격의 차이예요. 거래가 적은 종목일수록 커집니다.',
    example: '75,000원에 살 생각이었는데 75,300원에 체결되면 300원이 슬리피지',
    related: ['market_order', 'liquidity'],
  },
  order: {
    term: '주문', category: 'order',
    desc: '주식을 사고팔겠다고 수량과 가격 조건 등을 전달하는 일이에요. 주문을 냈다고 반드시 거래가 이루어지는 것은 아니에요.',
    example: '10,000원에 3주를 사겠다고 지정가 매수 주문을 내요.', related: ['execution', 'pending_order'],
  },
  order_quantity: {
    term: '주문수량', category: 'order',
    desc: '사거나 팔겠다고 주문에 적은 주식 수예요. 실제 체결된 수량과 다를 수 있어요.',
    example: '10주를 주문하고 4주만 체결되면 남은 6주는 미체결일 수 있어요.', related: ['hold_quantity', 'execution'],
  },
  favorable_limit: {
    term: '최유리지정가', aliases: ['최유리 지정가'], category: 'order',
    desc: '주문 접수 시 매수는 가장 낮은 매도 호가, 매도는 가장 높은 매수 호가를 가격으로 정하는 주문이에요. 이후 호가를 계속 따라가지는 않아요.',
    example: '매수 접수 때 가장 낮은 매도 호가가 10,100원이면 그 가격의 지정가로 접수돼요.', related: ['limit_order', 'order_book'],
  },
  priority_limit: {
    term: '최우선지정가', aliases: ['최우선 지정가'], category: 'order',
    desc: '주문 접수 시 매수는 가장 높은 매수 호가, 매도는 가장 낮은 매도 호가를 가격으로 정하는 주문이에요. 체결을 보장하지 않아요.',
    example: '가장 높은 매수 호가가 10,000원이면 최우선지정가 매수는 그 가격으로 접수돼요.', related: ['favorable_limit', 'order_book'],
  },
  midpoint: {
    term: '중간가', category: 'order',
    desc: '가장 높은 매수 호가와 가장 낮은 매도 호가의 중간 가격이에요. 현재가와 다를 수 있고 체결도 보장하지 않아요.',
    example: '매수 호가 9,900원과 매도 호가 10,100원의 중간가는 10,000원이에요.', related: ['order_book', 'current_price'],
  },

  /* ---------------------------------------------------------- 계좌·자산 */
  deposit: {
    term: '예수금',
    category: 'asset',
    desc: '계좌의 현금 잔액이에요. 결제 예정 대금·주문 증거금·채무 등에 따라 주문가능금액과 출금가능금액은 다를 수 있습니다.',
    example: '결제 전 매수대금이 있으면 표시된 현금 전부를 출금할 수 있는 것은 아닙니다.',
    related: ['orderable_cash', 'total_asset'],
  },
  orderable_cash: {
    term: '주문가능금액',
    aliases: ['매수가능금액'],
    category: 'asset',
    desc: '계좌 증거금 정책·미체결 주문·매도대금 재사용 등을 반영한 주문 가능 금액이에요. 비용 포함 필요액과 결제일까지 준비할 돈도 확인해야 합니다.',
    example: '비용을 제외한 현금 전액 확보 예시: 현금 100만원 중 주문에 30만원을 확보하면 남은 예산은 70만원입니다.',
    related: ['deposit', 'pending_order'],
  },
  avg_price: {
    term: '평균단가',
    aliases: ['평균매수가', '평균매입가', '평단가'],
    category: 'asset',
    desc: '내가 그 종목을 산 평균 가격이에요. 여러 번 나눠 샀다면 전부 합쳐서 평균을 냅니다.',
    example: '1만원에 10주 + 2만원에 10주 → 평균단가 1만 5천원',
    related: ['buy_amount', 'eval_pnl'],
  },
  hold_quantity: {
    term: '보유수량',
    category: 'asset',
    desc: '지금 갖고 있는 주식 수예요. 이 수량 안에서만 팔 수 있습니다.',
    example: '보유수량 10주 → 최대 10주까지 매도 가능',
    related: ['sell', 'avg_price'],
  },
  buy_amount: {
    term: '매입금액',
    category: 'asset',
    desc: '보유 주식을 매수하는 데 사용한 거래금액으로 평균 매수가 × 보유수량입니다. 이 사이트는 수수료·세금을 제외합니다.',
    example: '평균단가 1만원 × 10주 = 매입금액 10만원',
    related: ['eval_amount', 'avg_price'],
  },
  eval_amount: {
    term: '평가금액',
    category: 'asset',
    desc: '지금 시세로 계산한 내 주식의 가치예요. 현재가 × 보유수량입니다.',
    example: '현재가 1만 2천원 × 10주 = 평가금액 12만원',
    related: ['buy_amount', 'eval_pnl'],
  },
  eval_pnl: {
    term: '평가손익',
    category: 'asset',
    desc: '아직 팔지 않은 주식에서 생긴 이익이나 손실이에요. 평가금액에서 매입금액을 뺀 값입니다.',
    example: '평가금액 12만원 - 매입금액 10만원 = 평가손익 +2만원',
    related: ['realized_pnl', 'return_rate'],
  },
  realized_pnl: {
    term: '실현손익',
    category: 'asset',
    desc: '주식 매도 순수령액에서 매도 수량에 배분한 매입원가를 뺀 손익이에요. 선물의 일일정산처럼 다른 상품에는 다른 정산 구조가 적용됩니다.',
    example: '매수대금 10만원, 매도대금 12만원이면 비용 차감 전 가격차익은 2만원입니다.',
    related: ['eval_pnl', 'fee'],
  },
  return_rate: {
    term: '수익률',
    category: 'asset',
    desc: '투자한 돈 대비 얼마를 벌거나 잃었는지를 %로 나타낸 값이에요.',
    example: '100만원 넣어서 10만원을 벌면 수익률 +10%',
    related: ['eval_pnl'],
  },
  total_asset: {
    term: '총자산',
    category: 'asset',
    desc: '현금과 보유자산 평가액 등의 합계예요. 결제 예정 대금은 중복 합산하지 않으며 미수금·융자금이 있으면 이를 차감한 순자산도 구분합니다.',
    example: '현금 500만원 + 주식 평가금액 700만원 = 총자산 1,200만원',
    related: ['deposit', 'eval_amount'],
  },
  portfolio: {
    term: '포트폴리오',
    category: 'asset',
    desc: '내가 갖고 있는 종목들의 묶음이에요. 무엇을 얼마나 갖고 있는지 한눈에 보는 구성입니다.',
    example: '삼성전자 40%, 현대차 30%, 현금 30% 같은 구성',
    related: ['diversification', 'rebalancing'],
  },
  pnl: {
    term: '손익', category: 'asset',
    desc: '거래나 보유자산에서 생긴 이익 또는 손실이에요. 아직 팔지 않은 평가손익인지, 판 뒤의 실현손익인지 구분해요.',
    example: '10만원에 사서 11만원에 팔았다면 비용 차감 전 손익은 +1만원이에요.', related: ['eval_pnl', 'realized_pnl'],
  },
  margin: {
    term: '증거금', aliases: ['위탁증거금', '주문증거금'], category: 'asset',
    desc: '주문을 이행하기 위해 먼저 확보하는 돈이나 담보예요. 필요한 비율은 증권사·종목에 따라 다르며 나머지 대금도 결제일까지 준비해야 해요.',
    example: '100만원 주문에 증거금률이 50%라면 먼저 50만원이 필요하고, 나머지 50만원도 결제일까지 필요해요.', related: ['deposit', 'misu'],
  },
  misu: {
    term: '미수거래', aliases: ['미수'], category: 'asset',
    desc: '주식값 일부를 먼저 내고 나머지는 결제일까지 채우는 거래예요. 기한까지 돈이 부족하면 반대매매와 거래 제한 등이 생길 수 있어요.',
    example: '100만원어치를 사고 50만원만 냈다면 남은 50만원과 비용을 결제일까지 채워야 해요.', related: ['margin', 'forced_sale'],
  },
  misu_debt: {
    term: '미수금', category: 'asset',
    desc: '거래 대금이나 비용을 낼 때 계좌에 부족해 아직 내지 못한 금액이에요. 주가가 내려가도 갚아야 할 부족금이 함께 줄어드는 것은 아니에요.',
    example: '결제에 100만원이 필요한데 80만원만 준비했다면 부족한 20만원이 미수금이 될 수 있어요.', related: ['misu', 'settlement', 'forced_sale'],
  },
  credit_financing: {
    term: '신용융자', category: 'asset',
    desc: '증권사에서 주식 매수 자금을 빌리는 거래예요. 이자와 상환 기한, 담보 유지 조건이 있고 미수거래와는 달라요.',
    example: '빌린 돈 100만원에는 약정에 따른 이자가 붙고 기한 안에 갚아야 해요.', related: ['misu', 'forced_sale'],
  },
  forced_sale: {
    term: '반대매매', category: 'asset',
    desc: '미수금이나 담보 부족 등을 해소하기 위해 증권사가 정해진 조건에 따라 보유자산을 처분하는 것이에요. 팔아도 부족한 돈이 남을 수 있어요.',
    example: '갚을 돈이 50만원인데 주식 매도 후 40만원만 남으면 부족금 10만원이 남아요.', related: ['misu', 'credit_financing'],
  },
  settlement: {
    term: '결제', category: 'asset',
    desc: '체결된 거래의 주식과 대금을 실제로 주고받는 일이에요. 주문이 체결된 시점과 결제 시점은 다를 수 있어요.',
    example: '체결 내역을 확인한 뒤 결제일까지 필요한 매수대금을 준비해요.', related: ['execution', 'deposit'],
  },

  /* ------------------------------------------------------------ 투자지표 */
  per: {
    term: 'PER',
    aliases: ['주가수익비율'],
    category: 'metric',
    desc: '주가를 주당순이익(EPS)으로 나눈 값으로, 이익에 비해 주가가 비싼지 판단하는 지표예요.',
    example: '주가 10,000원 ÷ EPS 1,000원 = PER 10배입니다. 투자금 회수기간이나 배당을 보장하지 않습니다.',
    related: ['eps', 'pbr'],
  },
  pbr: {
    term: 'PBR',
    aliases: ['주가순자산비율'],
    category: 'metric',
    desc: '주가를 주당순자산(BPS)으로 나눈 값이에요. 1배 미만은 장부상 주당순자산보다 주가가 낮다는 뜻이며 저평가를 보장하지 않습니다.',
    example: '주가 40,000원 ÷ BPS 50,000원 = PBR 0.8배입니다.',
    related: ['bps', 'per'],
  },
  eps: {
    term: 'EPS (주당순이익)',
    category: 'metric',
    desc: '해당 기간 보통주에 귀속되는 순이익을 가중평균 보통주 수로 나눈 지표예요. 기본 EPS와 잠재 주식 증가를 반영한 희석 EPS를 구분합니다.',
    example: '순이익 100억원 ÷ 1,000만주 = EPS 1,000원',
    related: ['per', 'roe'],
  },
  bps: {
    term: 'BPS (주당순자산)',
    category: 'metric',
    desc: '회계상 순자산을 해당 주식 수로 나눈 지표예요. 실제 청산 때 주주가 받는 금액을 보장하지 않습니다.',
    example: 'BPS 5만원인데 주가가 4만원이면 PBR은 0.8배',
    related: ['pbr'],
  },
  roe: {
    term: 'ROE (자기자본이익률)',
    category: 'metric',
    desc: '순이익을 자기자본과 비교한 지표예요. 높아진 원인이 수익 증가인지, 부채 증가나 자기자본 감소인지 함께 확인합니다.',
    example: 'ROE 15% = 자기 돈 100원으로 1년에 15원을 벌었다는 뜻',
    related: ['eps'],
  },
  dividend: {
    term: '배당금',
    category: 'metric',
    desc: '회사가 번 이익의 일부를 주주에게 현금으로 나눠 주는 돈이에요.',
    example: '1주당 현금배당 1,000원 × 10주 = 세전 배당금 10,000원입니다.',
    related: ['dividend_yield', 'ex_dividend'],
  },
  dividend_yield: {
    term: '배당수익률',
    category: 'metric',
    desc: '주가 대비 주당 배당금의 비율이에요. 배당과 주가가 변할 수 있으며 예금처럼 원금이나 수익을 보장하지 않습니다.',
    example: '주가 5만원, 배당금 2,500원 → 배당수익률 5%',
    related: ['dividend'],
  },

  /* ------------------------------------------------------------ 위험관리 */
  volatility: {
    term: '변동성',
    category: 'risk',
    desc: '가격이 얼마나 크게 출렁이는지를 뜻해요. 변동성이 크면 많이 벌 수도, 많이 잃을 수도 있습니다.',
    example: '하루에 ±10%씩 움직이는 종목은 변동성이 매우 큽니다.',
    related: ['risk_profile', 'diversification'],
  },
  stop_loss: {
    term: '손절매',
    aliases: ['손절'],
    category: 'risk',
    desc: '손실을 감수하고 매도하는 행동이에요. 대응 기준을 정할 수 있지만 급변·유동성 부족 시 목표 가격의 체결을 보장하지 않습니다.',
    example: '"-10%가 되면 판다"고 정해 두고 지키는 것',
    related: ['take_profit', 'realized_pnl'],
  },
  take_profit: {
    term: '익절',
    category: 'risk',
    desc: '목표한 수익이 났을 때 파는 것이에요. 매도한 수량의 손익이 확정되며 보유 중 평가이익도 자산 가치의 일부입니다.',
    example: '"+20%가 되면 절반 판다" 같은 규칙',
    related: ['stop_loss', 'realized_pnl'],
  },
  averaging_down: {
    term: '물타기',
    category: 'risk',
    desc: '가격이 하락한 종목을 추가 매수해 평균단가를 낮추는 행동이에요. 회복을 보장하지 않으며 같은 종목에 대한 투자금과 추가 하락 시 손실 노출이 커집니다.',
    example: '2만원에 산 주식과 같은 수량을 1만원에 더 사면 비용 제외 평균단가는 1만 5천원입니다.',
    related: ['avg_price', 'diversification'],
  },
  diversification: {
    term: '분산투자',
    category: 'risk',
    desc: '여러 종목·업종·자산으로 위험을 나누는 것이에요. 비중과 상관관계를 함께 봐야 하며 시장 전체의 손실 가능성을 없애지는 못합니다.',
    example: '종목 수만 늘리기보다 같은 업황에 함께 반응하는지와 각 비중을 확인합니다.',
    related: ['portfolio', 'volatility'],
  },
  rebalancing: {
    term: '리밸런싱',
    category: 'risk',
    desc: '시간이 지나 비율이 틀어진 포트폴리오를 원래 계획대로 되돌리는 일이에요.',
    example: '주식:현금을 5:5로 정했는데 7:3이 되면 일부를 팔아 5:5로 맞춥니다.',
    related: ['portfolio', 'diversification'],
  },
  risk_profile: {
    term: '투자성향',
    category: 'risk',
    desc: '손실을 얼마나 견딜 수 있는지에 따라 나눈 투자자 유형이에요. 안정형부터 공격투자형까지 있습니다.',
    example: '원금 손실이 불편하면 안정형, 큰 수익을 위해 손실을 감수하면 공격투자형',
    related: ['volatility', 'diversification'],
  },
  long_term: {
    term: '장기투자',
    category: 'risk',
    desc: '몇 년 단위로 오래 갖고 가는 투자 방식이에요. 짧은 등락에 흔들리지 않는 것이 핵심입니다.',
    example: '좋은 회사를 사서 3년, 5년 들고 가는 방식',
    related: ['short_term', 'diversification'],
  },
  short_term: {
    term: '단기매매',
    category: 'risk',
    desc: '짧은 기간에 매수·매도하는 방식이에요. 잦은 거래의 누적 비용과 가격 변동·체결 위험을 함께 고려해야 합니다.',
    example: '오늘 사서 오늘 파는 것을 데이트레이딩이라고 해요.',
    related: ['long_term', 'fee'],
  },
  split_buy: {
    term: '분할매수', category: 'risk',
    desc: '사려는 수량이나 금액을 여러 번으로 나누어 사는 방법이에요. 가격 하락에 따른 손실 가능성을 없애 주지는 않아요.',
    example: '30주를 한 번에 사는 대신 10주씩 세 번에 나누어 사요.', related: ['buy', 'avg_price'],
  },
  split_sell: {
    term: '분할매도', category: 'risk',
    desc: '보유 주식을 여러 번으로 나누어 파는 방법이에요. 나중에 파는 가격은 처음과 다를 수 있어요.',
    example: '30주 중 10주를 먼저 팔고 남은 20주는 나중에 팔아요.', related: ['sell', 'realized_pnl'],
  },

  /* -------------------------------------------------------- 시장 이벤트 */
  ex_dividend: {
    term: '배당락',
    category: 'event',
    desc: '해당 배당을 받을 권리가 없는 상태로 거래되는 것을 말해요. 실제 주가 변화는 배당 외 시장 요인에도 영향을 받습니다.',
    example: '배당락일에 매수하면 해당 배당을 받을 수 없습니다. 주가가 배당금만큼 정확히 하락한다고 보장할 수 없습니다.',
    related: ['dividend'],
  },
  stock_split: {
    term: '액면분할',
    category: 'event',
    desc: '주식 1주를 여러 주로 쪼개는 일이에요. 분할 자체만으로 지분 가치가 늘지는 않으며 실제 거래가격은 시장에서 변할 수 있습니다.',
    example: '50만원 1주 → 5만원 10주 (총 50만원으로 같음)',
    related: ['stock'],
  },
  paid_increase: {
    term: '유상증자',
    category: 'event',
    desc: '회사가 새 주식을 팔아 돈을 모으는 일이에요. 주식 수가 늘어 기존 주주의 지분 가치는 옅어질 수 있어요.',
    example: '자금이 필요한 회사가 자주 씁니다.',
    related: ['free_increase', 'shareholder'],
  },
  free_increase: {
    term: '무상증자',
    category: 'event',
    desc: '회사가 주주에게 새 주식을 공짜로 나눠 주는 일이에요. 주식 수 증가에 따라 기준가격이 조정되며 실제 거래가격은 시장에서 달라질 수 있습니다.',
    example: '1주당 1주 무상증자 → 10주가 20주가 되고 주가는 절반으로',
    related: ['paid_increase', 'stock_split'],
  },
  short_selling: {
    term: '공매도',
    category: 'event',
    desc: '차입한 주식을 먼저 매도하고 이후 재매수해 반환하는 거래예요. 재매수가격이 낮으면 비용 전 차익이 생기지만 상승하면 손실이 커집니다.',
    example: '10만원에 매도하고 8만원에 재매수하면 차입비용·수수료·세금 전 차익은 2만원입니다.',
    related: ['volatility'],
  },
  circuit_breaker: {
    term: '서킷브레이커',
    category: 'event',
    desc: '시장이 너무 급하게 떨어질 때 거래를 잠시 멈추는 장치예요. 투자자가 진정할 시간을 줍니다.',
    example: '지수 하락률·지속시간 등 단계별 발동 조건을 충족하면 거래 중단 또는 당일 종료 조치가 적용됩니다.',
    related: ['vi', 'volatility'],
  },
  vi: {
    term: 'VI (변동성완화장치)',
    category: 'event',
    desc: '한 종목의 가격이 갑자기 튈 때 2분간 단일가로 바꿔 진정시키는 장치예요.',
    example: '직전 가격보다 급하게 움직이면 자동으로 발동합니다.',
    related: ['circuit_breaker', 'volatility'],
  },
  after_hours: {
    term: '시간외거래',
    category: 'event',
    desc: '정규시장 전후 정해진 시간에 별도 방식으로 거래하는 제도예요. 거래소·거래시간·주문 방식에 따라 조건이 다릅니다.',
    example: '종가로 거래하는 방식과 가격이 변하는 단일가 방식 등을 구분하고 해당 거래시간을 확인합니다.',
    related: ['close_price'],
  },
  /* Phase 1: eight verified investment terms. */
  seed_money: {
    "term": "시드머니",
    "aliases": [
      "종잣돈",
      "시드 머니"
    ],
    "category": "asset",
    "desc": "투자를 시작하기 위해 마련한 종잣돈이에요. Stockmaster에서는 모의투자를 시작할 때 정하는 가상 자금을 뜻해요.",
    "example": "모의계좌를 100만원으로 시작하면, 이 계좌의 시드머니는 가상 자금 100만원이에요.",
    "related": [
      "deposit",
      "total_asset",
      "portfolio"
    ]
  },
  principal: {
    "term": "원금",
    "category": "asset",
    "desc": "투자에 넣은 돈으로, 수익이나 손실을 계산할 때 기준이 되는 금액이에요. 원금이라고 해서 손실 없이 돌려받는다는 뜻은 아니에요.",
    "example": "100만원을 투자해 현재 가치가 90만원이라면, 처음 투자한 원금은 100만원이고 비용 차감 전 손실은 10만원이에요.",
    "related": [
      "return_rate",
      "eval_pnl",
      "total_asset"
    ]
  },
  margin_rate: {
    "term": "증거금률",
    "aliases": [
      "위탁증거금률",
      "위탁 증거금률"
    ],
    "category": "order",
    "desc": "주식 주문 금액 중 증거금으로 먼저 확보해야 하는 금액의 비율이에요. 종목·증권사·계좌 조건에 따라 다르며, 수수료 등은 별도로 필요할 수 있어요.",
    "example": "증거금률이 50%라는 가정에서 100만원을 주문하면 증거금은 50만원이에요. 수수료 등은 제외한 계산이에요.",
    "related": [
      "margin",
      "misu",
      "orderable_cash"
    ]
  },
  settlement_date: {
    "term": "결제일",
    "category": "order",
    "desc": "주식 거래로 주고받을 주식과 돈을 실제로 넘겨 거래의 의무를 마치는 날이에요. 주문이 체결된 날과 결제일은 다를 수 있어요.",
    "example": "T+2 규칙을 적용하고 휴장일이 없는 월요일에 거래했다면 수요일이 결제일이에요.",
    "related": [
      "settlement",
      "execution",
      "deposit"
    ]
  },
  misu_freeze: {
    "term": "미수동결",
    "aliases": [
      "미수동결계좌",
      "미수 동결",
      "미수 동결계좌"
    ],
    "category": "risk",
    "desc": "주식 결제대금을 제때 채우지 못했을 때 현금 증거금 100%를 요구해 미수 이용을 제한하는 제도예요. 원칙적으로 미수 발생 다음 날부터 30일간 적용하며, 소액 등 예외가 있어요.",
    "example": "A증권사에서 미수동결 대상이 되면 B증권사의 내 위탁계좌도 원칙적으로 30일간 현금 증거금 100%가 적용돼요. 사이트의 모의 규칙과는 구분해요.",
    "related": [
      "misu",
      "misu_debt",
      "margin",
      "forced_sale"
    ]
  },
  execution_price: {
    "term": "체결가",
    "aliases": [
      "체결가격",
      "체결 가격"
    ],
    "category": "order",
    "desc": "매수자와 매도자의 거래가 실제로 성립한 가격이에요. 주문 전에 본 현재가나 예상 가격과 다를 수 있어요.",
    "example": "주문 전에 본 현재가가 1만원이어도 실제 거래가 1만 10원에 성립했다면 체결가는 1만 10원이에요.",
    "related": [
      "execution",
      "current_price",
      "slippage"
    ]
  },
  order_book_quantity: {
    "term": "호가 잔량",
    "aliases": [
      "호가잔량"
    ],
    "category": "order",
    "desc": "호가창의 특정 가격에 대기 중인 매수·매도 주문 수량이에요. 이미 거래된 거래량과 다르고, 주문의 체결이나 취소로 바뀔 수 있어요.",
    "example": "매도호가 1만원에 100주가 대기하면 그 가격의 매도 잔량은 100주예요. 일부만 표시된 호가창이면 전체 주문량과 구분해요.",
    "related": [
      "order_book",
      "pending_order",
      "volume"
    ]
  },
  operating_profit: {
    "term": "영업이익",
    "aliases": [
      "영업 이익"
    ],
    "category": "metric",
    "desc": "기업이 주된 영업활동으로 번 이익이에요. 일반적인 계산은 매출액에서 매출원가와 판매·관리 비용을 뺀 값이며, 회사에 실제로 들어온 현금과는 달라요.",
    "example": "매출 100억원에서 매출원가 60억원과 판매·관리 비용 25억원을 빼면 영업이익은 15억원이에요.",
    "related": [
      "eps",
      "roe",
      "per"
    ]
  },
  /* Phase 2: reviewed investment glossary additions. */
  trading_day: {
    "term": "거래일",
    "category": "order",
    "desc": "해당 시장에서 실제로 매매가 이루어지는 날이에요. 휴장일을 빼고 세는 경우가 있으므로 달력의 날짜 수와 구분해요.",
    "example": "거래일 기준으로 다음 날이라고 하면, 중간에 휴장일이 있을 때 그날은 건너뛰어요.",
    "related": [
      "trading",
      "settlement_date"
    ]
  },
  sale_proceeds: {
    "term": "매도대금",
    "aliases": [
      "매도 대금"
    ],
    "category": "order",
    "desc": "주식을 팔아 받는 돈이에요. 비용 차감 전 거래금액인지 실제 받는 금액인지 구분하고, 은행 출금이 가능한 시점도 확인해요.",
    "example": "1,000원에 100주를 팔면 거래금액은 10만원이고, 비용이 500원이라면 받는 금액은 99,500원이에요.",
    "related": [
      "sell",
      "settlement_date",
      "fee",
      "deposit"
    ]
  },
  executed_quantity: {
    "term": "체결량",
    "aliases": [
      "체결 량"
    ],
    "category": "order",
    "desc": "표시된 체결 한 건이나 묶음에서 실제 거래된 주식 수예요. 하루 동안 쌓인 누적 거래량과 구분해요.",
    "example": "체결 내역 한 줄에 10주가 표시됐다면 그 줄의 체결량은 10주예요.",
    "related": [
      "execution",
      "volume",
      "order_quantity"
    ]
  },
  bid_quote: {
    "term": "매수호가",
    "aliases": [
      "매수 호가"
    ],
    "category": "order",
    "desc": "주식을 사려는 쪽이 제시한 가격이에요. 제시한 주문이 아직 거래로 성립하지 않았을 수 있어요.",
    "example": "9,900원에 사겠다는 주문의 매수호가는 9,900원이며, 이 가격에 반드시 체결되는 것은 아니에요.",
    "related": [
      "order_book",
      "buy",
      "execution_price"
    ]
  },
  ask_quote: {
    "term": "매도호가",
    "aliases": [
      "매도 호가"
    ],
    "category": "order",
    "desc": "주식을 팔려는 쪽이 제시한 가격이에요. 제시한 주문이 아직 거래로 성립하지 않았을 수 있어요.",
    "example": "1만원에 팔겠다는 주문의 매도호가는 1만원이며, 이 가격에 반드시 체결되는 것은 아니에요.",
    "related": [
      "order_book",
      "sell",
      "execution_price"
    ]
  },
  bid_quantity: {
    "term": "매수잔량",
    "aliases": [
      "매수 잔량"
    ],
    "category": "order",
    "desc": "아직 체결되지 않고 대기 중인 매수 주문 수량이에요. 특정 호가의 수량인지, 화면에 표시된 호가들의 합계인지 구분해요.",
    "example": "9,900원 매수호가에 100주가 대기 중이면 그 가격의 매수잔량은 100주예요.",
    "related": [
      "order_book_quantity",
      "pending_order",
      "buy"
    ]
  },
  ask_quantity: {
    "term": "매도잔량",
    "aliases": [
      "매도 잔량"
    ],
    "category": "order",
    "desc": "아직 체결되지 않고 대기 중인 매도 주문 수량이에요. 주문이 취소되거나 체결되면 달라질 수 있어요.",
    "example": "1만원 매도호가에 80주가 대기 중이면 그 가격의 매도잔량은 80주예요.",
    "related": [
      "order_book_quantity",
      "pending_order",
      "sell"
    ]
  },
  best_quote: {
    "term": "최우선호가",
    "aliases": [
      "최우선 호가"
    ],
    "category": "order",
    "desc": "현재 매수호가 중 가장 높은 가격, 매도호가 중 가장 낮은 가격을 가리켜요. 어느 쪽 호가인지 함께 확인해요.",
    "example": "가장 높은 매수 가격이 9,900원, 가장 낮은 매도 가격이 1만원이면 각각 최우선 매수호가와 매도호가예요.",
    "related": [
      "order_book",
      "priority_limit",
      "market_order"
    ]
  },
  paper_trading: {
    "term": "모의투자",
    "aliases": [
      "모의 투자"
    ],
    "category": "basic",
    "desc": "가상 자금으로 매매를 연습하는 방식이에요. 모의 성과가 실제 투자에서 같은 결과를 보장하지는 않아요.",
    "example": "가상 자금 100만원으로 10주를 매수해 봐도 실제 은행 계좌에서 돈이 빠져나가는 것은 아니에요.",
    "related": [
      "trading",
      "seed_money",
      "portfolio"
    ]
  },
  asset_allocation: {
    "term": "자산배분",
    "aliases": [
      "자산 배분"
    ],
    "category": "asset",
    "desc": "투자금을 주식·채권·현금 같은 서로 다른 자산 종류에 나누어 배치하는 것이에요. 같은 종류 안에서 여러 종목에 나누는 분산투자와 구분해 볼 수 있어요.",
    "example": "100만원을 주식 40만원과 현금 60만원으로 나누는 것도 자산배분의 예예요. 권장 비율을 뜻하지는 않아요.",
    "related": [
      "portfolio",
      "diversification",
      "rebalancing"
    ]
  },
  investment_weight: {
    "term": "투자 비중",
    "aliases": [
      "투자비중"
    ],
    "category": "asset",
    "desc": "전체 자산이나 투자금 중 특정 투자 대상이 차지하는 비율이에요. 현재 평가금액 기준인지 처음 투자한 금액 기준인지 확인해요.",
    "example": "평가금액 기준 총자산이 200만원이고 한 종목이 50만원이라면 그 종목의 비중은 25%예요.",
    "related": [
      "portfolio",
      "total_asset",
      "rebalancing"
    ]
  },
  bank_deposit: {
    "term": "예금",
    "category": "asset",
    "desc": "은행 등에 돈을 맡기고 약정에 따라 다시 찾는 금융 거래 또는 그 돈이에요. 이자·인출 조건은 상품마다 다르며 증권계좌의 예수금과는 구분해요.",
    "example": "은행 보통예금에 10만원을 넣는 것과 증권계좌 예수금으로 10만원을 보유하는 것은 구분해서 살펴봐요.",
    "related": [
      "deposit",
      "principal"
    ]
  },
  exchange_rate: {
    "term": "환율",
    "category": "asset",
    "desc": "서로 다른 통화를 바꿀 때의 교환 비율이에요. 실제 환전에는 거래 방향·수수료·적용 시점에 따라 다른 가격이 쓰일 수 있어요.",
    "example": "1달러가 1,300원이라는 가정에서 10달러는 비용을 빼기 전 13,000원이에요. 실제 현재 환율은 아니에요.",
    "related": [
      "total_asset",
      "return_rate"
    ]
  },
  sales_revenue: {
    "term": "매출",
    "aliases": [
      "매출액"
    ],
    "category": "metric",
    "desc": "기업이 상품이나 서비스를 판매해 얻은 금액이에요. 비용을 빼기 전의 금액으로, 이익이나 실제 현금 수입과 같지는 않아요.",
    "example": "1,000원짜리 상품 50개를 팔았다면 할인·반품 등이 없다는 가정에서 매출은 5만원이고, 비용은 별도로 계산해요.",
    "related": [
      "operating_profit",
      "eps",
      "roe"
    ]
  },
  simple_moving_average: {
    "term": "단순이동평균",
    "aliases": [
      "단순 이동평균",
      "단순이동평균선",
      "Simple Moving Average"
    ],
    "category": "price",
    "desc": "최근 정해진 개수의 값을 같은 비중으로 더해 평균을 내는 방식이에요. 주가에서는 종가 등의 평균 흐름을 보며, 과거 자료의 평균이므로 다음 가격을 보장하지 않아요.",
    "example": "최근 3일 종가가 1만원·1만 1천원·1만 2천원이면 3일 단순이동평균은 1만 1천원이에요.",
    "related": [
      "moving_average",
      "close_price",
      "chart"
    ]
  },
  ohlc_bar: {
    "term": "OHLC 바",
    "aliases": [
      "OHLC바"
    ],
    "category": "price",
    "desc": "한 기간의 시가·고가·저가·종가를 막대와 좌우 눈금으로 나타내는 차트예요. 보통 세로선은 저가부터 고가, 왼쪽 눈금은 시가, 오른쪽 눈금은 종가를 뜻해요.",
    "example": "시가 1만원·종가 1만 1천원인 봉은 왼쪽 눈금이 1만원, 오른쪽 눈금이 1만 1천원에 표시돼요.",
    "related": [
      "chart",
      "open_price",
      "high_low",
      "close_price"
    ]
  },
  heikin_ashi: {
    "term": "하이킨아시",
    "aliases": [
      "하이킨 아시",
      "Heikin Ashi"
    ],
    "category": "price",
    "desc": "현재와 이전의 가격을 평균 계산해 만드는 합성 캔들 차트예요. 표시된 시가·종가는 실제 체결가격과 다를 수 있어요.",
    "example": "시가 1만원·고가 1만 2천원·저가 9천원·종가 1만 1천원이면, 네 값을 평균한 하이킨아시 종가는 1만 500원이에요.",
    "related": [
      "candle",
      "open_price",
      "close_price",
      "execution_price"
    ]
  },
  renko_chart: {
    "term": "렌코",
    "aliases": [
      "렌코 차트",
      "렌코차트",
      "Renko chart"
    ],
    "category": "price",
    "desc": "설정한 가격 변화 폭을 기준으로 벽돌 모양을 추가하는 차트예요. 가로 간격이 같은 시간을 뜻하지 않으며 표시 가격은 실제 주문가격과 구분해요.",
    "example": "종가 기준으로 상승 중인 벽돌의 기준이 1만원이고 폭이 500원이라면, 다음 상승 벽돌은 1만 500원부터 만들 수 있어요. 반전 규칙은 따로 확인해요.",
    "related": [
      "chart",
      "close_price",
      "volatility"
    ]
  },
  line_chart: {
    "term": "선 차트",
    "aliases": [
      "선차트",
      "라인 차트",
      "라인차트",
      "Line chart"
    ],
    "category": "price",
    "desc": "각 기간의 종가 같은 대표값을 선으로 이어 나타내는 차트예요. 한 기간 안의 시가·고가·저가를 모두 보여주지는 않아요.",
    "example": "세 기간 종가가 1만원·1만 500원·1만 200원이면 그 세 점을 차례로 연결해요.",
    "related": [
      "chart",
      "close_price",
      "candle"
    ]
  },
  area_chart: {
    "term": "영역 차트",
    "aliases": [
      "영역차트",
      "Area chart"
    ],
    "category": "price",
    "desc": "선 차트의 가격선 아래 영역을 색으로 채운 차트예요. 색칠한 넓이 자체가 거래량이나 수익을 뜻하지는 않아요.",
    "example": "종가가 1만원에서 1만 1천원으로 움직인 선 아래를 채워 표시할 수 있지만, 그 넓이로 거래량을 계산하지는 않아요.",
    "related": [
      "chart",
      "close_price",
      "volume"
    ]
  },
  baseline_chart: {
    "term": "기준선 차트",
    "aliases": [
      "기준선차트",
      "Baseline chart"
    ],
    "category": "price",
    "desc": "기준 가격의 위아래를 선이나 영역의 색으로 구분하는 차트예요. Stockmaster는 조회 구간의 첫 종가를 기준으로 써서, 조회 기간을 바꾸면 기준도 바뀔 수 있어요.",
    "example": "구간의 첫 종가가 1만원이고 이후 가격이 9,500원이면 기준 아래로 표시돼요. 내 매입가 대비 손익과 같지는 않아요.",
    "related": [
      "chart",
      "close_price",
      "eval_pnl"
    ]
  },
  linear_scale: {
    "term": "선형 축",
    "aliases": [
      "선형축"
    ],
    "category": "price",
    "desc": "같은 가격 차이를 차트에서 같은 거리로 나타내는 눈금이에요. 같은 비율의 변화가 반드시 같은 거리로 보이는 것은 아니에요.",
    "example": "1만원→2만원과 2만원→3만원은 모두 1만원 차이이므로 세로축에서 같은 거리로 표시돼요.",
    "related": [
      "chart",
      "current_price",
      "change_rate"
    ]
  },
  log_scale: {
    "term": "로그 축",
    "aliases": [
      "로그축"
    ],
    "category": "price",
    "desc": "같은 가격 변화 비율을 차트에서 같은 거리로 나타내는 눈금이에요. 이 설명은 양수 가격을 기준으로 하며, 같은 금액 차이와는 구분해요.",
    "example": "1만원→2만원과 2만원→4만원은 모두 2배가 되는 변화라서 로그 축에서 같은 거리로 표시돼요.",
    "related": [
      "chart",
      "current_price",
      "change_rate"
    ]
  },
  minute_candle: {
    "term": "분봉",
    "aliases": [
      "1분봉",
      "5분봉"
    ],
    "category": "price",
    "desc": "정해진 분 단위 시간마다 가격을 묶어 표시하는 봉이에요. 마지막 봉은 시간이 끝나기 전까지 모양이 바뀔 수 있어요.",
    "example": "5분봉 한 개는 해당 5분 동안의 시가·고가·저가·종가를 담으며, 1분봉 한 개와 시간 범위가 달라요.",
    "related": [
      "candle",
      "daily_candle",
      "open_price",
      "close_price"
    ]
  },
  /* Phase 3: reviewed additions; existing definitions preserved. */
  raw_materials: {
    "term": "원자재",
    "category": "basic",
    "desc": "제품을 만들거나 에너지를 얻는 데 쓰는 기초 재료예요. 원유·구리·곡물 등의 가격 변화는 관련 기업의 원가에 영향을 줄 수 있어요.",
    "example": "구리를 많이 쓰는 회사는 구리 가격이 오르면 재료비 부담이 커질 수 있어요.",
    "related": [
      "stock",
      "operating_profit"
    ]
  },
  active_investor: {
    "term": "적극투자형",
    "category": "risk",
    "desc": "높은 수익을 추구하면서 비교적 큰 투자 손실 위험도 받아들이는 투자성향 분류예요. 분류 이름이 투자 실력이나 수익을 보장하지는 않아요.",
    "example": "설문에서 적극투자형이 나와도 손실을 감당할 수 있는 금액과 상품 위험을 따로 확인해요.",
    "related": [
      "risk_profile",
      "volatility"
    ]
  },
  aggressive_investor: {
    "term": "공격투자형",
    "category": "risk",
    "desc": "높은 수익을 위해 매우 큰 가격 변동과 손실 위험까지 받아들이려는 투자성향 분류예요. 모든 고위험 상품이 자신에게 맞는다는 뜻은 아니에요.",
    "example": "공격투자형으로 분류되어도 원금을 잃을 수 있다는 점과 상품별 조건을 확인해요.",
    "related": [
      "risk_profile",
      "principal"
    ]
  },
  repayment: {
    "term": "상환",
    "category": "asset",
    "desc": "빌린 돈이나 갚아야 할 채무를 돌려주는 일이에요. 납부액 중 원금·이자·비용이 각각 얼마인지 구분해요.",
    "example": "이자와 비용을 빼고 빌린 원금 100만원 중 30만원을 상환하면 남은 원금은 70만원이에요.",
    "related": [
      "principal",
      "misu_debt"
    ]
  },
  overdue_interest: {
    "term": "연체 이자",
    "category": "risk",
    "desc": "약속한 날짜까지 돈을 갚지 못했을 때 계약 조건에 따라 붙는 이자예요. 적용 이율·금액·기간은 상품과 약정에 따라 확인해야 해요.",
    "example": "같은 100만원을 늦게 갚더라도 약정과 연체 기간이 다르면 연체 이자가 달라질 수 있어요.",
    "related": [
      "misu_debt",
      "credit_financing"
    ],
    "aliases": [
      "연체이자"
    ]
  },
  regular_session: {
    "term": "정규장",
    "category": "order",
    "desc": "해당 시장이 정한 정규 거래시간 구간이에요. 시장별 정규장과 시간외 거래의 운영 조건은 다를 수 있어요.",
    "example": "같은 날짜에도 정규장 주문과 시간외 주문은 이용 가능한 주문 방식이 다를 수 있어요.",
    "related": [
      "trading_day",
      "after_hours"
    ]
  },
  exponential_average: {
    "term": "지수이동평균",
    "category": "price",
    "desc": "최근 가격에 더 큰 비중을 두어 계산하는 이동평균이에요. 과거 가격을 이용하므로 반응이 빠르더라도 이후 방향을 보장하지 않아요.",
    "example": "직전 평균이 100이고 새 가격이 110일 때 새 가격 반영 비중을 20%로 가정하면 새 평균은 102예요.",
    "related": [
      "moving_average",
      "simple_moving_average"
    ],
    "aliases": [
      "지수 이동평균",
      "지수이동평균선",
      "Exponential Moving Average"
    ]
  },
  adjusted_price: {
    "term": "수정주가",
    "category": "price",
    "desc": "주식 분할·증자 같은 사건 전후의 가격을 비교하도록 과거 가격을 조정한 자료예요. 어떤 사건을 반영하는지는 제공처마다 확인해야 하며 당시 실제 체결가와 다를 수 있어요.",
    "example": "다른 변화 없이 1주를 2주로 나누면 분할 전 2만원을 1만원 기준으로 조정해 비교할 수 있어요.",
    "related": [
      "stock_split",
      "candle"
    ],
    "aliases": [
      "수정 주가"
    ]
  },
  dividend_adjustment: {
    "term": "배당 조정",
    "category": "price",
    "desc": "배당이 가격 비교나 성과에 미치는 영향을 반영하도록 자료를 조정하는 처리예요. 실제 체결가격 자체를 바꾸는 것이 아니며 계산 기준은 제공처마다 달라요.",
    "example": "과거 가격을 볼 때 배당 조정을 켠 자료와 끈 자료가 서로 다를 수 있어요.",
    "related": [
      "dividend",
      "ex_dividend"
    ]
  },
  unfinished_candle: {
    "term": "미완성 봉",
    "category": "price",
    "desc": "아직 집계 시간이 끝나지 않아 가격과 모양이 바뀔 수 있는 차트 봉이에요. 완성된 봉과 구분해서 봐야 해요.",
    "example": "5분봉의 5분이 끝나기 전에는 고가·저가·종가가 계속 바뀔 수 있어요.",
    "related": [
      "candle",
      "minute_candle"
    ]
  },
  long_bullish: {
    "term": "장대양봉",
    "category": "price",
    "desc": "주변 봉과 비교해 몸통이 긴 양봉이에요. 길다는 기준은 비교 기간과 자료에 따라 달라지며 다음 상승을 보장하지 않아요.",
    "example": "주변 봉의 몸통이 약 100원인데 한 양봉의 몸통이 800원이라면 상대적으로 길다고 볼 수 있어요.",
    "related": [
      "bullish_candle",
      "candle"
    ]
  },
  long_bearish: {
    "term": "장대음봉",
    "category": "price",
    "desc": "주변 봉과 비교해 몸통이 긴 음봉이에요. 한 구간의 큰 하락을 보여줄 뿐 다음 가격을 확정하지 않아요.",
    "example": "주변 봉의 몸통이 약 100원인데 한 음봉의 몸통이 800원이라면 상대적으로 길다고 볼 수 있어요.",
    "related": [
      "bearish_candle",
      "candle"
    ]
  },
  marubozu: {
    "term": "마루보즈",
    "category": "price",
    "desc": "시가·종가가 고가·저가에 가깝고 꼬리가 없거나 매우 짧은 캔들 모양이에요. 양봉과 음봉 모두 가능하며 이후 방향을 보장하지 않아요.",
    "example": "시가 1만원·저가 1만원·종가 1만1000원·고가 1만1000원이면 꼬리가 없는 양봉 형태예요.",
    "related": [
      "candle",
      "high_low"
    ]
  },
  three_soldiers: {
    "term": "적삼병",
    "category": "price",
    "desc": "양봉 세 개가 이어지며 종가가 차례로 높아지는 전통적인 캔들 패턴이에요. 보통 앞 몸통 안에서 열리고 고가 부근에서 닫히는 형태를 보지만 추가 상승을 확정하지는 않아요.",
    "example": "세 양봉의 종가가 100원·105원·110원으로 높아져도 시가와 꼬리, 앞선 흐름을 함께 확인해요.",
    "related": [
      "bullish_candle",
      "candle"
    ]
  },
  three_crows: {
    "term": "흑삼병",
    "category": "price",
    "desc": "음봉 세 개가 이어지며 종가가 차례로 낮아지는 전통적인 캔들 패턴이에요. 보통 앞 몸통 안에서 열리고 저가 부근에서 닫히는 형태를 보지만 추가 하락을 확정하지는 않아요.",
    "example": "세 음봉의 종가가 110원·105원·100원으로 낮아져도 시가와 꼬리, 앞선 흐름을 함께 확인해요.",
    "related": [
      "bearish_candle",
      "candle"
    ]
  },
  volume_profile: {
    "term": "매물대",
    "category": "price",
    "desc": "선택한 기간에 어느 가격 구간에서 거래량이 많았는지 보여주는 자료예요. 지금 남아 있는 매도 주문이나 투자자의 실제 매입가격을 확정하는 정보는 아니에요.",
    "example": "1만원 부근에서 거래가 많이 이뤄졌다고 해도 그 주식이 지금도 모두 보유 중이라는 뜻은 아니에요.",
    "related": [
      "volume",
      "order_book_quantity"
    ],
    "aliases": [
      "거래량 프로파일"
    ]
  },
  bollinger_bands: {
    "term": "볼린저 밴드",
    "category": "metric",
    "desc": "이동평균을 중심으로 가격의 흩어진 정도를 반영한 위아래 띠를 그린 지표예요. 띠 밖에 있다는 이유만으로 바로 반등하거나 하락한다고 단정할 수 없어요.",
    "example": "가격 변화가 커지면 같은 설정에서도 띠의 폭이 넓어질 수 있어요.",
    "related": [
      "moving_average",
      "volatility"
    ],
    "aliases": [
      "볼린저밴드"
    ]
  },
  ichimoku: {
    "term": "일목균형표",
    "category": "metric",
    "desc": "전환선·기준선·구름대 등 여러 선과 영역으로 가격 흐름을 살펴보는 지표 체계예요. 선의 교차나 구름 모양이 미래 가격을 확정하지는 않아요.",
    "example": "같은 주가라도 기간 설정이 달라지면 선과 구름의 위치가 달라질 수 있어요.",
    "related": [
      "chart",
      "moving_average"
    ]
  },
  overbought: {
    "term": "과매수",
    "category": "metric",
    "desc": "일부 기술적 지표에서 최근 상승 움직임이 강하거나 상대적으로 높은 구간을 부르는 표현이에요. 주식을 너무 많이 샀다는 실제 주문 집계나 즉시 하락 신호로 단정하지 않아요.",
    "example": "일부 RSI 해석에서는 70보다 높은 값을 과매수로 부르지만 높은 값이 오래 이어질 수도 있어요.",
    "related": [
      "rsi",
      "volatility"
    ]
  },
  oversold: {
    "term": "과매도",
    "category": "metric",
    "desc": "일부 기술적 지표에서 최근 하락 움직임이 강하거나 상대적으로 낮은 구간을 부르는 표현이에요. 실제 매도량 초과나 즉시 반등을 보장하는 뜻은 아니에요.",
    "example": "일부 RSI 해석에서는 30보다 낮은 값을 과매도로 부르지만 낮은 값이 오래 이어질 수도 있어요.",
    "related": [
      "rsi",
      "volatility"
    ]
  },
  turnover_ratio: {
    "term": "거래회전율",
    "category": "metric",
    "desc": "일정 기간 거래량이 기준 주식 수에 비해 얼마나 많은지를 나타내는 비율이에요. 분모가 상장주식 수인지 다른 기준인지 확인해야 해요.",
    "example": "상장주식 100만주를 기준으로 하루 10만주가 거래됐다면 거래회전율은 10%예요.",
    "related": [
      "volume",
      "liquidity"
    ]
  },
  relative_volume: {
    "term": "상대 거래량",
    "category": "metric",
    "desc": "현재 거래량을 정해진 기준 기간의 평소 거래량과 비교한 값이에요. 같은 시각끼리 비교하는지 하루 전체끼리 비교하는지 확인해야 해요.",
    "example": "동일한 집계 조건에서 평소 10만주, 현재 20만주라면 상대 거래량은 2배예요.",
    "related": [
      "volume",
      "trading_value"
    ]
  },
  point_figure: {
    "term": "포인트 앤 피겨",
    "category": "price",
    "desc": "일정한 가격 변화 폭과 반전 조건에 따라 X와 O의 열을 만드는 차트예요. 시간마다 봉을 만드는 차트와 달라 작은 움직임은 표시되지 않을 수 있어요.",
    "example": "한 칸을 100원, 반전을 세 칸으로 설정하면 반대 방향 300원 변화가 새 열을 만드는 기준이 될 수 있어요.",
    "related": [
      "chart",
      "renko_chart"
    ]
  },
  tick_chart: {
    "term": "틱 차트",
    "category": "price",
    "desc": "정해진 체결 건수 등이 쌓일 때마다 새 봉을 만드는 차트예요. 호가의 최소 가격 간격인 틱 크기와 구분하며 집계 기준은 제공처에서 확인해요.",
    "example": "100체결마다 봉을 만들면 거래가 활발할 때 1개 봉이 더 짧은 시간에 완성될 수 있어요.",
    "related": [
      "chart",
      "execution"
    ],
    "aliases": [
      "틱차트"
    ]
  },
  range_chart: {
    "term": "레인지 차트",
    "category": "price",
    "desc": "정해진 가격 범위를 기준으로 봉을 만드는 차트예요. 일정 시간마다 만드는 봉과 달라 봉 하나의 시간 길이가 같지 않을 수 있어요.",
    "example": "가격 범위를 100원으로 설정하면 그 범위를 채우는 데 걸리는 시간은 구간마다 달라질 수 있어요.",
    "related": [
      "chart",
      "candle"
    ],
    "aliases": [
      "레인지차트"
    ]
  },
  fibonacci_retracement: {
    "term": "피보나치 되돌림",
    "category": "price",
    "desc": "선택한 고점과 저점 사이에 일정한 비율의 가격선을 표시하는 분석 도구예요. 표시된 선에서 반드시 가격이 멈추거나 반전하는 것은 아니에요.",
    "example": "100원에서 200원까지 오른 구간의 38.2% 되돌림 수준은 200−100×0.382=161.8원이에요.",
    "related": [
      "chart",
      "high_low"
    ]
  },
  elliott_wave: {
    "term": "엘리엇 파동",
    "category": "price",
    "desc": "가격 흐름을 추진 파동과 조정 파동의 반복 구조로 해석하는 이론이에요. 파동 구분이 사람마다 다르거나 나중에 바뀔 수 있어 예측을 보장하지 않아요.",
    "example": "같은 차트를 한 사람은 조정 구간으로, 다른 사람은 새 흐름의 시작으로 해석할 수 있어요.",
    "related": [
      "chart",
      "volatility"
    ]
  },
  backtesting: {
    "term": "백테스트",
    "category": "risk",
    "desc": "과거 자료에 정한 거래 규칙을 적용해 어떤 결과가 나왔을지 살펴보는 검증이에요. 수수료·체결 조건·자료 오류에 영향을 받으며 미래 수익을 보장하지 않아요.",
    "example": "과거 자료의 이익이 10만원이어도 비용을 3만원 반영하면 결과는 7만원으로 달라져요.",
    "related": [
      "fee",
      "slippage"
    ]
  },
  out_of_sample: {
    "term": "표본 외 검증",
    "category": "risk",
    "desc": "규칙을 만드는 데 쓰지 않은 별도 자료에서 결과를 확인하는 방법이에요. 투자 전략에서는 과거 특정 자료에만 잘 맞는지 점검하는 데 사용해요.",
    "example": "2020~2023년 자료로 만든 규칙을 수정하지 않고 따로 남겨 둔 2024년 자료에서 시험해요.",
    "related": [
      "risk_profile",
      "volatility"
    ]
  },
  overfitting: {
    "term": "과최적화",
    "category": "risk",
    "desc": "과거 자료의 우연한 특징까지 지나치게 맞춰 새로운 자료에서는 결과가 나빠질 수 있는 문제예요. 투자 전략을 평가할 때 시험하지 않은 자료에서도 확인해야 해요.",
    "example": "한 기간에 맞추려고 설정을 수백 번 바꿨다면 다른 기간의 결과도 따로 점검해요.",
    "related": [
      "volatility",
      "risk_profile"
    ]
  },
  survivorship_bias: {
    "term": "생존 편향",
    "category": "risk",
    "desc": "남아 있는 대상만 살펴보고 사라지거나 실패한 대상을 빠뜨려 결과가 치우치는 문제예요. 투자 성과 검증에서도 상장폐지 종목 등을 빼면 결과가 과장될 수 있어요.",
    "example": "현재 남아 있는 종목만으로 과거 전략을 시험하면 당시 실패한 종목의 손실을 놓칠 수 있어요.",
    "related": [
      "portfolio",
      "stock"
    ]
  },
  data_snooping: {
    "term": "데이터 스누핑",
    "category": "risk",
    "desc": "같은 자료에서 많은 규칙을 시험한 뒤 우연히 좋아 보이는 결과만 고르는 문제예요. 선택에 쓰지 않은 자료로 다시 확인해야 해요.",
    "example": "같은 과거 자료로 1000개 규칙을 시험해 가장 높은 수익 하나만 고르면 우연의 영향을 놓칠 수 있어요.",
    "related": [
      "risk_profile",
      "return_rate"
    ]
  },
  expected_pnl: {
    "term": "기대손익",
    "category": "risk",
    "desc": "가능한 이익과 손실에 각각의 확률을 반영해 계산한 평균적인 손익이에요. 확률과 금액 추정이 틀릴 수 있어 실제 거래의 수익을 보장하지 않아요.",
    "example": "비용 제외 가정에서 40% 확률로 3만원 이익, 60% 확률로 1만원 손실이면 기대손익은 6000원이에요.",
    "related": [
      "pnl",
      "return_rate"
    ]
  },
  stop_order: {
    "term": "스톱 주문",
    "category": "order",
    "desc": "정한 기준가격에 도달하면 작동하도록 설정하는 주문이에요. 일반 스톱 주문은 작동 후 시장가 주문이 되고 스톱지정가는 지정가 주문이므로 방식과 체결 위험을 구분해요.",
    "example": "매도 스톱가격을 9000원으로 정해도 급하게 하락하면 실제 체결가격은 그보다 낮을 수 있어요.",
    "related": [
      "market_order",
      "limit_order"
    ],
    "aliases": [
      "스톱주문"
    ]
  },
  correlation: {
    "term": "상관관계",
    "category": "metric",
    "desc": "두 변수의 값이 함께 변하는 관계예요. 투자에서는 자산 수익률이 함께 움직이는 정도를 살펴보지만, 상관관계가 있다고 원인과 결과라는 뜻은 아니에요.",
    "example": "두 주식의 수익률이 함께 오르고 내리는 경향이 있어도 한 주식이 다른 주식의 움직임을 일으켰다고 단정할 수 없어요.",
    "related": [
      "diversification",
      "return_rate"
    ]
  },
  win_rate: {
    "term": "승률",
    "category": "risk",
    "desc": "전체 결과 중 이긴 결과가 차지하는 비율이에요. 투자 전략에서는 정한 기준에 따라 이익으로 끝난 거래 비율을 계산하며, 수익률과는 달라요.",
    "example": "완료한 10번의 거래 중 6번이 이익이면 승률은 60%예요. 손실 거래의 금액이 크면 전체 손익은 마이너스일 수 있어요.",
    "related": [
      "expected_pnl",
      "pnl"
    ]
  },
  harami: {
    "term": "잉태형",
    "category": "price",
    "desc": "앞선 큰 봉의 몸통 안에 다음 작은 봉의 몸통이 들어오는 두 봉 모양이에요. 꼬리 전체가 아닌 몸통을 비교하며, 앞선 추세에 따라 해석하고 방향 전환을 확정하지 않아요.",
    "example": "하락 뒤 큰 음봉의 몸통 안에 작은 양봉의 몸통이 들어와도 이후 주가 상승이 보장되지는 않아요.",
    "related": [
      "candle",
      "bullish_candle",
      "bearish_candle"
    ]
  },
  morning_star: {
    "term": "샛별형",
    "category": "price",
    "desc": "하락 흐름에서 긴 음봉, 아래로 떨어져 나타난 작은 몸통의 봉, 첫 음봉 몸통의 중간 위에서 끝나는 긴 양봉이 이어지는 세 봉 모양이에요. 상승 전환 가능성을 살펴보는 이름이지 상승을 보장하는 신호는 아니에요.",
    "example": "작은 가운데 봉 뒤에 양봉이 나와도 앞선 하락 흐름과 봉 사이의 간격을 함께 확인해요.",
    "related": [
      "candle",
      "bullish_candle",
      "bearish_candle"
    ]
  },
  evening_star: {
    "term": "석별형",
    "category": "price",
    "desc": "상승 흐름에서 긴 양봉, 위로 떨어져 나타난 작은 몸통의 봉, 첫 양봉 몸통의 중간 아래에서 끝나는 음봉이 이어지는 세 봉 모양이에요. 하락 전환 가능성을 살펴보지만 이후 하락을 확정하지 않아요.",
    "example": "작은 가운데 봉 다음에 음봉이 나와도 세 봉의 위치와 앞선 상승 흐름을 함께 확인해요.",
    "related": [
      "candle",
      "bullish_candle",
      "bearish_candle"
    ]
  },
  trend_line: {
    "term": "추세선",
    "category": "price",
    "desc": "자료가 움직이는 방향을 살펴보기 위해 그은 선이에요. 주가 차트에서는 주로 저점들 또는 고점들을 연결하며, 어떤 점을 선택하느냐에 따라 선이 달라질 수 있어요.",
    "example": "여러 저점을 연결한 선 아래로 주가가 내려가더라도 그 사실만으로 다음 가격을 확정할 수는 없어요.",
    "related": [
      "chart",
      "high_low"
    ]
  },
  confidence_interval: {
    "term": "신뢰구간",
    "category": "metric",
    "desc": "표본으로 추정한 값의 불확실성을 표현한 구간이에요. 95% 신뢰수준은 같은 절차를 반복해 구한 구간 중 약 95%가 참값을 포함하도록 설계됐다는 뜻이에요.",
    "example": "표본으로 평균을 추정할 때 구간을 함께 제시해요. 95% 신뢰수준이 투자 수익을 95% 확률로 보장한다는 뜻은 아니에요.",
    "related": [
      "backtesting",
      "volatility"
    ]
  },
  inverse_head_shoulders: {
    "term": "역헤드앤숄더",
    "category": "price",
    "desc": "세 저점 중 가운데 저점이 가장 깊고 양옆 저점이 상대적으로 얕은 차트 모양이에요. 저점 사이의 고점들을 잇는 목선도 함께 살펴보며, 모양만으로 상승을 보장하지 않아요.",
    "example": "가운데 골이 깊은 세 저점이 보여도 목선 주변의 가격 움직임과 실패 가능성을 함께 확인해요.",
    "related": [
      "chart",
      "high_low"
    ],
    "aliases": [
      "역헤드 앤 숄더"
    ]
  },
  cup_handle: {
    "term": "컵앤핸들",
    "category": "price",
    "desc": "차트에서 둥근 컵 모양의 가격 회복 뒤 작은 조정 구간인 손잡이가 이어지는 모양이에요. 손잡이 이후에도 예상과 다르게 움직일 수 있어요.",
    "example": "주가가 둥글게 내려갔다 회복한 뒤 잠시 조정받는다고 해서 모두 성공적인 컵앤핸들이 되는 것은 아니에요.",
    "related": [
      "chart",
      "volatility"
    ],
    "aliases": [
      "컵 앤 핸들"
    ]
  },
  ascending_triangle: {
    "term": "상승 삼각형",
    "category": "price",
    "desc": "차트의 위쪽 고점 경계는 대체로 수평이고 아래쪽 저점 경계는 높아지는 삼각형 모양이에요. 이름과 달리 위로만 벗어나는 것은 아니에요.",
    "example": "고점은 비슷하고 저점은 높아져도 가격이 아래쪽 경계를 벗어날 수 있어요.",
    "related": [
      "chart",
      "high_low"
    ],
    "aliases": [
      "상승삼각형"
    ]
  },
  descending_triangle: {
    "term": "하락 삼각형",
    "category": "price",
    "desc": "차트의 아래쪽 저점 경계는 대체로 수평이고 위쪽 고점 경계는 낮아지는 삼각형 모양이에요. 이름만으로 하락을 확정할 수는 없어요.",
    "example": "저점은 비슷하고 고점은 낮아져도 가격이 위쪽 경계를 벗어날 수 있어요.",
    "related": [
      "chart",
      "high_low"
    ],
    "aliases": [
      "하락삼각형"
    ]
  },
  trading_range: {
    "term": "박스권",
    "category": "price",
    "desc": "값이 일정한 위아래 범위 안에서 오르내리는 상태를 가리켜요. 주가에서는 비슷한 고점과 저점 사이에서 움직이는 구간을 말하며 그 범위가 계속 유지되지는 않아요.",
    "example": "주가가 한동안 9000원에서 1만원 사이를 오갔다면 그 기간을 박스권으로 볼 수 있어요.",
    "related": [
      "chart",
      "high_low"
    ]
  },
  common_gap: {
    "term": "보통 갭",
    "category": "price",
    "desc": "가격 범위 사이에 거래가 비는 갭 중, 주로 기존 거래 범위 안에서 생겨 뚜렷한 추세 전환과 연결되지 않는 유형이에요. 갭이 반드시 메워진다고 볼 수는 없어요.",
    "example": "이전 봉의 고가보다 다음 봉의 저가가 높아 가격 공백이 생겼지만 기존 가격 범위 안에 머무는 경우예요.",
    "related": [
      "chart",
      "candle"
    ],
    "aliases": [
      "보통갭"
    ]
  },
  breakaway_gap: {
    "term": "돌파 갭",
    "category": "price",
    "desc": "가격 범위 사이에 거래가 비는 갭이 기존의 횡보 범위나 차트 경계를 벗어나며 생긴 유형이에요. 새 움직임의 시작으로 해석하지만 실패할 수 있어요.",
    "example": "오랫동안 머물던 가격 범위 위로 공백을 두고 이동해도 그 범위 안으로 다시 돌아올 수 있어요.",
    "related": [
      "chart",
      "candle"
    ],
    "aliases": [
      "돌파갭"
    ]
  },
  continuation_gap: {
    "term": "지속 갭",
    "category": "price",
    "desc": "이미 진행 중인 추세 도중에 생기는 가격 공백을 가리키는 분류예요. 추세가 이어지는 과정에서 붙이는 이름이며, 발생 순간에 지속 여부를 확정할 수는 없어요.",
    "example": "상승이 진행되는 도중 갭이 생겨도 이후 흐름을 확인하기 전에는 지속 갭이라고 단정하지 않아요.",
    "related": [
      "chart",
      "candle"
    ],
    "aliases": [
      "지속갭"
    ]
  },
  exhaustion_gap: {
    "term": "소진 갭",
    "category": "price",
    "desc": "추세의 후반에 가격 공백이 생긴 뒤 기존 움직임이 힘을 잃고 반전하는 과정에서 붙이는 분류예요. 이후 흐름을 보고 판단하는 성격이 있어 당시에는 다른 갭과 구별하기 어려워요.",
    "example": "상승 중 생긴 갭 이후 가격이 되돌아오는 흐름을 확인해야 소진 여부를 논할 수 있어요.",
    "related": [
      "chart",
      "candle"
    ],
    "aliases": [
      "소진갭"
    ]
  },
  selection_bias: {
    "term": "선택 편향",
    "category": "risk",
    "desc": "자료를 고르는 방식 때문에 표본이 조사하려는 전체 대상을 제대로 대표하지 못해 결과가 치우치는 문제예요. 투자 성과를 평가할 때도 유리한 자료만 고르지 않았는지 확인해요.",
    "example": "수익이 난 계좌만 골라 평균 수익률을 계산하면 전체 투자자의 성과보다 좋아 보일 수 있어요.",
    "related": [
      "survivorship_bias",
      "backtesting"
    ],
    "aliases": [
      "선택편향"
    ]
  },
};

/** 팝오버/사전 화면에서 쓰는 조회 헬퍼 */
export const getTerm = (termId) => GLOSSARY[termId] ?? null;

export const GLOSSARY_IDS = Object.keys(GLOSSARY);

export const GLOSSARY_COUNT = GLOSSARY_IDS.length;

/** 용어명·설명을 대상으로 하는 단순 검색 */
export function searchGlossary(keyword) {
  const q = String(keyword ?? '').trim().toLowerCase();
  if (!q) return GLOSSARY_IDS;
  return GLOSSARY_IDS.filter((id) => {
    const t = GLOSSARY[id];
    return (
      t.term.toLowerCase().includes(q) ||
      (t.aliases ?? []).some((alias) => alias.toLowerCase().includes(q)) ||
      t.desc.toLowerCase().includes(q) ||
      id.includes(q)
    );
  });
}

/** 카테고리별로 묶어서 반환 */
export function groupByCategory(ids = GLOSSARY_IDS) {
  const groups = {};
  for (const key of Object.keys(CATEGORIES)) groups[key] = [];
  for (const id of ids) {
    const cat = GLOSSARY[id]?.category;
    if (groups[cat]) groups[cat].push(id);
  }
  return groups;
}
