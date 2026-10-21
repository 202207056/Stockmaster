import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { getOnboarding, setOnboarding } from '../../utils/onboarding';
import { SITE_TOUR_STEPS, siteTourIndex } from '../../constants/siteTour';
import TutorialSkipButton from './TutorialSkipButton';
import TutorialPointer from './TutorialPointer';
import '../../pages/TradingTutorial.css';
import './AssetsTour.css';
import './SiteTour.css';

export default function SiteTour() {
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  if (params.get('tour') === 'start' && pathname === '/dashboard') return <Welcome />;
  const index = siteTourIndex(params.get('tour'));
  return index >= 0 && SITE_TOUR_STEPS[index].path === pathname ? <TourStep index={index} /> : null;
}

function Welcome() {
  const dialog = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const start = () => {
    if (getOnboarding(user?.user_id)?.startsWith('tour:')) setOnboarding(user.user_id, 'tour:0');
    navigate('/dashboard?tour=0', { replace: true });
  };
  const skip = () => {
    if (getOnboarding(user?.user_id)?.startsWith('tour:')) setOnboarding(user.user_id, 'done');
    navigate('/dashboard', { replace: true });
  };
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return <dialog ref={dialog} className="site-tour-welcome" aria-labelledby="site-welcome-title" aria-describedby="site-welcome-text" onCancel={event => { event.preventDefault(); skip(); }}>
    <h2 id="site-welcome-title">‘모의투자 프로젝트’는 투자를 처음 접하는, 혹은 투자를 연습하고 싶은 주린이들을 위한 프로젝트입니다!</h2>
    <p id="site-welcome-text">시작하기 전, 우리 플랫폼의 구조에 대해 먼저 알아가 볼까요?</p>
    <div className="mt-6 flex gap-3"><button type="button" autoFocus className="tutorial-action" onClick={start}>시작하기</button><button type="button" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600" onClick={skip}>건너뛰기</button></div>
  </dialog>;
}

function TourStep({ index }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const note = useRef(null);
  const pointer = useRef(null);
  const { path, target: targetId, title, text, navPath, clickSelector } = SITE_TOUR_STEPS[index];
  const finish = destination => {
    if (getOnboarding(user?.user_id)?.startsWith('tour:')) setOnboarding(user.user_id, 'done');
    navigate(destination, { replace: true });
  };
  const close = () => finish(path);
  const move = nextIndex => {
    if (getOnboarding(user?.user_id)?.startsWith('tour:')) setOnboarding(user.user_id, `tour:${nextIndex}`);
    navigate(`${SITE_TOUR_STEPS[nextIndex].path}?tour=${nextIndex}`, { replace: true });
  };
  const next = () => index === SITE_TOUR_STEPS.length - 1 ? finish('/dashboard') : move(index + 1);

  useEffect(() => {
    if (!clickSelector) return;
    const handleClick = event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (!event.target.closest?.(clickSelector)) return;
      event.preventDefault();
      event.stopPropagation();
      const nextIndex = index + 1;
      if (getOnboarding(user?.user_id)?.startsWith('tour:')) setOnboarding(user.user_id, `tour:${nextIndex}`);
      navigate(`${SITE_TOUR_STEPS[nextIndex].path}?tour=${nextIndex}`, { replace: true });
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [clickSelector, index, navigate, user?.user_id]);

  useLayoutEffect(() => {
    const selector = clickSelector || (navPath ? `nav[aria-label="주 메뉴"] a[href="${navPath}"]` : targetId === 'navigation' ? 'nav[aria-label="주 메뉴"]' : targetId === 'page' ? '#main' : `[data-site-tour="${targetId}"]`);
    const candidates = [...document.querySelectorAll(selector)];
    const previousFocus = document.activeElement;
    let highlighted;
    const findTarget = () => candidates.find(element => element.getBoundingClientRect().width > 0);
    const initial = findTarget();
    if (initial) {
      const rect = initial.getBoundingClientRect();
      if (rect.top < 160 || rect.bottom > window.innerHeight - 24) initial.scrollIntoView({ block: 'center', inline: 'nearest' });
    }
    const position = () => {
      const target = findTarget();
      if (highlighted !== target) {
        highlighted?.classList.remove('assets-tour-target');
        target?.classList.add('assets-tour-target');
        highlighted = target;
      }
      const popup = note.current;
      const width = document.documentElement.clientWidth || window.innerWidth;
      const height = window.innerHeight;
      const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom || 0;
      const minTop = Math.min(Math.max(12, headerBottom + 12), height / 2);
      popup.style.width = `${Math.min(300, width - 24)}px`;
      popup.style.maxHeight = `${Math.max(80, height - minTop - 12)}px`;
      const box = popup.getBoundingClientRect();
      const rect = target?.getBoundingClientRect();
      pointer.current.style.display = rect ? 'block' : 'none';
      if (rect) Object.assign(pointer.current.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      const cursor = pointer.current.querySelector('.tutorial-pointer');
      if (rect && cursor) {
        // Anchor the SVG tip to the button, not the label's right edge.
        const cursorWidth = cursor.getBoundingClientRect().width;
        const anchorX = rect.left + rect.width / 2;
        const flip = anchorX + cursorWidth > width - 12;
        cursor.classList.toggle('site-tour-pointer-flipped', flip);
        cursor.style.left = `${anchorX - rect.left - (flip ? cursorWidth - 3 : 3)}px`;
        cursor.style.top = `${Math.min(rect.bottom - 8, height - 28) - rect.top}px`;
      }
      let left = width - box.width - 12;
      let top = minTop;
      if (rect) {
        if (rect.right + box.width + 24 <= width) { left = rect.right + 12; top = rect.top; }
        else if (rect.left - box.width - 12 >= 12) { left = rect.left - box.width - 12; top = rect.top; }
        else {
          left = rect.left;
          const gap = clickSelector ? 36 : 12;
          top = rect.bottom + box.height + gap + 12 <= height ? rect.bottom + gap : rect.top - box.height - 12 >= minTop ? rect.top - box.height - 12 : height - box.height - 12;
        }
      }
      popup.style.left = `${Math.max(12, Math.min(left, width - box.width - 12))}px`;
      popup.style.top = `${Math.max(minTop, Math.min(top, height - box.height - 12))}px`;
    };
    position();
    (clickSelector && initial ? initial : note.current).focus({ preventScroll: true });
    const observer = new ResizeObserver(position);
    candidates.forEach(target => observer.observe(target));
    observer.observe(note.current);
    const main = document.getElementById('main');
    if (main) observer.observe(main);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      highlighted?.classList.remove('assets-tour-target');
      observer.disconnect();
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      if (previousFocus?.isConnected) previousFocus.focus?.({ preventScroll: true });
    };
  }, [index, targetId, navPath, clickSelector]);

  // Reuse the existing asset tutorial's non-modal callout, pointer and controls.
  return <>
    <TutorialSkipButton onSkip={close} />
    <div ref={pointer} className="assets-tour-pointer site-tour-pointer" aria-hidden="true">
      {clickSelector && <TutorialPointer />}
    </div>
    <div ref={note} className="assets-tour-note tutorial-local-note site-tour-note" role="region" aria-label={`${clickSelector ? SITE_TOUR_STEPS[index + 1].title : title} 안내`} tabIndex={0}
      onClick={event => { if (!clickSelector && !event.target.closest('button') && !window.getSelection()?.toString()) next(); }}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.stopPropagation(); close(); }
        if (!clickSelector && event.target === note.current && ['Enter', ' '].includes(event.key)) { event.preventDefault(); next(); }
      }}>
      <button type="button" className="assets-tour-close" aria-label="사이트 안내 종료" onClick={close}>×</button>
      <strong className="block text-sm text-brand-700">{clickSelector ? `${SITE_TOUR_STEPS[index + 1].title}로 이동` : title}</strong>
      <p className="mt-1 text-sm leading-relaxed text-gray-600">{text}</p>
      {!clickSelector && <button type="button" className="tutorial-action mt-3" onClick={next}>다음</button>}
      {index > 0 && <button type="button" className="assets-tour-back" onClick={() => move(index - 1)}>뒤로가기</button>}
    </div>
  </>;
}
