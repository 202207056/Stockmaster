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

  /* ---------------------------------------------------------- 시세·차트 */
  current_price: {
    term: '현재가',
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
    category: 'price',
    desc: '한 봉의 기간에 해당하는 시가·종가·고가·저가를 나타내요. 일반적인 국내 표시에서 빨강은 종가가 시가보다 높고 파랑은 낮음을 뜻하며 전일대비와 다를 수 있습니다.',
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
    desc: '주식을 파는 거래예요. 이 사이트의 현금주식 매도는 보유 수량 안에서만 가능합니다. 차입한 주식의 공매도는 별도 거래입니다.',
    example: '10주를 갖고 있으면 최대 10주까지 매도 주문을 낼 수 있어요.',
    related: ['buy', 'hold_quantity'],
  },
  limit_order: {
    term: '지정가 주문',
    category: 'order',
    desc: '매수는 지정가 이하, 매도는 지정가 이상에서 거래하도록 가격 조건을 정하는 주문이에요. 조건이 맞아도 대기 순서와 물량에 따라 체결되지 않을 수 있습니다.',
    example: '10,000원 지정가 매수는 10,000원 이하 매도 물량과 거래할 수 있지만 체결을 보장하지 않습니다.',
    related: ['market_order', 'pending_order'],
  },
  market_order: {
    term: '시장가 주문',
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
    category: 'asset',
    desc: '계좌 증거금 정책·미체결 주문·매도대금 재사용 등을 반영한 주문 가능 금액이에요. 비용 포함 필요액과 결제일까지 준비할 돈도 확인해야 합니다.',
    example: '비용을 제외한 현금 전액 확보 예시: 현금 100만원 중 주문에 30만원을 확보하면 남은 예산은 70만원입니다.',
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
    desc: '거래대금 기준으로는 평균 매수가 × 보유수량입니다. 이 사이트의 매입원가는 부과된 매수 수수료도 포함하므로 표시된 평균단가와 구분합니다.',
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

  /* ------------------------------------------------------------ 투자지표 */
  per: {
    term: 'PER',
    category: 'metric',
    desc: '주가를 주당순이익(EPS)으로 나눈 값으로, 이익에 비해 주가가 비싼지 판단하는 지표예요.',
    example: '주가 10,000원 ÷ EPS 1,000원 = PER 10배입니다. 투자금 회수기간이나 배당을 보장하지 않습니다.',
    related: ['eps', 'pbr'],
  },
  pbr: {
    term: 'PBR',
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
