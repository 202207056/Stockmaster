import { useId, useRef, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { won, signTextClass } from '../../utils/format';
import './AssetPnlAdvice.css';

export default function AssetPnlAdvice({ amount, id }) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();
  const bannerRef = useRef(null);
  const loss = amount < 0;
  const neutral = amount === 0;
  return <section id={id} className="asset-pnl-advice" aria-label="AI 투자 코치" onKeyDown={event => {
    if (event.key === 'Escape' && expanded) { event.stopPropagation(); setExpanded(false); bannerRef.current?.focus({ preventScroll: true }); }
  }}>
    <button ref={bannerRef} type="button" className="asset-pnl-advice-banner" aria-expanded={expanded} aria-controls={bodyId} onClick={() => setExpanded(!expanded)}>
      <Sparkles size={19} className="asset-pnl-advice-icon" aria-hidden="true" />
      <span className="asset-pnl-advice-headline"><strong className={signTextClass(amount)}>{won(Math.abs(amount))}</strong>{neutral ? '의 평가손익! 다음 투자는 어떻게 준비할까요? 🙂' : loss ? '의 손실! 어떻게 해야 할까요? 😢' : '의 수익! 어떻게 해야 현명한 투자자일까요? 😉'}</span>
      <ChevronRight size={18} className={`asset-pnl-advice-chevron${expanded ? ' is-open' : ''}`} aria-hidden="true" />
    </button>
    <div id={bodyId} className={`asset-pnl-advice-expansion${expanded ? ' is-open' : ''}`} inert={!expanded} aria-hidden={!expanded}>
      <div className="asset-pnl-advice-clip"><article className="asset-pnl-advice-body">
        <div className="asset-pnl-advice-meta"><span><Sparkles size={13} aria-hidden="true" /> AI 투자 코치</span><span>미리보기 · 예시 조언</span></div>
        {loss ? <LossAdvice /> : <>
        <h3>{neutral ? '다음 투자에도 나만의 기준을 세워보세요.' : '수익이 났을 때가 투자 원칙을 점검할 기회예요.'}</h3>
        <p>{neutral ? '수익과 손실이 균형을 이루고 있어요. 다음 주문 전에 투자 이유와 감당할 수 있는 손실을 정해 보세요.' : loss ? '손실을 보면 마음이 급해질 수 있어요. 본전을 빨리 되찾기 위한 추가 매수보다는, 보유 이유와 투자 비중을 먼저 살펴보세요.' : '수익이 나서 기쁘시죠? 이번 결과만으로 투자금을 크게 늘리기보다, 어떤 판단이 도움이 됐는지 돌아보세요.'}</p>
        <ol>
          <li><h4>{loss ? '물타기 전에 매수 이유부터 확인해요' : '처음 세운 목표를 다시 확인해요'}</h4><p>{loss ? '가격이 내려갔다는 사실만으로 더 사지는 마세요. 처음 기대했던 실적과 사업 전망이 여전히 유효한지 확인한 뒤 추가 매수를 판단해요.' : '목표 수익률과 투자 기간에 가까워졌는지 살펴보세요. 단순히 올랐다는 이유보다는 앞으로도 보유할 근거가 있는지 점검해요.'}</p></li>
          <li><h4>한 종목에 너무 많이 담고 있지는 않나요?</h4><p>{loss ? '특정 종목이나 업종에 몰려 있다면 추가 하락의 영향도 커질 수 있어요. 현재 평가금액 기준 비중을 확인하고, 부담이 크다면 일부 비중 조절을 검토해요.' : '주가가 오르면서 한 종목의 비중이 처음 계획보다 커졌을 수 있어요. 쏠림이 커졌다면 일부 이익 실현이나 현금 비중 조절을 검토해요.'}</p></li>
          <li><h4>다음 결정을 숫자와 기록으로 남겨요</h4><p>감당할 수 있는 추가 손실과 보유 기간을 적어보세요. 개인·외국인·기관의 매매 동향은 실적과 뉴스와 함께 참고하되, 순매수만으로 상승을 확신하지 마세요.</p></li>
        </ol>
        </>}
        <p className="asset-pnl-advice-note">실제 AI 분석 전의 목업입니다. 배너 금액은 계좌 평가손익이며, 본문은 개별 종목·뉴스·투자자 동향을 분석하지 않은 예시입니다.</p>
        <button type="button" className="asset-pnl-advice-close" onClick={() => { setExpanded(false); bannerRef.current?.focus({ preventScroll: true }); }}>조언 접기</button>
      </article></div>
    </div>
  </section>;
}

function LossAdvice() {
  return <>
    <p className="asset-pnl-advice-example">예시 계좌: 토마토 · 2026년 11월 10일 조회 기준</p>
    <h3>260만 원을 서둘러 만회하기보다,<br />세 종목에 몰린 비중부터 살펴봐요.</h3>
    <p>지금 예시 계좌에서는 추가 물타기를 잠시 멈추고, 집중된 투자 비중을 줄일지 먼저 검토하는 편이 좋겠어요. 손실을 빨리 복구하려고 투자금을 늘리기 전에 아래 세 가지를 확인해 보세요.</p>
    <ol>
      <li><h4>남은 현금 63만 원은 일단 보유해요</h4><p>가격이 떨어졌다는 이유만으로 추가 매수하지 마세요. 현금을 더 투입하기 전에, 지금 가진 종목을 계속 보유할 근거가 있는지부터 확인해요.</p></li>
      <li><h4>SK하이닉스·삼성전기·삼성전자를 먼저 점검해요</h4><p>이 계좌는 <strong>매입금액의 약 85%가 세 종목에 집중</strong>돼 있어요. 각 종목에 대해 “지금 현금만 가지고 있어도 이 금액만큼 다시 살까?”를 생각해 보세요.</p><p>매수 이유가 깨졌거나 본전 회복만 기다리고 있다면 일부 비중을 줄일지 검토해요. 다만 최신 실적과 종목별 손실을 확인하지 않은 예시이므로, 어느 종목부터 팔아야 한다고 단정할 수는 없어요.</p></li>
      <li><h4>추가로 감당할 수 있는 손실을 금액으로 정해요</h4><p>주식 평가금액 약 <strong>672만 원이 여기서 10% 더 하락하면 약 67만 원의 추가 손실</strong>이 생겨요. 하락을 예측하는 말이 아니라, 내 계좌의 위험을 가늠하기 위한 예시예요.</p><p>그 정도의 추가 손실도 부담스럽다면, 주식 비중을 낮추고 현금을 확보하는 방향을 검토해 보세요.</p></li>
    </ol>
    <p>분산과 현금 비중 조절이 손실을 막아주지는 않지만, 특정 종목 때문에 계좌 전체가 크게 흔들릴 위험을 줄이는 데 도움이 될 수 있어요. <a href="https://www.investor.gov/introduction-investing/getting-started/asset-allocation" target="_blank" rel="noopener noreferrer">SEC 투자자 안내 ↗</a></p>
    <p className="asset-pnl-advice-takeaway">모의투자인 지금은 본전 회복보다 <strong>매수·보유·매도 기준을 세우는 연습</strong>에 집중해 보세요. “손실이니까 무조건 버틴다”거나 “무서우니까 전부 판다”는 마음 대신, 다음 결정을 내릴 근거를 기록해요.</p>
  </>;
}
