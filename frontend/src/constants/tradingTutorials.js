// Tours of existing site controls. No answer fields, scoring or separate lesson UI.
const action = (target, title, text, event) => ({ target, title, text, event });
const read = (target, title, text) => ({ target, title, text, read: true });
const search = action('search', '종목 검색', '검색창에 예시를 입력하고 검색하세요. 실제 트레이딩에서도 종목명이나 코드로 찾습니다.', 'search');
const stock = action('stock', '종목 선택', '목록에서 예시전자를 선택하세요. 선택한 종목의 차트와 주문 정보가 열립니다.', 'stock');
const account = action('account', '주문 계좌 선택', '계좌 선택에서 매매 연습 계좌를 선택하세요. 주문과 잔고는 선택한 계좌에만 반영됩니다.', 'account');
const buy = action('order-fields', '매수 주문 입력', '구분에서 매수를 선택하고 수량을 입력하세요. 10주로 연습할 수 있습니다. 아래 예상 비용도 함께 바뀝니다.', 'buy-fields');
const sell = action('order-fields', '매도 주문 입력', '구분을 매도로 바꾸고 보유 수량 안에서 수량을 입력하세요. 일부를 매도하면 남은 주식을 살펴볼 수 있습니다.', 'sell-fields');
const costs = read('costs', '주문 비용 확인', '총 필요금액에는 매수대금과 수수료가, 매도 순수령액에는 매도대금에서 수수료와 세금을 뺀 금액이 표시됩니다. 주문 전에 이 항목을 확인하세요.');
const rules = action('cost-rules', '비용 적용 기준', '수수료·세금 적용 기준을 펼쳐 보세요. 수수료는 매수·매도 체결대금, 거래세와 농특세는 이익이 아닌 매도대금을 기준으로 합니다. 손실 매도에도 부과됩니다.', 'rules');
const prepare = action('place', '주문 확인 창', '모의 주문 버튼으로 계좌·종목·수량·예상 비용을 확인하세요. 확인 창을 여는 것만으로 주문되지는 않습니다.', 'prepare');
const confirm = action('dialog', '주문 실행', '주문 내용을 확인한 뒤 주문 버튼을 누르세요. 이 사이트는 즉시 체결 모의거래입니다. 실제 시장에서는 접수와 체결이 다르며 미체결·부분 체결도 가능합니다.', 'filled');
const close = action('dialog', '체결 비용 확인', '완료 창의 체결가격과 실제 차감 비용을 살펴본 뒤 확인을 누르세요. 예상 비용과 확정 비용을 구분해서 확인합니다.', 'closed');
const history = read('history', '주문내역 확인', '체결수량·수수료·거래세·농특세·현금 증감을 확인하세요. 매도 실현손익은 매수 비용을 포함한 해당 수량의 원가와 매도 순수령액의 차이입니다.');
const assets = action('assets-link', '내 자산 이동', '내 자산 보기를 눌러 현금과 보유종목에 반영된 결과를 확인하세요.', 'assets');
const total = read('asset-total', '총자산과 현금', '총자산은 현금과 보유 주식 평가금액의 합계입니다. 주식을 사면 현금 일부가 주식으로 바뀌고 수수료만큼 총자산이 줄어듭니다. 주가가 같아도 거래 비용으로 손익이 발생합니다.');
const investment = read('asset-investment', '매입원가와 평가손익', '매입원가는 매수 수수료를 포함합니다. 평가손익은 보유 주식의 현재 평가금액과 원가의 차이이며, 앞으로 팔 때의 비용은 제외되어 있습니다.');
const holdings = read('asset-holdings', '보유종목 확인', '보유수량·평균단가·현재가·평가손익을 확인하세요. 평균단가는 체결가격 기준이고 매입원가에는 매수 수수료가 포함되어 차이가 있습니다.');
const back = action('trading-link', '트레이딩 이동', '보유종목의 종목명 또는 트레이딩으로 가기를 눌러 돌아가세요. 같은 연습 계좌와 보유수량이 유지됩니다.', 'trading');

export const TRADING_TUTORIALS = [
  { id: 'buy', title: '매수와 거래 비용', description: '종목을 찾아 매수하고 내 자산에서 현금과 주식을 확인합니다.', group: '거래', steps: [search, stock, account, buy, costs, rules, prepare, confirm, close, history, assets, total, investment, holdings] },
  { id: 'sell', title: '매도와 실현손익', description: '보유 주식 일부를 매도하고 비용·실현손익·잔여 수량을 확인합니다.', group: '거래', seeded: true, steps: [stock, account, sell, costs, rules, prepare, confirm, close, history, assets, investment, holdings] },
  { id: 'orders', title: '주문 확인과 체결내역', description: '주문 확인 창에서 취소한 뒤 다시 주문하고 체결내역을 조회합니다.', group: '거래', steps: [stock, account, buy, prepare, action('dialog', '전송 전 취소', '취소를 눌러 확인 창을 닫으세요. 아직 전송하지 않아 수수료나 보유수량 변화가 없습니다. 체결된 주문을 취소하는 기능과는 다릅니다.', 'cancelled'), read('history', '취소 후 내역 확인', '체결내역이 생기지 않았는지 확인하세요. 이 사이트는 즉시 체결 방식으로 미체결 주문 정정·취소 기능은 제공하지 않습니다.'), prepare, confirm, close, action('history-refresh', '체결내역 새로고침', '내역 새로고침을 눌러 조회하세요. 응답이 불확실할 때는 같은 주문을 다시 보내기 전에 내역을 확인합니다.', 'history-refresh'), history] },
  { id: 'account', title: '계좌 선택과 자산 조회', description: '두 계좌를 전환하며 계좌별 현금과 보유종목을 살펴봅니다.', group: '계좌', seeded: true, start: '/assets', steps: [account, total, investment, holdings, back, read('account', '거래 계좌 확인', '자산 화면에서 선택한 매매 연습 계좌가 주문 영역에도 유지됩니다. 주문 확인 창의 계좌명과 계좌번호도 함께 확인하세요.')] },
  { id: 'settlement', title: '체결과 결제', description: '매도 후 자산 반영을 확인하고 실제 시장의 결제 시차를 구분합니다.', group: '계좌', seeded: true, steps: [stock, account, sell, prepare, confirm, close, assets, read('asset-total', '모의계좌 현금 반영', '이 사이트는 매도 비용을 차감한 현금을 즉시 반영합니다. 주문가능금액은 모의거래에 사용할 금액입니다. 실제 증권계좌의 출금가능금액과 같다는 뜻은 아닙니다.'), read('asset-investment', '실제 주식의 결제일', '실제 국내 상장주식은 거래일로부터 2영업일 뒤 결제합니다(T+2). 공휴일 없는 월요일 매도는 수요일 결제입니다. 매도대금 재사용과 은행 출금은 다르며 실제 출금은 증권사의 출금가능금액을 확인합니다. 이 사이트에는 은행 출금·결제일 이동 기능이 없습니다.'), holdings] },
  { id: 'review', title: '매매와 계좌 확인', description: '매수부터 자산 조회·일부 매도·체결내역 확인까지 이어서 사용합니다.', group: '종합', steps: [search, stock, account, buy, prepare, confirm, close, assets, investment, holdings, back, sell, costs, prepare, confirm, close, history, assets, investment, holdings] },
];
export const UNAVAILABLE_TUTORIALS = ['미수거래', '선물', '신용융자', '공매도', '레버리지 ETF', '옵션'];
export const TUTORIAL_SOURCES = [
  ['주식 수수료·세금', 'https://www1.kiwoom.com/h/domestic/stock/VStockMainView?dummyVal=0'],
  ['예수금·재사용가능금액·미수금', 'https://help2.kbsec.com/0362.html'],
];
