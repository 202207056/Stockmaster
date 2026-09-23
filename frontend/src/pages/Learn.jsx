import { Link, useSearchParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import useLearning from '../hooks/useLearning';
import { learningScope } from '../utils/learning';
import { CONTEXT_QUESTIONS } from '../constants/learningContent';

import ContextQuestion from '../components/learn/ContextQuestion';
import CourseLessons from '../components/learn/CourseLessons';
import GlossaryBrowser from '../components/learn/GlossaryBrowser';
import AllocationPractice from '../components/learn/AllocationPractice';

import { LearningButton, LearningCard, StorageNotice } from '../components/learn/LearningUI';

const tabs = [['guide', '기본 투자 가이드'], ['courses', '투자 기초 과정'], ['allocation', '투자 비중에 따른 손익 변화'], ['price', '내 주식은 왜 올랐을까/내렸을까?'], ['glossary', '용어집']];

export default function Learn() {
  const { user, isAuthenticated } = useAuth();
  const scope = learningScope(isAuthenticated ? user?.user_id : null);
  return <LearningHub key={scope} scope={scope} />;
}

function LearningHub({ scope }) {
  const [params] = useSearchParams();
  const requested = params.get('tab') || 'courses';
  const tab = tabs.some(([id]) => id === requested) ? requested : 'courses';
  const { store, state } = useLearning(scope);
  return <div className="flex flex-col gap-6">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4"><div><h1 className="text-xl font-extrabold text-gray-900">학습</h1><p className="mt-1 text-sm text-gray-500">투자 기초부터 판단과 복기까지, 단계별로 이해하고 적용해 보세요.</p></div><Link to="/learn?tab=glossary" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50">용어집 열기</Link></header>
    <div className="grid min-w-0 items-start gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
    <nav aria-label="학습 콘텐츠" className="divide-y divide-gray-200 border-y border-gray-200">{tabs.map(([id, label]) => <Link key={id} to={`/learn?tab=${id}`} aria-current={tab === id ? 'page' : undefined} className={`block border-l-2 px-4 py-5 text-sm leading-relaxed ${tab === id ? 'border-brand-600 bg-brand-50 font-bold text-brand-700' : 'border-transparent text-gray-600 hover:bg-gray-50'}`}>{label}</Link>)}</nav>
    <div className="flex min-w-0 flex-col gap-6">
    {tab === 'guide' && <LearningCard title="기본 투자 가이드"><Link to="/learn/trading-tutorial" className="mb-6 block rounded-xl border-2 border-brand-200 bg-brand-50 p-5 hover:border-brand-500"><span className="text-xs font-bold text-brand-700">직접 해보는 튜토리얼 · 로그인 없이 이용</span><h2 className="mt-2 text-lg font-extrabold text-gray-900">트레이딩 매수·매도 연습</h2><p className="mt-2 text-sm leading-relaxed text-gray-600">예시 화면에서 종목 선택부터 매수·매도, 체결 결과까지. 테두리와 마우스 표시를 따라 직접 클릭해 보세요. 실제 계좌에는 영향을 주지 않습니다.</p><span className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white">튜토리얼 시작 →</span></Link><p className="mb-4 text-sm text-gray-500">처음 이용한다면 아래 순서로 화면과 숫자를 확인해 보세요. 각 항목에서 예시 화면을 직접 조작하며 배워 보세요.</p><ol className="divide-y divide-gray-100 text-sm">{[['account', '1. 계좌 읽기', '현금·주식 평가액·총자산을 구분합니다.'], ['orders', '2. 주문 상태 확인하기', '주문 접수와 실제 체결을 구분합니다.'], ['profit', '3. 손익 읽기', '아직 보유 중인 평가손익의 의미를 확인합니다.'], ['reason', '4. 판단 근거 남기기', '확인한 사실과 불확실한 점, 다시 확인할 조건을 적습니다.']].map(([id, title, description]) => <li key={id} className="py-4"><Link to={`/learn/guide/${id}`} className="font-bold text-brand-700 underline">{title} · 체험 시작 →</Link><p className="mt-2 text-gray-500">{description}</p></li>)}</ol></LearningCard>}
    {tab === 'allocation' && <LearningCard title="투자 비중에 따른 손익 변화"><p className="mb-4 text-sm text-gray-500">같은 주가 변화도 투자 비중에 따라 계좌에 미치는 영향이 달라집니다. 가상 계좌를 비교하며 확인해 보세요.</p><AllocationPractice /><Link to="/learn?tab=courses&lesson=C1" className="mt-4 inline-block text-sm text-brand-700 underline">관련 수업: 투자 비중 이해하기</Link></LearningCard>}
    {tab === 'price' && <LearningCard title="내 주식은 왜 올랐을까/내렸을까?"><p className="mb-4 text-sm text-gray-500">주가가 움직였다는 사실과 그 이유에 대한 해석을 구분하는 학습입니다. 내 보유 종목의 상승·하락 원인을 자동 분석하는 기능은 아직 제공하지 않습니다.</p><ol className="list-inside list-decimal space-y-3 text-sm text-gray-700"><li>언제부터 언제까지 가격이 변했는지 확인합니다.</li><li>같은 기간의 공시·실적·시장 변화를 확인합니다.</li><li>확인된 사실과 추측을 나누고, 근거가 없으면 원인을 단정하지 않습니다.</li></ol><div className="mt-5 flex flex-col gap-3 text-sm"><Link to="/learn?tab=courses&lesson=D1" className="text-brand-700 underline">좋은 뉴스면 가격도 오를까?</Link><Link to="/learn?tab=courses&lesson=D2" className="text-brand-700 underline">같은 실적, 왜 다른 반응일까?</Link></div></LearningCard>}
    {tab === 'courses' && <><CourseLessons scope={scope} lessonId={params.get('lesson')} />{!params.get('lesson') && <details className="rounded-xl border border-gray-200 p-4"><summary className="cursor-pointer text-sm font-bold text-gray-700">잠깐 퀴즈 · 문장 속 개념 찾기</summary><div className="mt-4 space-y-4"><p className="text-xs text-gray-500">생각날 때 한 문장씩. 뉴스 문맥에서 개념을 구분하는 선택 활동이며 과정 진도에는 포함되지 않습니다.</p><ContextPractice scope={scope} /></div></details>}</>}
    {tab === 'glossary' && <GlossaryBrowser />}
    <details className="rounded-lg border border-gray-200 p-3 text-xs text-gray-500"><summary className="cursor-pointer">이 기기의 학습 기록 관리</summary><StorageNotice state={state} /><p className="my-3">현재 {scope === 'guest' ? '비로그인' : '사용자'}의 수업·퀴즈·가상 거래 기록을 지웁니다. 실제 모의투자 계좌와 주문 기록에는 영향을 주지 않습니다.</p><LearningButton secondary onClick={() => store.clear()}>이 학습 기록 삭제</LearningButton></details>
    </div></div>
  </div>;
}

function ContextPractice({ scope }) {
  const [params, setParams] = useSearchParams();
  const raw = Number(params.get('q') || 0);
  const index = Number.isInteger(raw) && raw >= 0 && raw < CONTEXT_QUESTIONS.length ? raw : 0;
  const choose = (next) => { const p = new URLSearchParams(params); p.set('q', String(next)); setParams(p); };
  return <div className="flex flex-col gap-4"><p className="text-xs text-gray-500">가상 문장 · {index + 1} / {CONTEXT_QUESTIONS.length}</p><ContextQuestion key={CONTEXT_QUESTIONS[index].id} question={CONTEXT_QUESTIONS[index]} scope={scope} /><div className="flex gap-2"><LearningButton secondary disabled={index === 0} onClick={() => choose(index - 1)}>이전 문장</LearningButton><LearningButton secondary onClick={() => choose((index + 1) % CONTEXT_QUESTIONS.length)}>{index === CONTEXT_QUESTIONS.length - 1 ? '첫 문장' : '다음 문장'}</LearningButton></div></div>;
}
