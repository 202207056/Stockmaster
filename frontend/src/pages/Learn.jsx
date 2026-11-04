import { useState } from 'react';
import { comma } from '../utils/format';
import { buyTutorialKey } from '../utils/orderTypes';
import { Link, useSearchParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useLearning from '../hooks/useLearning';
import { learningScope } from '../utils/learning';
import { COURSES, LESSONS } from '../constants/learningContent';
import { ArrowUpRight, ArrowRight, ChartNoAxesCombined, Compass, GraduationCap, Search, Check } from 'lucide-react';
import '../components/learn/LearningHub.css';

import CourseLessons from '../components/learn/CourseLessons';
import GlossaryBrowser from '../components/learn/GlossaryBrowser';
import AllocationPractice from '../components/learn/AllocationPractice';
import StockQuiz from '../components/learn/StockQuiz';
import { TRADING_TUTORIALS } from '../constants/tradingTutorials';

import { LearningCard, StorageNotice } from '../components/learn/LearningUI';

const tabs = [['guide', '학습 홈', Compass], ['courses', '기초 수업', GraduationCap], ['quiz', '주식 퀴즈', Check], ['practice', '실습', ChartNoAxesCombined], ['glossary', '용어집', Search]];

const courseSummaries = {
  A: '주문 조건과 매수 전후의 계좌 변화를 알아봐요.',
  B: '평가손익을 읽고 보유·매도 판단을 연습해요.',
  C: '투자 금액과 비중에 따른 손실을 비교해요.',
  D: '뉴스의 사실과 해석을 나눠 판단해요.',
  E: '매매 이유를 기록하고 다음 선택을 준비해요.',
};
const practiceSummaries = {
  buy: '주문유형과 수수료를 확인하고 첫 매수를 해봐요.',
  sell: '일부 매도 후 금액과 남은 수량을 확인해요.',
  orders: '주문 확인과 체결내역 조회를 연습해요.',
  account: '계좌를 선택하고 총자산·보유종목을 살펴봐요.',
  settlement: '체결 후 자산 반영과 실제 결제 시차를 구분해요.',
  review: '매수부터 자산 조회·매도까지 이어서 연습해요.',
};

export default function Learn() {
  const { user, isAuthenticated } = useAuth();
  const scope = learningScope(isAuthenticated ? user?.user_id : null);
  return <LearningHub key={scope} scope={scope} completionKey={buyTutorialKey(isAuthenticated ? user?.user_id : null)} />;
}

function LearningHub({ scope, completionKey }) {
  const [params] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const requested = params.get('tab') || 'guide';
  const tab = requested === 'allocation' ? 'allocation' : tabs.some(([id]) => id === requested) ? requested : 'courses';
  const { store, state } = useLearning(scope);
  const completed = LESSONS.filter(lesson => store.read(`lesson:${lesson.id}`, { completed: false }).completed).length;
  const nextLesson = LESSONS.find(lesson => !store.read(`lesson:${lesson.id}`, { completed: false }).completed);
  return <div className="learning-hub">
    <header className="learn-heading"><h1>학습</h1></header>
    <div className="learn-layout">
    <aside className="learn-sidebar">
      <button type="button" className="learn-menu-toggle" aria-expanded={menuOpen} aria-controls="learn-navigation" onClick={() => setMenuOpen(!menuOpen)}><span>{tabs.find(([id]) => id === (tab === 'allocation' ? 'practice' : tab))?.[1]}</span><span>{menuOpen ? '메뉴 닫기 −' : '메뉴 보기 +'}</span></button>
      <nav id="learn-navigation" aria-label="학습 콘텐츠" className={`learn-nav ${menuOpen ? 'is-open' : ''}`}>{tabs.map(([id, label, Icon]) => <Link key={id} to={`/learn?tab=${id}`} onClick={() => setMenuOpen(false)} aria-current={(tab === 'allocation' ? 'practice' : tab) === id ? 'page' : undefined}><Icon size={17} aria-hidden="true" /><span>{label}</span></Link>)}</nav>
      <div className="learn-sidebar-progress"><p><strong>{completed}</strong> / {comma(LESSONS.length)}개 수업 완료</p><progress value={completed} max={LESSONS.length} aria-label="전체 수업 완료 진도" /></div>
    </aside>
    <div className="learn-content">
    {tab === 'quiz' && <StockQuiz scope={scope} />}
    {tab === 'guide' && <>
      <section className="learn-next" aria-labelledby="learn-next-title">
        <div className="learn-next-meta"><span>{completed === LESSONS.length ? '기초 과정 완료' : completed > 0 ? '다음 수업' : '첫 수업'}</span><span>{nextLesson ? `${nextLesson.id} · 5~8분` : `${LESSONS.length}개 수업 완료`}</span></div>
        <h2 id="learn-next-title">{nextLesson?.title || '기초 수업 완료'}</h2>
        <p>{nextLesson?.situation || '배운 내용을 퀴즈와 연습 계좌에서 확인해 보세요.'}</p>
        <div className="learn-next-bottom"><Link className="learn-primary" to={nextLesson ? `/learn?tab=courses&lesson=${nextLesson.id}` : '/learn?tab=courses'}>{nextLesson ? completed > 0 ? '다음 수업 시작' : '첫 수업 시작' : '수업 다시 보기'}<ArrowRight size={16} aria-hidden="true" /></Link></div>
      </section>
      <div className="learn-overview-grid">
        <section className="learn-course-map" aria-labelledby="learn-map-title"><div className="learn-section-heading"><h2 id="learn-map-title">투자 기초 과정</h2><Link to="/learn?tab=courses">전체 수업 <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
          {COURSES.map(course => {
            const lessons = LESSONS.filter(lesson => lesson.course === course.id);
            const count = lessons.filter(lesson => store.read(`lesson:${lesson.id}`, { completed: false }).completed).length;
            const target = lessons.find(lesson => !store.read(`lesson:${lesson.id}`, { completed: false }).completed) || lessons[0];
            return <Link key={course.id} to={`/learn?tab=courses&lesson=${target.id}`} className="learn-course-map-row"><span className="learn-course-code">{course.id}</span><div><strong>{course.title}</strong><p>{courseSummaries[course.id]}</p><progress value={count} max={lessons.length} aria-label={`${course.title} 완료 진도`} /></div><span className="learn-course-fraction">{count}/{lessons.length}<span> 완료</span></span><ArrowRight size={14} aria-hidden="true" /></Link>;
          })}
        </section>
        <section className="learn-quick-start" aria-labelledby="learn-quick-title">
          <div className="learn-section-heading"><h2 id="learn-quick-title">퀴즈와 실습</h2><Link to="/learn?tab=practice">전체 실습 <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
          <Link to="/learn?tab=quiz" className="learn-quick-link"><div><strong>단계별 주식 퀴즈</strong><p>5단계 · OX와 객관식 20문항</p></div><ArrowRight size={17} aria-hidden="true" /></Link>
          <Link to="/trading?practice=buy" state={{ completionKey }} className="learn-quick-link"><div><strong>연습 계좌로 첫 매수</strong><p>주문부터 계좌 변화까지 직접 확인해요.</p></div><ArrowUpRight size={17} aria-hidden="true" /></Link>
          <Link to="/learn/charts" className="learn-quick-link"><div><strong>차트 읽기</strong><p>7가지 그래프와 지표를 그림으로 비교해요.</p></div><ArrowUpRight size={17} aria-hidden="true" /></Link>
          <Link to="/learn?tab=allocation" className="learn-quick-link"><div><strong>투자 비중 실험</strong><p>같은 주가 변화가 계좌에 미치는 영향을 봐요.</p></div><ArrowRight size={17} aria-hidden="true" /></Link>
          <Link to="/learn?tab=glossary" className="learn-quick-link"><div><strong>투자 용어집</strong><p>궁금한 용어를 설명과 예시로 찾아봐요.</p></div><ArrowRight size={17} aria-hidden="true" /></Link>
        </section>
      </div>
    </>}
    {tab === 'practice' && <section className="learn-practice" aria-labelledby="learn-practice-title">
      <div className="learn-section-heading"><h2 id="learn-practice-title">실습</h2></div>
      <p className="learn-practice-note">매매는 연습 계좌로 진행합니다. 내 계좌 조회는 로그인이 필요합니다.</p>
      <div className="learn-practice-list">{TRADING_TUTORIALS.map(course => <Link key={course.id} state={course.id === 'buy' ? { completionKey } : undefined} to={`${course.start || '/trading'}?practice=${course.id}`} className="learn-quick-link"><div><strong>{course.title}</strong><p>{practiceSummaries[course.id]}</p></div><ArrowUpRight size={17} aria-hidden="true" /></Link>)}
      <Link to="/learn/charts" className="learn-quick-link"><div><strong>차트 읽기</strong><p>캔들·거래량·지표를 비교하며 차트를 읽어요.</p></div><ArrowUpRight size={17} aria-hidden="true" /></Link>
      <Link to="/learn?tab=allocation" className="learn-quick-link"><div><strong>투자 비중 실험</strong><p>투자 비중을 바꾸며 계좌 손익을 비교해요.</p></div><ArrowRight size={17} aria-hidden="true" /></Link>
      <Link to="/trading?misuTour=1" className="learn-quick-link"><div><strong>미수거래 위험 체험</strong><p>현금보다 많이 매수했을 때의 손실과 반대매매를 배워요.</p></div><ArrowUpRight size={17} aria-hidden="true" /></Link>
      </div>
    </section>}
    {tab === 'allocation' && <LearningCard title="투자 비중에 따른 손익 변화"><p className="mb-4 text-sm text-gray-500">같은 주가 변화도 투자 비중에 따라 계좌에 미치는 영향이 달라집니다. 가상 계좌를 비교하며 확인해 보세요.</p><AllocationPractice /><Link to="/learn?tab=courses&lesson=C1" className="mt-4 inline-block text-sm text-brand-700 underline">관련 수업: 투자 비중 이해하기</Link></LearningCard>}
    {tab === 'courses' && <CourseLessons scope={scope} lessonId={requested === 'price' ? 'D1' : params.get('lesson')} />}
    {tab === 'glossary' && <GlossaryBrowser />}
    {!state.persistent && <StorageNotice state={state} />}
    </div></div>
  </div>;
}
