import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CandleChart from './CandleChart';
import { CHART_TYPES } from '../../utils/chartTypes';
import { CHART_GUIDE_TYPES, CHART_GUIDE_ROWS } from '../../constants/chartGuideContent';
import ChartConceptDialog from '../learn/ChartConceptDialog';
import { CANDLE_WALKTHROUGH } from '../../constants/candleWalkthrough';
import { ALWAYS_SHOW_CHART_TUTORIAL } from '../../config/features';
import { buyTutorialKey, hasCompletedBuyTutorial, completeBuyTutorial } from '../../utils/orderTypes';
import '../learn/ChartLearning.css';

export default function ChartWorkspace({ rows, userId, periodLabel, period, onPeriod, replay = false, onReplayClose, allowTutorial = true, demo = false, emptyContent, repeatTutorial = ALWAYS_SHOW_CHART_TUTORIAL }) {
  const [type, setType] = useState('line');
  const [scale, setScale] = useState('linear');
  const [ma, setMa] = useState(0);
  const [volume, setVolume] = useState(false);
  const [box, setBox] = useState('');
  const [tour, setTour] = useState(replay ? 0 : null);
  const [concept, setConcept] = useState(null);
  const [candleStep, setCandleStep] = useState(0);
  const dismissed = useRef(false), original = useRef('line'), root = useRef(null), note = useRef(null);
  const navigate = useNavigate();
  const key = buyTutorialKey(userId).replace('buy-tutorial:v2', 'chart-tutorial:v1');
  const running = tour !== null;
  const candleLesson = running && type === 'candle' ? CANDLE_WALKTHROUGH[candleStep] : null;
  const selected = CHART_TYPES.find(item => item.id === type);
  const guide = CHART_GUIDE_TYPES.find(item => item[0] === type);
  const boxSize = Number(box) > 0 ? Number(box) : Math.max(1, Math.round((rows?.[0]?.close || 10000) / 100));
  const close = () => { setConcept(null); setTour(null); setType(original.current); dismissed.current = true; onReplayClose?.(); };
  const intercept = event => {
    if (event.type === 'keydown' && ['Tab', 'Shift', 'Escape'].includes(event.key)) return;
    if (!allowTutorial || running || (!repeatTutorial && (dismissed.current || hasCompletedBuyTutorial(key))) || !rows?.length) return;
    event.preventDefault(); original.current = type; setType('line'); setTour(0);
  };
  useEffect(() => {
    if (!running) return;
    const previous = document.activeElement, restored = [];
    let branch = root.current;
    while (branch && branch !== document.body) {
      for (const sibling of branch.parentElement?.children || []) if (sibling !== branch && sibling instanceof HTMLElement) { restored.push([sibling, sibling.inert]); sibling.inert = true; }
      branch = branch.parentElement;
    }
    return () => { restored.forEach(([node, inert]) => { node.inert = inert; }); previous?.focus?.({ preventScroll: true }); };
  }, [running]);
  useEffect(() => {
    if (!running) return;
    if (concept) return;
    const target = root.current.querySelector(candleLesson ? '[data-candle-target]' : '[data-chart-selector]');
    const position = () => {
      const rect = target.getBoundingClientRect(), popup = note.current;
      if (!popup) return;
      const width = document.documentElement.clientWidth || window.innerWidth;
      popup.style.width = Math.min(340, width - 24) + 'px';
      popup.style.maxHeight = Math.max(120, Math.floor(window.innerHeight * .44)) + 'px';
      const height = popup.getBoundingClientRect().height;
      const popupWidth = popup.getBoundingClientRect().width;
      const chartRect = root.current.getBoundingClientRect();
      const above = rect.top - height - 14;
      const below = rect.bottom + 14;
      const rightRoom = width - chartRect.right >= popupWidth + 24;
      const leftRoom = chartRect.left >= popupWidth + 24;
      const left = rightRoom ? chartRect.right + 14 : leftRoom ? chartRect.left - popupWidth - 14 : rect.left;
      popup.style.left = Math.max(12, Math.min(left, width - popupWidth - 12)) + 'px';
      popup.style.top = Math.max(12, Math.min(rightRoom || leftRoom ? rect.top : above >= 12 ? above : below, window.innerHeight - height - 12)) + 'px';
    };
    target.scrollIntoView?.({ block: 'center', behavior: 'instant' });
    position(); if (!candleLesson) target.focus?.({ preventScroll: true });
    const followLayout = () => {
      const rect = target.getBoundingClientRect();
      if (rect.top < 12 || rect.bottom > window.innerHeight - 12) target.scrollIntoView?.({ block: 'center', behavior: 'instant' });
      position();
    };
    const observer = new ResizeObserver(followLayout); observer.observe(root.current); observer.observe(target); if (note.current) observer.observe(note.current);
    window.addEventListener('resize', followLayout); window.addEventListener('scroll', position, true);
    return () => { observer.disconnect(); window.removeEventListener('resize', followLayout); window.removeEventListener('scroll', position, true); };
  }, [running, tour, concept, candleLesson]);
  const advanceCandle = () => {
    if (!candleLesson || concept) return;
    if (candleStep < CANDLE_WALKTHROUGH.length - 1) setCandleStep(step => step + 1);
    else { setType('bar'); setTour(2); }
  };
  const finish = (openGuide = false) => { completeBuyTutorial(key); close(); if (openGuide) navigate('/learn/charts'); };
  return <div ref={root} className={`chart-workspace ${running ? 'chart-tour-active' : ''}`} role={running ? 'dialog' : undefined} aria-modal={running || undefined} aria-label={running ? '차트 유형 둘러보기' : undefined} onClick={event => {
    if (event.target.closest('button, select, input, label, a, summary, dialog') || window.getSelection?.()?.toString()) return;
    advanceCandle();
  }} onKeyDown={event => {
    if (candleLesson && !concept && ['Enter', ' '].includes(event.key) && event.target.matches('svg[tabindex]')) { event.preventDefault(); advanceCandle(); }
    if (running && event.key === 'Escape') { event.stopPropagation(); close(); }
    if (running && event.key === 'Tab') {
      const controls = [...root.current.querySelectorAll('button:not(:disabled), select:not(:disabled), summary, a[href], svg[tabindex]')];
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  }}>
    <div className="chart-controls">
      <label>그래프 종류<select data-chart-selector aria-label="그래프 종류" value={type} onPointerDown={intercept} onKeyDown={intercept} onChange={event => {
        if (!running && allowTutorial && (repeatTutorial || (!dismissed.current && !hasCompletedBuyTutorial(key))) && rows?.length) { original.current = type; setType('line'); setTour(0); return; }
        setType(event.target.value);
        if (running && event.target.value === CHART_TYPES[tour + 1]?.id) { setTour(tour + 1); if (event.target.value === 'candle') setCandleStep(0); }
      }}>{CHART_TYPES.map(item => <option key={item.id} value={item.id} disabled={running && ![CHART_TYPES[tour].id, CHART_TYPES[tour + 1]?.id].includes(item.id)}>{item.label}</option>)}</select></label>
      {onPeriod && <div role="group" aria-label="차트 표시 기간">{Object.entries({ D: '1일', W: '1주', M: '3개월', Y: '1년' }).map(([value, text]) => <button key={value} disabled={running} aria-pressed={period === value} onClick={() => onPeriod(value)}>{text}</button>)}</div>}
      <label>가격 축<select aria-label="가격 축" value={running ? 'linear' : scale} disabled={running} onChange={event => setScale(event.target.value)}><option value="linear">선형</option><option value="log">로그</option></select></label>
    </div>
    {type === 'renko' && <label className="chart-setting">벽돌 크기 (원)<input aria-label="벽돌 크기 (원)" type="number" min="1" value={running ? 4 : box || boxSize} disabled={running} onChange={event => setBox(event.target.value)} /></label>}
    {!running && <details className="chart-settings"><summary>보조 표시 설정</summary><label>단순이동평균<select aria-label="이동평균 기간" value={ma} onChange={event => setMa(Number(event.target.value))}><option value="0">없음</option><option value="5">5기간</option><option value="20">20기간</option></select></label><label><input type="checkbox" checked={volume} onChange={event => setVolume(event.target.checked)} />거래량</label><p>합성 차트에는 이동평균·거래량을 중복 표시하지 않습니다.</p></details>}
    {(running || rows?.length) ? <CandleChart key={type} candleStep={candleLesson ? candleStep : undefined} showPriceTable={!running && !demo} rows={running ? CHART_GUIDE_ROWS : rows} type={type} scale={running ? 'linear' : scale} boxSize={running ? 4 : boxSize} maPeriod={running ? 0 : ma} showVolume={!running && volume} periodLabel={running ? '학습 예시' : periodLabel} onExplain={running ? () => setConcept(type) : undefined} /> : emptyContent || <p className="p-8 text-sm text-gray-500">차트 데이터를 불러온 뒤 유형 소개를 시작할 수 있습니다.</p>}
    {!running && <div className="chart-learning-links"><Link to="/learn/charts">차트 자세히 배우기</Link><button disabled={!rows?.length} onClick={() => { original.current = type; setType('line'); setTour(0); }}>유형 소개 다시 보기</button></div>}
    {running && !concept && <div ref={note} className="chart-tour-note" role="status" aria-live="polite"><button className="chart-tour-close" aria-label="차트 안내 종료" onClick={close}>×</button><small>{tour + 1} / {CHART_TYPES.length} · 같은 가격, 일곱 가지 그림</small>{candleLesson ? <><h3>{candleLesson.title}</h3><p>{candleLesson.text}</p><p className="chart-tour-purpose">{candleLesson.takeaway}</p><div className="chart-tour-actions">{candleStep>0 && <button type="button" onClick={()=>setCandleStep(step=>step-1)}>이전 봉 설명</button>}{candleStep === CANDLE_WALKTHROUGH.length - 1 && <button type="button" onClick={()=>setConcept('candle')}>전체 구조 크게 보기</button>}</div><p className="chart-tap-hint">화면을 탭하면 다음 설명으로 넘어갑니다.</p></> : <><h3>{selected.label}</h3><p className="chart-tour-purpose">{guide[2]}</p><p>{guide[3]}</p><p className="chart-tour-caution">{guide[4]}</p><div className="chart-tour-actions"><button type="button" onClick={() => setConcept(type)}>{{line:'캔들과 정보 차이 보기',bar:'같은 네 가격, 캔들과 비교',area:'채우기 전 꺾은선과 비교',baseline:'기준선을 넣기 전과 비교',heikin:'원래 캔들과 비교',renko:'시간 기준 캔들과 비교'}[type]}</button></div></>}
{tour < CHART_TYPES.length - 1 ? !candleLesson && <p><strong>그래프 종류를 ‘{CHART_TYPES[tour + 1].label}’ 항목으로 바꿔 보세요.</strong></p> : <><p>가격 축·돌파·거래량·이동평균도 같은 화면에서 비교해 보세요.</p><div className="chart-tour-actions"><button type="button" onClick={() => setConcept('comparisons')}>그래프 모양과 지표 비교</button><button type="button" onClick={() => finish()}>튜토리얼 마치기</button><button type="button" onClick={() => finish(true)}>상세 차트 학습 시작</button></div></>}</div>}
    {running && concept && <ChartConceptDialog key={`concept:${concept}`} kind={concept} onClose={() => setConcept(null)}/>}

  </div>;
}
