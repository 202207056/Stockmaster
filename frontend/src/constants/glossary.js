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
    example: '상장되지 않은 회사의 주식은 증권 앱에서 살 수 없습니다.',
    related: ['stock', 'kospi'],
  },
  market_cap: {
    term: '시가총액',
    category: 'basic',
    desc: '회사의 전체 가격이에요. 현재 주가에 발행된 주식 수를 곱해서 구합니다.',
    example: '주가 7만원 × 60억주 = 시가총액 420조원',
    related: ['stock', 'per'],
  },
  symbol_code: {
    term: '종목코드',
    category: 'basic',
    desc: '종목마다 붙어 있는 6자리 번호예요. 이름이 비슷한 회사를 구분할 때 씁니다.',
    example: '삼성전자 = 005930, SK하이닉스 = 000660',
    related: ['stock'],
  },

  /* ---------------------------------------------------------- 시세·차트 */
  current_price: {
    term: '현재가',
    category: 'price',
    desc: '지금 이 순간 거래되고 있는 가격이에요. 거래가 일어날 때마다 계속 바뀝니다.',
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
    desc: '어제 종가와 비교해 오늘 가격이 몇 % 움직였는지예요. 빨강은 상승, 파랑은 하락입니다.',
    example: '어제 70,000원 → 오늘 73,500원이면 등락률 +5.0%',
    related: ['prev_close', 'current_price'],
  },
  prev_close: {
    term: '전일대비',
    category: 'price',
    desc: '어제 종가에서 얼마나 오르거나 내렸는지를 금액으로 나타낸 값이에요.',
    example: '전일대비 +3,500원 = 어제보다 3,500원 비싸졌다는 뜻',
    related: ['change_rate'],
  },
  upper_limit: {
    term: '상한가 · 하한가',
    category: 'price',
    desc: '하루에 주가가 움직일 수 있는 최대 폭이에요. 국내 주식은 위아래로 30%까지만 움직입니다.',
    example: '10,000원 종목의 상한가는 13,000원, 하한가는 7,000원',
    related: ['volatility', 'circuit_breaker'],
  },
  volume: {
    term: '거래량',
    category: 'price',
    desc: '하루 동안 사고팔린 주식 수예요. 많을수록 사람들의 관심이 크다는 뜻입니다.',
    example: '거래량 1,500만주 = 그날 1,500만 주가 손바뀜했다는 뜻',
    related: ['trading_value', 'liquidity'],
  },
  trading_value: {
    term: '거래대금',
    category: 'price',
    desc: '하루 동안 오간 돈의 총액이에요. 거래량에 가격을 곱한 값입니다.',
    example: '거래량 100만주 × 평균 7만원 = 거래대금 700억원',
    related: ['volume'],
  },
  candle: {
    term: '캔들차트',
    category: 'price',
    desc: '하루의 시가·종가·고가·저가를 양초 모양 하나로 그린 차트예요. 빨간 캔들은 오른 날, 파란 캔들은 내린 날입니다.',
    example: '몸통은 시가~종가 구간, 위아래 꼬리는 고가·저가를 뜻해요.',
    related: ['open_price', 'close_price', 'moving_average'],
  },
  moving_average: {
    term: '이동평균선',
    category: 'price',
    desc: '최근 며칠간 종가의 평균을 이어 그린 선이에요. 들쭉날쭉한 가격에서 큰 흐름만 보려고 씁니다.',
    example: '20일선 = 최근 20일 종가의 평균을 매일 이어 그린 선',
    related: ['candle'],
  },
  week52: {
    term: '52주 최고 · 최저',
    category: 'price',
    desc: '최근 1년 동안의 가장 높은 가격과 가장 낮은 가격이에요. 지금 가격이 비싼 편인지 가늠할 때 씁니다.',
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

  /* --------------------------------------------------------- 주문·체결 */
  buy: {
    term: '매수',
    category: 'order',
    desc: '주식을 사는 것이에요. 주문을 넣으면 조건이 맞을 때 체결됩니다.',
    example: '삼성전자 10주 매수 = 삼성전자 주식 10주를 사겠다는 주문',
    related: ['sell', 'execution'],
  },
  sell: {
    term: '매도',
    category: 'order',
    desc: '갖고 있는 주식을 파는 것이에요. 보유 수량 안에서만 팔 수 있습니다.',
    example: '10주를 갖고 있으면 최대 10주까지 매도 주문을 낼 수 있어요.',
    related: ['buy', 'hold_quantity'],
  },
  limit_order: {
    term: '지정가 주문',
    category: 'order',
    desc: '내가 원하는 가격을 정해서 넣는 주문이에요. 그 가격에 도달해야 체결됩니다.',
    example: '10,000원 지정가 매수 → 주가가 10,000원 이하로 내려와야 체결',
    related: ['market_order', 'pending_order'],
  },
  market_order: {
    term: '시장가 주문',
    category: 'order',
    desc: '가격을 정하지 않고 "지금 값으로 바로" 사거나 파는 주문이에요. 빠르게 체결되는 대신 생각보다 비싸거나 싸게 체결될 수 있어요.',
    example: '급하게 팔아야 할 때 시장가 매도를 씁니다.',
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
    desc: '주문이 실제 거래로 성사된 것을 말해요. 체결되어야 내 주식이 되거나 현금이 들어옵니다.',
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
    desc: '주식을 사고팔 때 증권사와 나라에 내는 비용이에요. 팔 때는 세금이 더 붙습니다.',
    example: '100만원어치를 팔면 수수료와 세금으로 몇천 원이 빠져나갑니다.',
    related: ['realized_pnl'],
  },
  slippage: {
    term: '슬리피지',
    category: 'order',
    desc: '주문을 낼 때 본 가격과 실제 체결된 가격의 차이예요. 거래가 적은 종목일수록 커집니다.',
    example: '75,000원에 살 생각이었는데 75,300원에 체결되면 300원이 슬리피지',
    related: ['market_order', 'liquidity'],
  },

  /* ---------------------------------------------------------- 계좌·자산 */
  deposit: {
    term: '예수금',
    category: 'asset',
    desc: '계좌에 들어 있는 현금이에요. 이 돈으로 주식을 삽니다.',
    example: '예수금 1,000만원 = 아직 주식을 사지 않은 현금이 1,000만원',
    related: ['orderable_cash', 'total_asset'],
  },
  orderable_cash: {
    term: '주문가능금액',
    category: 'asset',
    desc: '지금 당장 주식을 사는 데 쓸 수 있는 돈이에요. 이미 걸어 둔 매수 주문이 있으면 그만큼 빠집니다.',
    example: '예수금 100만원 중 30만원어치 매수 주문이 걸려 있으면 주문가능금액은 70만원',
    related: ['deposit', 'pending_order'],
  },
  avg_price: {
    term: '평균단가',
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
    desc: '그 종목을 사는 데 실제로 쓴 돈이에요. 평균단가 × 보유수량입니다.',
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
    desc: '실제로 팔아서 확정된 이익이나 손실이에요. 팔기 전까지는 실현손익이 아닙니다.',
    example: '10만원에 사서 12만원에 팔면 실현손익 +2만원 (수수료·세금 제외 전)',
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
    desc: '계좌에 있는 현금과 갖고 있는 주식의 가치를 모두 더한 금액이에요.',
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

  /* ------------------------------------------------------------ 투자지표 */
  per: {
    term: 'PER',
    category: 'metric',
    desc: '주가를 주당순이익(EPS)으로 나눈 값으로, 이익에 비해 주가가 비싼지 판단하는 지표예요.',
    example: 'PER 10배 = 지금 이익이 유지되면 10년 만에 투자금을 번다는 뜻',
    related: ['eps', 'pbr'],
  },
  pbr: {
    term: 'PBR',
    category: 'metric',
    desc: '주가를 회사가 가진 순자산으로 나눈 값이에요. 1배보다 낮으면 회사 재산보다 싸게 거래된다는 뜻입니다.',
    example: 'PBR 0.8배 = 회사 재산의 80% 값에 거래되는 중',
    related: ['bps', 'per'],
  },
  eps: {
    term: 'EPS (주당순이익)',
    category: 'metric',
    desc: '회사가 1년간 번 순이익을 주식 수로 나눈 값이에요. 주식 1주가 얼마를 벌어다 주는지를 뜻합니다.',
    example: '순이익 100억원 ÷ 1,000만주 = EPS 1,000원',
    related: ['per', 'roe'],
  },
  bps: {
    term: 'BPS (주당순자산)',
    category: 'metric',
    desc: '회사 재산을 주식 수로 나눈 값이에요. 회사가 문을 닫으면 1주당 돌려받을 수 있는 이론적인 금액입니다.',
    example: 'BPS 5만원인데 주가가 4만원이면 PBR은 0.8배',
    related: ['pbr'],
  },
  roe: {
    term: 'ROE (자기자본이익률)',
    category: 'metric',
    desc: '회사가 가진 돈으로 얼마나 효율적으로 이익을 냈는지 보여 주는 지표예요. 높을수록 장사를 잘한 겁니다.',
    example: 'ROE 15% = 자기 돈 100원으로 1년에 15원을 벌었다는 뜻',
    related: ['eps'],
  },
  dividend: {
    term: '배당금',
    category: 'metric',
    desc: '회사가 번 이익의 일부를 주주에게 현금으로 나눠 주는 돈이에요.',
    example: '1주당 배당금 1,000원 × 10주 = 1만원을 받습니다.',
    related: ['dividend_yield', 'ex_dividend'],
  },
  dividend_yield: {
    term: '배당수익률',
    category: 'metric',
    desc: '주가 대비 배당금이 몇 %인지예요. 은행 이자와 비교할 때 씁니다.',
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
    category: 'risk',
    desc: '손실이 더 커지기 전에 정해 둔 선에서 파는 것이에요. 미리 기준을 정해 두는 게 핵심입니다.',
    example: '"-10%가 되면 판다"고 정해 두고 지키는 것',
    related: ['take_profit', 'realized_pnl'],
  },
  take_profit: {
    term: '익절',
    category: 'risk',
    desc: '목표한 수익이 났을 때 파는 것이에요. 이익도 팔아야 내 돈이 됩니다.',
    example: '"+20%가 되면 절반 판다" 같은 규칙',
    related: ['stop_loss', 'realized_pnl'],
  },
  averaging_down: {
    term: '물타기',
    category: 'risk',
    desc: '손실 중인 종목을 더 사서 평균단가를 낮추는 방법이에요. 회복이 빨라질 수도 있지만 손실도 함께 커집니다.',
    example: '2만원에 산 주식이 1만원이 됐을 때 더 사면 평균단가는 1만 5천원',
    related: ['avg_price', 'diversification'],
  },
  diversification: {
    term: '분산투자',
    category: 'risk',
    desc: '한 종목에 몰지 않고 여러 곳에 나눠 담는 것이에요. 하나가 크게 떨어져도 전체 타격이 줄어듭니다.',
    example: '한 종목에 전 재산을 넣는 대신 5~10개 종목에 나눠 담기',
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
    desc: '며칠 안에 사고파는 방식이에요. 수수료와 세금이 자주 나가고 실패 확률도 높습니다.',
    example: '오늘 사서 오늘 파는 것을 데이트레이딩이라고 해요.',
    related: ['long_term', 'fee'],
  },

  /* -------------------------------------------------------- 시장 이벤트 */
  ex_dividend: {
    term: '배당락',
    category: 'event',
    desc: '배당을 받을 권리가 사라지는 날에 그만큼 주가가 내려가는 현상이에요.',
    example: '배당금 1,000원인 종목은 배당락일에 주가가 약 1,000원 내려갑니다.',
    related: ['dividend'],
  },
  stock_split: {
    term: '액면분할',
    category: 'event',
    desc: '주식 1주를 여러 주로 쪼개는 일이에요. 주가는 낮아지지만 내 재산의 총액은 그대로입니다.',
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
    desc: '회사가 주주에게 새 주식을 공짜로 나눠 주는 일이에요. 주식 수는 늘고 주가는 그만큼 낮아집니다.',
    example: '1주당 1주 무상증자 → 10주가 20주가 되고 주가는 절반으로',
    related: ['paid_increase', 'stock_split'],
  },
  short_selling: {
    term: '공매도',
    category: 'event',
    desc: '주식을 빌려서 먼저 팔고, 나중에 싸게 사서 갚는 방법이에요. 주가가 내려가야 이익을 봅니다.',
    example: '10만원에 빌려 팔고 8만원에 사서 갚으면 2만원 이익',
    related: ['volatility'],
  },
  circuit_breaker: {
    term: '서킷브레이커',
    category: 'event',
    desc: '시장이 너무 급하게 떨어질 때 거래를 잠시 멈추는 장치예요. 투자자가 진정할 시간을 줍니다.',
    example: '지수가 8% 이상 급락하면 20분간 거래가 멈춥니다.',
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
    desc: '정규 장(오전 9시~오후 3시 30분)이 끝난 뒤에도 정해진 시간 동안 거래하는 것이에요.',
    example: '장 마감 후 뉴스가 나오면 시간외에서 가격이 먼저 움직입니다.',
    related: ['close_price'],
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
