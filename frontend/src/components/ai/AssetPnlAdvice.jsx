import { useEffect, useId, useRef, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { fetchAssetCoach } from '../../api/data';
import { kstStamp } from '../../utils/kstStamp';
import { won, signTextClass } from '../../utils/format';
import './AssetPnlAdvice.css';

// 처음 펼칠 때 한 번만 계좌 조언을 요청한다. 접힌 상태에서는 AI를 부르지 않는다.
export default function AssetPnlAdvice({ amount, id, accountId, practice = false }) {
  const [expanded, setExpanded] = useState(false);
  const [coach, setCoach] = useState({ status: practice || !accountId ? 'general' : 'idle' });
  const job = useRef(null);
  const bodyId = useId();
  const bannerRef = useRef(null);
  const loss = amount < 0;
  const neutral = amount === 0;
  useEffect(() => () => job.current?.abort(), []);
  function load() {
    job.current?.abort();
    const controller = new AbortController();
    job.current = controller;
    setCoach({ status: 'loading' });
    fetchAssetCoach(accountId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setCoach(data.status === 'ok' ? { status: 'ok', data } : { status: 'general' }); })
      .catch(() => { if (!controller.signal.aborted) setCoach({ status: 'error' }); });
  }
  function toggle() {
    if (!expanded && coach.status === 'idle') load();
    setExpanded(!expanded);
  }
  const advice = coach.data;
  const meta = coach.status === 'loading' ? '분석 중'
    : coach.status === 'ok' ? `${kstStamp(advice.as_of)} 기준 · 내 계좌 분석` : '기본 안내';
  return <section id={id} className="asset-pnl-advice" aria-label="AI 투자 코치" onKeyDown={event => {
    if (event.key === 'Escape' && expanded) { event.stopPropagation(); setExpanded(false); bannerRef.current?.focus({ preventScroll: true }); }
  }}>
    <button ref={bannerRef} type="button" className="asset-pnl-advice-banner" aria-expanded={expanded} aria-controls={bodyId} onClick={toggle}>
      <Sparkles size={19} className="asset-pnl-advice-icon" aria-hidden="true" />
      <span className="asset-pnl-advice-headline"><strong className={signTextClass(amount)}>{won(Math.abs(amount))}</strong>{neutral ? '의 평가손익! 다음 투자는 어떻게 준비할까요? 🙂' : loss ? '의 손실! 어떻게 해야 할까요? 😢' : '의 수익! 어떻게 해야 현명한 투자자일까요? 😉'}</span>
      <ChevronRight size={18} className={`asset-pnl-advice-chevron${expanded ? ' is-open' : ''}`} aria-hidden="true" />
    </button>
    <div id={bodyId} className={`asset-pnl-advice-expansion${expanded ? ' is-open' : ''}`} inert={!expanded} aria-hidden={!expanded}>
      <div className="asset-pnl-advice-clip"><article className="asset-pnl-advice-body" aria-busy={coach.status === 'loading'}>
        <div className="asset-pnl-advice-meta"><span><Sparkles size={13} aria-hidden="true" /> AI 투자 코치</span><span>{meta}</span></div>
        {coach.status === 'loading' ? <div className="asset-pnl-advice-loading" role="status">
          <span /><span /><span />
          <p>계좌 데이터를 살펴보는 중입니다…</p>
        </div> : coach.status === 'ok' ? <>
          <h3>{twoLines(advice.headline)}</h3>
          <p>{advice.intro}</p>
          <ol>{advice.checkpoints.map(item => <li key={item.title}><h4>{item.title}</h4><p>{emphasized(item.body, advice.emphasis)}</p>{item.detail && <p>{emphasized(item.detail, advice.emphasis)}</p>}</li>)}</ol>
          {advice.takeaway && <p className="asset-pnl-advice-takeaway">{emphasized(advice.takeaway, advice.emphasis)}</p>}
          <p className="asset-pnl-advice-note">{advice.disclaimer} 배너 금액은 조회 시점에 따라 본문과 조금 다를 수 있습니다.</p>
        </> : <>
          <GeneralAdvice loss={loss} neutral={neutral} />
          {coach.status === 'error' ? <p className="asset-pnl-advice-note" role="status">AI 조언을 불러오지 못해 일반적인 점검 항목을 보여 드립니다. <button type="button" className="asset-pnl-advice-retry" onClick={load}>다시 시도</button></p>
            : <p className="asset-pnl-advice-note">모의투자 연습용 설명이며 투자 권유가 아닙니다.</p>}
        </>}
        <button type="button" className="asset-pnl-advice-close" onClick={() => { setExpanded(false); bannerRef.current?.focus({ preventScroll: true }); }}>조언 접기</button>
      </article></div>
    </div>
  </section>;
}

// 제목이 쉼표로 이어진 두 절이면 쉼표 뒤에서 줄을 바꾼다.
function twoLines(headline) {
  const at = headline.indexOf(', ');
  if (at < 6 || headline.length - at < 8) return headline;
  return <>{headline.slice(0, at + 1)}<br />{headline.slice(at + 2)}</>;
}

// 서버가 알려 준 구절만 굵게 보여 준다. 글은 모두 텍스트로만 넣고 HTML로 해석하지 않는다.
function emphasized(text, phrases = []) {
  let parts = [text];
  for (const phrase of phrases) {
    parts = parts.flatMap((part, index) => {
      const at = typeof part === 'string' ? part.indexOf(phrase) : -1;
      return at < 0 ? [part] : [part.slice(0, at), <strong key={`${phrase}:${index}`}>{phrase}</strong>, part.slice(at + phrase.length)];
    });
  }
  return parts;
}

// AI 조언을 쓸 수 없을 때(실패, 보유 종목 없음, 연습 화면) 보여 주는 일반 점검 항목.
function GeneralAdvice({ loss, neutral }) {
  return <>
    <h3>{neutral ? '다음 투자에도 나만의 기준을 세워 보시기 바랍니다.' : loss ? '손실을 서둘러 만회하기보다 계좌부터 살펴봅니다.' : '수익이 났을 때가 투자 원칙을 점검할 기회입니다.'}</h3>
    <p>{neutral ? '수익과 손실이 균형을 이루고 있습니다. 다음 주문 전에 투자 이유와 감당할 수 있는 손실을 정해 보시기 바랍니다.' : loss ? '손실을 보면 마음이 급해질 수 있습니다. 본전을 빨리 되찾으려 하기보다, 보유 이유와 투자 비중을 먼저 살펴보시기 바랍니다.' : '반가운 결과입니다. 이번 결과만으로 투자금을 크게 늘리기보다, 어떤 판단이 도움이 됐는지 돌아보시기 바랍니다.'}</p>
    <ol>
      <li><h4>{loss ? '더 사기 전에 매수 이유부터 확인합니다' : '처음 세운 목표를 다시 확인합니다'}</h4><p>{loss ? '가격이 내려갔다는 사실만으로 판단하기보다, 처음 기대했던 실적과 사업 전망이 여전히 유효한지 먼저 확인해 보시기 바랍니다.' : '목표 수익률과 투자 기간에 가까워졌는지 살펴보시기 바랍니다. 단순히 올랐다는 이유보다는 앞으로도 보유할 근거가 있는지 점검합니다.'}</p></li>
      <li><h4>한 종목에 너무 많이 담고 있는지 확인합니다</h4><p>{loss ? '특정 종목이나 업종에 몰려 있다면 추가 하락의 영향도 커질 수 있습니다. 현재 평가금액 기준 비중을 확인하고, 그 비중이 감당할 수 있는 수준인지 검토해 보시기 바랍니다.' : '주가가 오르면서 한 종목의 비중이 처음 계획보다 커졌을 수 있습니다. 쏠림이 커졌다면 계좌 전체의 주식 비중과 현금 비중을 어떻게 둘지 검토해 보시기 바랍니다.'}</p></li>
      <li><h4>다음 결정을 숫자와 기록으로 남깁니다</h4><p>감당할 수 있는 추가 손실과 보유 기간을 적어 보시기 바랍니다. 개인·외국인·기관의 매매 동향은 실적과 뉴스와 함께 참고하고, 순매수만으로 상승을 확신하지 않는 것이 좋습니다.</p></li>
    </ol>
  </>;
}
