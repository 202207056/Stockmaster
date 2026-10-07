import HelpIconButton from '../learn/HelpIconButton';
import { useLayoutEffect, useRef } from 'react';
import './OrderTypeHelp.css';

export default function OrderTypeHelp({ open, onOpenChange, kind, tutorial = false }) {
  const anchor = useRef(null), bubble = useRef(null);
  useLayoutEffect(() => {
    if (!open) return;
    const target = tutorial ? anchor.current.closest('[data-tutorial-target="type"]')?.querySelector('label') || anchor.current : anchor.current;
    const position = () => {
      const rect = target.getBoundingClientRect();
      const popup = bubble.current;
      const width = document.documentElement.clientWidth || window.innerWidth;
      const leftRoom = rect.left - 24;
      popup.style.width = Math.min(620, width - 24, tutorial && leftRoom >= 300 ? leftRoom : 620) + 'px';
      popup.style.maxHeight = Math.max(120, window.innerHeight - 24) + 'px';
      const box = popup.getBoundingClientRect();
      const right = rect.right + 12;
      const left = tutorial
        ? Math.max(12, rect.left - box.width - 12)
        : right + box.width <= width - 12 ? right : rect.left - box.width - 12 >= 12 ? rect.left - box.width - 12 : Math.max(12, width - box.width - 12);
      popup.style.left = left + 'px';
      popup.style.top = Math.max(12, Math.min(rect.top, window.innerHeight - box.height - 12)) + 'px';
    };
    position();
    bubble.current.focus({ preventScroll:true });
    const observer = new ResizeObserver(position);
    observer.observe(target); observer.observe(bubble.current);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => { observer.disconnect(); window.removeEventListener('resize', position); window.removeEventListener('scroll', position, true); };
  }, [open, tutorial]);
  const close = () => { onOpenChange(false); anchor.current?.focus({ preventScroll:true }); };
  const buy = kind === '매수';
  const items = [
    ['지정가', buy ? '살 때 낼 최대 가격을 정해요. 50,000원으로 주문하면 그 이하에서만 사요. 그 가격에 파는 사람이 없으면 체결되지 않아요.' : '팔 때 받을 최소 가격을 정해요. 그 가격 이상에서만 팔며, 사는 사람이 없으면 체결되지 않아요.'],
    ['시장가', '가격을 정하지 않고 상대편 주문과 거래해요. 물량에 따라 여러 가격에 나뉘어 체결되어 예상보다 불리한 가격이 될 수 있어요.'],
    ['중간가', '가장 높은 매수 호가와 가장 낮은 매도 호가의 중간 가격이에요. 49,900원과 50,100원이면 50,000원이에요. 호가에 따라 달라지며 체결은 보장되지 않아요.'],
    ['최유리지정가', buy ? '상대편의 가장 낮은 매도 호가로 주문해요. 50,100원에 팔겠다는 주문이 가장 싸면 그 가격으로 접수돼요. 이후 호가를 따라가지 않아 체결되지 않을 수 있어요.' : '상대편의 가장 높은 매수 호가로 주문해요. 접수 가격에 고정되며, 체결되지 않을 수 있어요.'],
    ['최우선지정가', buy ? '같은 편의 가장 높은 매수 호가로 주문해요. 49,900원이면 그 가격에 줄을 서요. 접수 가격에 고정되며 앞선 주문 때문에 기다리거나 체결되지 않을 수 있어요.' : '같은 편의 가장 낮은 매도 호가로 주문해요. 접수 가격에 고정되며 앞선 주문 때문에 기다리거나 체결되지 않을 수 있어요.'],
  ];
  return <span data-order-help className="order-type-help">
    <HelpIconButton ref={anchor} open={open} aria-label="주문유형 설명" onClick={() => onOpenChange(!open)}/>
    {open && <><span className="order-type-help-dismiss" aria-hidden="true" onClick={close}/>
      <section ref={bubble} className={`order-type-help-bubble ${tutorial ? 'tutorial-definition-note' : ''}`} role="region" aria-label="다섯 가지 주문유형" tabIndex={-1} onKeyDown={event => { if(event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } }}>
        <dl>{items.map(([title,text]) => <div key={title}><dt>{title}</dt><dd>{text}</dd></div>)}</dl>
      </section>
    </>}
  </span>;
}
