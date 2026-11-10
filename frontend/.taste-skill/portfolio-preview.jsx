import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {comma, won} from '/src/utils/format';
import '/src/index.css';
import '/src/pages/Assets.css';
const colors=['#6952a3','#8877c5','#b8acd8','#9ca3af'];
function PortfolioPie({ slices }) {
  const [selected, setSelected] = useState(null);
  if (slices === null) return <div className="assets-chart-empty">평가금액을 확인하면 비중이 표시됩니다.</div>;
  const total = slices.reduce((sum, item) => sum + item.value, 0);
  if (!total) return <div className="assets-chart-empty">보유한 종목이 없습니다.</div>;
  const groups = slices;
  const focused = groups.find(item => item.code === selected);
  return <div className="assets-portfolio-chart">
    <div className="assets-pie"><svg viewBox="0 0 200 200" role="img" aria-label={`보유종목 평가금액 ${won(total)}의 종목별 비중`}>
      {groups.map((item, index) => {
        const share = item.value / total;
        const start = groups.slice(0, index).reduce((sum, item) => sum + item.value / total, 0) * Math.PI * 2 - Math.PI / 2;
        const end = start + share * Math.PI * 2;
        const title = <title>{item.name}: {comma(share * 100, 1)}%, {won(item.value)}</title>;
        const opacity = focused && selected !== item.code ? .4 : 1;
        return share === 1
          ? <circle key={item.code} cx="100" cy="100" r="90" fill={colors[index % colors.length]} opacity={opacity}>{title}</circle>
          : <path key={item.code} d={`M 100 100 L ${100 + 90 * Math.cos(start)} ${100 + 90 * Math.sin(start)} A 90 90 0 ${share > .5 ? 1 : 0} 1 ${100 + 90 * Math.cos(end)} ${100 + 90 * Math.sin(end)} Z`} fill={colors[index % colors.length]} stroke="var(--surface, #fff)" strokeWidth="0.5" opacity={opacity}>{title}</path>;
      })}
    </svg><div className="assets-pie-label" aria-live="polite"><span>{focused?.name || '주식 평가금액'}</span><strong>{won(focused?.value ?? total)}</strong></div></div>
    <ul className="assets-chart-legend" aria-label="종목별 포트폴리오 비중">{groups.map((item, index) => <li key={item.code}><button type="button" aria-pressed={selected === item.code} onClick={() => setSelected(selected === item.code ? null : item.code)}><i style={{ background: colors[index % colors.length] }} /><span>{item.name}</span><strong>{comma(item.value / total * 100, 1)}%</strong><small>{won(item.value)}</small></button></li>)}</ul>
  </div>;
}

const slices=Array.from({length:20},(_,i)=>({code:String(i),name:i===0?'삼성전자':'Holding '+(i+1),value:500000}));
createRoot(document.getElementById('root')).render(<main className="assets-page" style={{padding:24,maxWidth:1200,margin:'auto'}}><div className="assets-overview"><section className="assets-balance"><div className="assets-section-title"><h2>총자산</h2></div><p className="assets-total">12,000,000원</p><dl className="assets-stats"><div><dt>예수금</dt><dd>2,000,000원</dd></div><div><dt>주문가능금액</dt><dd>2,000,000원</dd></div><div><dt>평가손익</dt><dd>500,000원</dd></div></dl></section><section className="assets-investment" style={{minHeight:280}}><h2>내 투자</h2></section></div><section className="assets-chart-panel" style={{maxWidth:600}}><div className="assets-section-title"><h2>보유종목 포트폴리오</h2><span>평가금액 비중</span></div><PortfolioPie slices={slices}/></section><section className="assets-chart-panel" style={{maxWidth:600}}><PortfolioPie slices={slices.slice(0,1)}/></section></main>);