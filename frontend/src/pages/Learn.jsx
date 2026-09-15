import { Link, useSearchParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useLearning from '../hooks/useLearning';
import { learningScope, EMPTY_ANSWER } from '../utils/learning';
import { CONTEXT_QUESTIONS, LESSONS } from '../constants/learningContent';
import AllocationPractice from '../components/learn/AllocationPractice';
import ContextQuestion from '../components/learn/ContextQuestion';
import CourseLessons from '../components/learn/CourseLessons';
import GlossaryBrowser from '../components/learn/GlossaryBrowser';
import TradeScenario from '../components/learn/TradeScenario';
import { LearningButton, LearningCard, StorageNotice } from '../components/learn/LearningUI';

const tabs = [['home', '추천 활동'], ['practice', '짧은 실습·퀴즈'], ['review', '거래 복기'], ['courses', '코스']];

export default function Learn() {
  const { user, isAuthenticated } = useAuth();
  const scope = learningScope(isAuthenticated ? user?.user_id : null);
  return <LearningHub key={scope} scope={scope} />;
}

function LearningHub({ scope }) {
  const [params] = useSearchParams();
  const requested = params.get('tab') || 'home';
  const tab = [...tabs.map(([id]) => id), 'glossary'].includes(requested) ? requested : 'home';
  const { store, state } = useLearning(scope);
  const pending = LESSONS.filter((lesson) => {
    const progress = store.read(`lesson:${lesson.id}`, { step: 0, completed: false });
    return progress.step > 0 && !progress.completed;
  });
  return <div className="flex flex-col gap-6">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4"><div><h1 className="text-xl font-extrabold text-gray-900">학습</h1><p className="mt-1 text-sm text-gray-500">궁금한 순간에 실험하고, 내 판단을 돌아보세요.</p></div><Link to="/learn?tab=glossary" className="text-sm text-gray-500 underline">도움말·용어 검색</Link></header>
    <nav aria-label="학습 콘텐츠" className="flex flex-wrap gap-2">{tabs.map(([id, label]) => <Link key={id} to={`/learn?tab=${id}`} aria-current={tab === id ? 'page' : undefined} className={`rounded-lg border px-4 py-2 text-sm font-bold ${tab === id ? 'border-brand-600 bg-brand-600 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{label}</Link>)}</nav>
    {(tab === 'home' || tab === 'practice') && <>
      <div><h2 className="text-lg font-bold text-gray-800">이런 방식으로 이해를 돕습니다</h2><p className="mt-1 text-sm text-gray-500">코스를 먼저 듣지 않아도 바로 해볼 수 있어요.</p></div>
      <div className="grid items-start gap-4 lg:grid-cols-2"><LearningCard title="보유 비중 비교하기"><AllocationPractice /></LearningCard><LearningCard title="문장 속 개념 찾기"><ContextPractice scope={scope} /></LearningCard></div>
      {tab === 'home' && <div className="grid gap-4 sm:grid-cols-2"><LearningCard title="매수부터 복기까지 가상으로"><p className="mb-4 text-sm text-gray-500">매수 근거를 남기고, 보유 중 계획과 매도 이유를 연결해 보세요.</p><Link className="text-sm font-bold text-brand-700" to="/learn?tab=review">{state.records.scenario ? '가상 거래 이어하기' : '가상 거래 시작하기'} →</Link></LearningCard><LearningCard title={pending.length ? '이어서 살펴볼 설명' : '설명이 더 필요할 때'}><p className="mb-4 text-sm text-gray-500">{pending[0]?.title || '주문·손익·뉴스·판단 과정을 상황별 코스에서 살펴보세요.'}</p><Link className="text-sm font-bold text-brand-700" to={pending.length ? `/learn?tab=courses&lesson=${pending[0].id}` : '/learn?tab=courses'}>{pending.length ? '이어보기' : '선택형 코스 보기'} →</Link></LearningCard></div>}
      {tab === 'practice' && <ReviewQuestions scope={scope} />}
    </>}
    {tab === 'courses' && <CourseLessons scope={scope} lessonId={params.get('lesson')} />}
    {tab === 'review' && <><LearningCard title="가상 거래 · 판단과 결과 돌아보기"><TradeScenario scope={scope} /></LearningCard><LearningCard title="내 모의투자 기록"><p className="text-sm leading-relaxed text-gray-500">실제 모의투자에서는 트레이딩의 판단 기록과 주문내역의 돌아보기를 사용할 수 있습니다. 기록은 해당 사용자·계좌의 브라우저 저장이며, 거래별 손익 타임라인의 서버 연결은 준비 중입니다.</p><Link to="/trading" className="mt-3 inline-block text-sm text-brand-700 underline">트레이딩에서 내 주문 확인</Link></LearningCard></>}
    {tab === 'glossary' && <GlossaryBrowser />}
    <details className="rounded-lg border border-gray-200 p-3 text-xs text-gray-500"><summary className="cursor-pointer">이 기기의 학습 기록 관리</summary><StorageNotice state={state} /><p className="my-3">현재 {scope === 'guest' ? '비로그인' : '사용자'}의 수업·퀴즈·가상 거래 기록을 지웁니다. 실제 모의투자 계좌와 주문 기록에는 영향을 주지 않습니다.</p><LearningButton secondary onClick={() => store.clear()}>이 학습 기록 삭제</LearningButton></details>
  </div>;
}

function ContextPractice({ scope }) {
  const [params, setParams] = useSearchParams();
  const raw = Number(params.get('q') || 0);
  const index = Number.isInteger(raw) && raw >= 0 && raw < CONTEXT_QUESTIONS.length ? raw : 0;
  const choose = (next) => { const p = new URLSearchParams(params); p.set('q', String(next)); setParams(p); };
  return <div className="flex flex-col gap-4"><p className="text-xs text-gray-500">가상 문장 · {index + 1} / {CONTEXT_QUESTIONS.length}</p><ContextQuestion key={CONTEXT_QUESTIONS[index].id} question={CONTEXT_QUESTIONS[index]} scope={scope} /><div className="flex gap-2"><LearningButton secondary disabled={index === 0} onClick={() => choose(index - 1)}>이전 문장</LearningButton><LearningButton secondary onClick={() => choose((index + 1) % CONTEXT_QUESTIONS.length)}>{index === CONTEXT_QUESTIONS.length - 1 ? '첫 문장' : '다음 문장'}</LearningButton></div></div>;
}

function ReviewQuestions({ scope }) {
  const { store } = useLearning(scope);
  const questions = [...CONTEXT_QUESTIONS, ...LESSONS.flatMap((lesson) => lesson.questions)];
  const wrong = questions.filter((question) => { const answer = store.read(`question:${question.id}`, EMPTY_ANSWER); return answer.answered && !answer.correct; });
  return <LearningCard title="다시 확인할 상황">{wrong.length ? <div className="space-y-6">{wrong.map((question) => <ContextQuestion key={question.id} question={question} scope={scope} />)}</div> : <p className="text-sm text-gray-500">다시 확인할 문제가 아직 없어요. 문장 퀴즈나 선택형 코스에서 궁금한 상황을 살펴보세요.</p>}</LearningCard>;
}
