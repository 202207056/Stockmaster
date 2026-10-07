import TutorialPointer from './TutorialPointer';
import '../../pages/TradingTutorial.css';
import { useEffect, useRef, useState } from 'react';
import './AssetsTour.css';

const steps = [
  ['account', '계좌 선택', '선택된 계좌의 자산이 아래에 표시됩니다. 계좌가 여러 개라면 이곳에서 바꿔 조회할 수 있습니다. 계좌를 바꾸어도 주문이 실행되지는 않습니다.'],
  ['total', '총자산', '선택한 계좌의 현금과 보유종목 평가금액을 합한 값입니다. 미수 부족금과 결제 대기 매도대금이 있으면 함께 반영됩니다. 예수금·주문가능금액·평가손익도 여기서 확인합니다.'],
  ['investment', '내 투자', '매입금액은 보유 주식을 사는 데 든 금액, 평가금액은 현재 시세로 계산한 금액입니다. 평가손익은 두 금액의 차이이며, 이 화면에서는 수수료·세금을 제외합니다.'],
  ['holdings', '보유종목', '선택한 계좌의 보유수량·평균단가·현재가·평가손익을 확인합니다. 보유종목이 없으면 빈 목록이 표시됩니다. 종목명을 누르면 해당 종목의 트레이딩 화면으로 이동합니다.'],
];
export default function AssetsTour({ surfaceRef, accountCount, onClose }) {
  const [step,setStep] = useState(0);
  const note = useRef(null), pointer = useRef(null);
  const [targetId,title,text] = steps[step];
  useEffect(()=>{
    const target=surfaceRef.current.querySelector('[data-assets-tour="'+targetId+'"]');
    if(!target) return;
    target.classList.add('assets-tour-target');
    const position=()=>{
      const rect=target.getBoundingClientRect(), popup=note.current;
      Object.assign(pointer.current.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
      const width=document.documentElement.clientWidth || window.innerWidth;
      popup.style.width=Math.min(300,width-24)+'px';
      popup.style.maxHeight=Math.max(120,window.innerHeight-24)+'px';
      const box=popup.getBoundingClientRect();
      const left=rect.right+box.width+12<=width-12 ? rect.right+12 : rect.left-box.width-12>=12 ? rect.left-box.width-12 : rect.left;
      popup.style.left=Math.max(12,Math.min(left,width-box.width-12))+'px';
      popup.style.top=Math.max(12,Math.min(rect.top,window.innerHeight-box.height-12))+'px';
    };
    const change=()=>{if(targetId==='account') setStep(1);};
    target.addEventListener('change',change);
    position(); note.current.focus({preventScroll:true});
    const observer=new ResizeObserver(position);
    observer.observe(target); observer.observe(note.current); observer.observe(surfaceRef.current);
    window.addEventListener('resize',position);
    window.addEventListener('scroll',position,true);
    return ()=>{
      target.classList.remove('assets-tour-target'); target.removeEventListener('change',change);
      observer.disconnect(); window.removeEventListener('resize',position); window.removeEventListener('scroll',position,true);
    };
  },[step,targetId,surfaceRef]);
  const next=()=>step===steps.length-1 ? onClose() : setStep(step+1);
  return <><div ref={pointer} className="assets-tour-pointer"><TutorialPointer/></div><div ref={note} className="assets-tour-note tutorial-local-note" role="region" aria-label={title+' 안내'} tabIndex={0}
    onClick={event=>{if(!event.target.closest('button') && !window.getSelection()?.toString()) next();}}
    onKeyDown={event=>{
      if(event.key==='Escape'){event.stopPropagation();onClose();}
      if(event.target===note.current && ['Enter',' '].includes(event.key)){event.preventDefault();next();}
    }}>
    <button type="button" className="assets-tour-close" aria-label="자산 안내 종료" onClick={onClose}>×</button>
    <strong className="block text-sm text-brand-700">{title}</strong><p className="mt-1 text-sm leading-relaxed text-gray-600">{targetId==='account' && accountCount===1 ? '현재 계좌는 하나입니다. 아래 금액과 보유종목은 이 계좌의 조회 결과입니다. 계좌가 추가되면 이곳에서 전환할 수 있습니다.' : text}</p>
    <button type="button" className="tutorial-action mt-3" onClick={next}>확인했어요</button>
    {step>0 && <button type="button" className="assets-tour-back" onClick={()=>setStep(step-1)}>뒤로가기</button>}
  </div></>;
}
