import { won } from '../../utils/format';
import { estimateMisu, misuDate } from '../../utils/misu';
import './Misu.css';

export default function MisuSummary({ cash, price, quantity, state, heldValue }) {
  const estimate = estimateMisu(price, quantity, cash);
  const debt = Number(state?.debt || 0);
  return <section data-tutorial-target="misu-summary" className="misu-summary" aria-label="미수 금액과 위험">
    <strong className="misu-danger">기한 내 돈을 채우지 못하면 강제로 팔릴 수 있어요.</strong>
    <p>미수거래는 주식값 일부만 먼저 내고, 나머지를 결제일까지 채우는 거래예요. 주가가 내려가도 갚을 돈은 줄지 않아요.</p>
    {debt > 0 ? <dl><div><dt>남은 결제 부족금</dt><dd>{won(debt)}</dd></div><div><dt>모의 납부기한 · 한국시간</dt><dd>{misuDate(state.due_at)}</dd></div>{heldValue != null && <div><dt>주식 평가액 − 부족금</dt><dd>{won(heldValue - debt)}</dd></div>}</dl> : estimate && <dl><div><dt>먼저 필요한 돈 · 증거금 50% + 수수료</dt><dd>{won(estimate.required)}</dd></div><div><dt>이 주문에 사용하는 내 현금</dt><dd>{won(estimate.paid)}</dd></div><div><dt>결제일까지 추가로 채울 돈</dt><dd>{won(estimate.shortfall)}</dd></div><div><dt>매수 수수료 · 0.015%</dt><dd>{won(estimate.commission)}</dd></div></dl>}
    <small>사이트 모의 규칙: 증거금 50% · 즉시 시장가 매수 · T+2 거래일 17시 납부. 실제 증거금률·납부 시각은 증권사와 종목마다 달라요. 미수는 장기간 빌리는 신용융자와 달라요.</small>
  </section>;
}
