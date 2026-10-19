// Only terms with a relevant, existing screen receive a destination.
const destinations = {};
function connect(ids, to, label) {
  for (const id of ids.split(' ')) destinations[id] = { to, label };
}

connect('symbol_code current_price change_rate prev_close', '/trading', '트레이딩에서 확인');
connect('open_price close_price high_low volume candle moving_average', '/learn/charts', '차트 학습');
connect('buy limit_order market_order order_book tick_size fee', '/learn/tutorial/buy', '매수·주문유형 연습');
connect('sell hold_quantity', '/learn/tutorial/sell', '매도와 보유수량 연습');
connect('execution pending_order cancel_order', '/learn/tutorial/orders', '주문·체결내역 연습');
connect('deposit orderable_cash avg_price buy_amount eval_amount eval_pnl return_rate total_asset portfolio', '/assets', '내 자산에서 확인');
connect('liquidity slippage', '/learn?tab=courses&lesson=A3', '시장가와 체결가격 학습');
connect('realized_pnl stop_loss take_profit', '/learn?tab=courses&lesson=B1', '평가손익과 실현손익 학습');
connect('averaging_down', '/learn?tab=courses&lesson=B3', '추가 매수와 평균단가 학습');
connect('diversification', '/learn?tab=courses&lesson=C1', '투자 비중과 위험 학습');
connect('risk_profile', '/mypage', '투자성향 확인');

export const GLOSSARY_DESTINATIONS = Object.freeze(destinations);
