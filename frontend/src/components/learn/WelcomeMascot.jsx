import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import enter from '../../assets/mascot/enter.png';
import wave1 from '../../assets/mascot/wave-1.png';
import wave2 from '../../assets/mascot/wave-2.png';
import pencil from '../../assets/mascot/pencil.png';

const stages = { entering: [1400, 'greeting'], greeting: [1200, 'docking'], docking: [650, 'ready'] };

export default function WelcomeMascot({ children }) {
  const [phase, setPhase] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'ready' : 'entering');
  const [waving, setWaving] = useState(false);
  const scene = useRef(null);
  const content = useRef(null);
  const visible = phase === 'docking' || phase === 'ready';

  useEffect(() => {
    const stage = stages[phase];
    if (!stage) return;
    const timer = window.setTimeout(() => setPhase(stage[1]), stage[0]);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (!waving) return;
    const timer = window.setTimeout(() => setWaving(false), 1200);
    return () => window.clearTimeout(timer);
  }, [waving]);

  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => { if (preference.matches) { setPhase('ready'); setWaving(false); } };
    preference?.addEventListener('change', update);
    return () => preference?.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    const position = () => {
      const card = content.current.firstElementChild.getBoundingClientRect();
      // The reference's (2): the lower-right corner inside the welcome card.
      scene.current.style.setProperty('--mascot-x', `${card.width / 2 - 60}px`);
      scene.current.style.setProperty('--mascot-y', `${card.height / 2 - 52}px`);
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(content.current.firstElementChild);
    window.addEventListener('resize', position);
    return () => { observer.disconnect(); window.removeEventListener('resize', position); };
  }, []);

  useEffect(() => {
    if (phase === 'ready') content.current.querySelector('button')?.focus({ preventScroll: true });
  }, [phase]);

  return <div ref={scene} className={`site-tour-scene is-${phase}`}>
    <div ref={content} className="site-tour-welcome-content" inert={!visible} aria-hidden={!visible}>{children}</div>
    <button type="button" className={`site-tour-mascot ${waving ? 'is-waving' : ''}`}
      disabled={phase !== 'ready'} aria-label="마스코트와 인사하기"
      onClick={() => setWaving(true)} onAnimationEnd={event => {
        if (event.animationName === 'mascot-wave-body') setWaving(false);
      }}>
      <img className="mascot-enter" src={enter} alt="" draggable="false" />
      <span className="mascot-wave"><img className="mascot-wave-one" src={wave1} alt="" draggable="false" /><img className="mascot-wave-two" src={wave2} alt="" draggable="false" /></span>
      <img className="mascot-pencil" src={pencil} alt="" draggable="false" />
    </button>
  </div>;
}
