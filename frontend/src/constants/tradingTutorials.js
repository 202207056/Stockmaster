// Tours of existing site controls. No answer fields, scoring or separate lesson UI.
const action = (target, title, text, event) => ({ target, title, text, event });
const read = (target, title, text) => ({ target, title, text, read: true });
const search = action('search', '종목 검색', '검색창에 예시를 입력하고 검색하세요. 실제 트레이딩에서도 종목명이나 코드로 찾습니다.', 'search');
const stock = action('stock', '종목 선택', '목록에서 예시전자를 선택하세요. 선택한 종목의 차트와 주문 정보가 열립니다.', 'stock');
const account = action('account', '주문 계좌 선택', '계좌 선택에서 매매 연습 계좌를 선택하세요. 주문과 잔고는 선택한 계좌에만 반영됩니다.', 'account');
const buy = action('order-fields', '매수 주문 입력', '구분에서 매수를 선택하고 수량을 입력하세요. 10주로 연습할 수 있습니다. 아래 예상 거래금액도 함께 바뀝니다.', 'buy-fields');
const sell = action('order-fields', '매도 주문 입력', '구분을 매도로 바꾸고 보유 수량 안에서 수량을 입력하세요. 일부를 매도하면 남은 주식을 살펴볼 수 있습니다.', 'sell-fields');
const amount = read('amount', '주문금액 확인', '예상 거래금액은 조회 가격과 수량을 곱한 금액입니다. 이 사이트 모의거래는 수수료·세금을 제외합니다. 실제 증권사 거래에는 비용이 발생할 수 있습니다.');
const prepare = action('place', '주문 확인 창', '모의 주문 버튼으로 계좌·종목·수량·예상 금액을 확인하세요. 확인 창을 여는 것만으로 주문되지는 않습니다.', 'prepare');
const confirm = action('dialog', '주문 실행', '주문 내용을 확인한 뒤 주문 버튼을 누르세요. 이 사이트는 즉시 체결 모의거래입니다. 실제 시장에서는 접수와 체결이 다르며 미체결·부분 체결도 가능합니다.', 'filled');
const close = action('dialog', '체결 결과 확인', '완료 창의 체결가격과 체결수량을 살펴본 뒤 확인을 누르세요. 주문 전 예상 가격과 실제 체결가격을 구분해서 확인합니다.', 'closed');
const history = read('history', '주문내역 확인', '주문번호·종목·매수/매도 구분·체결수량·체결가격·상태를 확인하세요. 주문내역을 확인한 뒤 내 자산에서 보유수량과 현금 변화를 확인할 수 있습니다.');
const assets = action('assets-link', '내 자산 이동', '내 자산 보기를 눌러 현금과 보유종목에 반영된 결과를 확인하세요.', 'assets');
const total = read('asset-total', '총자산과 현금', '총자산은 현금과 보유 주식 평가금액의 합계입니다. 주식을 사면 현금 일부가 주식으로 바뀝니다. 이 사이트는 수수료·세금을 제외하므로 같은 가격으로 거래하면 총자산은 유지됩니다.');
const investment = read('asset-investment', '매입금액과 평가손익', '매입금액은 평균 매입단가와 보유수량을 곱한 금액입니다. 평가손익은 보유 주식의 현재 평가금액과 매입금액의 차이입니다. 이 사이트에서는 수수료·세금을 제외합니다.');
const holdings = read('asset-holdings', '보유종목 확인', '보유수량·평균단가·현재가·평가손익을 확인하세요. 평균단가는 매수 체결가격을 수량으로 가중평균한 값이며 현재가와 다를 수 있습니다.');
const back = action('trading-link', '트레이딩 이동', '보유종목의 종목명 또는 트레이딩으로 가기를 눌러 돌아가세요. 같은 연습 계좌와 보유수량이 유지됩니다.', 'trading');

export const TRADING_TUTORIALS = [
  { id: 'buy', title: '매수와 자산 변화', description: '종목을 찾아 매수하고 내 자산에서 현금과 주식을 확인합니다.', group: '거래', steps: [search, stock, account, buy, amount, prepare, confirm, close, history, assets, total, investment, holdings] },
  { id: 'sell', title: '매도와 보유수량', description: '보유 주식 일부를 매도하고 매도금액·잔여 수량을 확인합니다.', group: '거래', seeded: true, steps: [stock, account, sell, amount, prepare, confirm, close, history, assets, investment, holdings] },
  { id: 'orders', title: '주문 확인과 체결내역', description: '주문 확인 창에서 취소한 뒤 다시 주문하고 체결내역을 조회합니다.', group: '거래', steps: [stock, account, buy, prepare, action('dialog', '전송 전 취소', '취소를 눌러 확인 창을 닫으세요. 아직 전송하지 않아 현금이나 보유수량 변화가 없습니다. 체결된 주문을 취소하는 기능과는 다릅니다.', 'cancelled'), read('history', '취소 후 내역 확인', '체결내역이 생기지 않았는지 확인하세요. 이 사이트는 즉시 체결 방식으로 미체결 주문 정정·취소 기능은 제공하지 않습니다.'), prepare, confirm, close, action('history-refresh', '체결내역 새로고침', '내역 새로고침을 눌러 조회하세요. 응답이 불확실할 때는 같은 주문을 다시 보내기 전에 내역을 확인합니다.', 'history-refresh'), history] },
  { id: 'account', title: '계좌 선택과 자산 조회', description: '두 계좌를 전환하며 계좌별 현금과 보유종목을 살펴봅니다.', group: '계좌', seeded: true, start: '/assets', steps: [account, total, investment, holdings, back, read('account', '거래 계좌 확인', '자산 화면에서 선택한 매매 연습 계좌가 주문 영역에도 유지됩니다. 주문 확인 창의 계좌명과 계좌번호도 함께 확인하세요.')] },
  { id: 'settlement', title: '체결과 결제', description: '매도 후 자산 반영을 확인하고 실제 시장의 결제 시차를 구분합니다.', group: '계좌', seeded: true, steps: [stock, account, sell, prepare, confirm, close, assets, read('asset-total', '모의계좌 현금 반영', '이 사이트는 수수료·세금 없이 매도대금을 현금에 즉시 반영합니다. 주문가능금액은 모의거래에 사용할 금액입니다. 실제 증권계좌의 출금가능금액과 같다는 뜻은 아닙니다.'), read('asset-investment', '실제 주식의 결제일', '실제 국내 상장주식은 거래일로부터 2영업일 뒤 결제합니다(T+2). 공휴일 없는 월요일 매도는 수요일 결제입니다. 매도대금 재사용과 은행 출금은 다르며 실제 출금은 증권사의 출금가능금액을 확인합니다. 이 사이트에는 은행 출금·결제일 이동 기능이 없습니다.'), holdings] },
  { id: 'review', title: '매매와 계좌 확인', description: '매수부터 자산 조회·일부 매도·체결내역 확인까지 이어서 사용합니다.', group: '종합', steps: [search, stock, account, buy, prepare, confirm, close, assets, investment, holdings, back, sell, amount, prepare, confirm, close, history, assets, investment, holdings] },
];
export const UNAVAILABLE_TUTORIALS = ['미수거래', '선물', '신용융자', '공매도', '레버리지 ETF', '옵션'];
export const TUTORIAL_SOURCES = [
  ['예수금·재사용가능금액·미수금', 'https://help2.kbsec.com/0362.html'],
];
