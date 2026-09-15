import { Link } from 'react-router-dom';
import { COURSES, LESSONS } from '../../constants/learningContent';
import useLearning from '../../hooks/useLearning';
import ContextQuestion from './ContextQuestion';
import InteractivePractice from './InteractivePractice';
import { LearningButton, LearningCard, StorageNotice } from './LearningUI';
import { EMPTY_ANSWER } from '../../utils/learning';

const progressDefault = { step: 0, completed: false, updatedAt: '' };

export default function CourseLessons({ scope, lessonId }) {
  const { state, store } = useLearning(scope);
  const lesson = LESSONS.find((item) => item.id === lessonId);
  if (lessonId && !lesson) return <LearningCard title="수업을 찾을 수 없어요"><Link to="/learn?tab=courses" className="text-brand-700 underline">코스 목록으로</Link></LearningCard>;
  if (lesson) return <LessonPlayer key={lesson.id} lesson={lesson} scope={scope} />;
  return <div className="flex flex-col gap-5"><p className="text-sm leading-relaxed text-gray-500">설명이 더 필요할 때 골라 보세요. 코스 이수 없이 짧은 실습·퀴즈·가상 거래를 이용할 수 있습니다.</p>{COURSES.map((course) => <LearningCard key={course.id} title={course.title} aside={<span className="text-xs text-gray-500">선택형 코스 {course.id}</span>}><p className="mb-4 text-sm text-gray-500">{course.goal}</p><ul className="divide-y divide-gray-100">{LESSONS.filter((item) => item.course === course.id).map((item) => {
    const progress = store.read(`lesson:${item.id}`, progressDefault);
    return <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><Link to={`/learn?tab=courses&lesson=${item.id}`} className="text-sm font-bold text-gray-800 hover:text-brand-700">{item.id} · {item.title}</Link><p className="mt-1 text-xs text-gray-500">{progress.completed ? '학습 과정 완료' : progress.step > 0 ? '이어서 보기' : '5~8분 · 가상 상황과 실습'}</p></div><Link to={`/learn?tab=courses&lesson=${item.id}`} className="text-sm font-bold text-brand-700">{progress.step ? '이어보기' : '살펴보기'} →</Link></li>;
  })}</ul></LearningCard>)}<StorageNotice state={state} /></div>;
}

function LessonPlayer({ lesson, scope }) {
  const { store, state } = useLearning(scope);
  const progress = store.read(`lesson:${lesson.id}`, progressDefault);
  const step = Math.min(3, Math.max(0, Math.floor(progress.step)));
  const update = (value) => store.write(`lesson:${lesson.id}`, { ...progress, ...value, updatedAt: new Date().toISOString() });
  const answered = lesson.questions.every((q) => store.read(`question:${q.id}`, EMPTY_ANSWER).answered);
  const saveEvidence = (reason) => {
    const previous = state.records.scenario && typeof state.records.scenario === 'object' ? state.records.scenario : {};
    store.write('scenario', { ...previous, reason, stage: 0 });
  };
  return <LearningCard title={`${lesson.id} · ${lesson.title}`} aside={<Link to="/learn?tab=courses" className="text-sm text-gray-500 underline">코스 목록</Link>}>
    <p className="mb-4 text-sm text-gray-500">{lesson.outcome}</p>
    <ol className="mb-5 flex flex-wrap gap-2 text-xs">{['상황과 자료', '직접 해보기', '짧게 확인', '다음에 적용'].map((label, i) => <li key={label} aria-current={step === i ? 'step' : undefined} className={`rounded-full px-3 py-1.5 ${step === i ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}. {label}</li>)}</ol>
    {step === 0 && <div className="space-y-4 text-sm leading-relaxed"><p className="rounded-lg bg-gray-50 p-4">{lesson.situation}</p><h3 className="font-bold">이렇게 살펴봅니다</h3><p>{lesson.action}</p><p className="text-xs text-gray-500">교육용 가상 자료이며 기업·가격·기사 사례는 실제 전망을 뜻하지 않습니다. 거래 비용은 제외합니다.</p></div>}
    {step === 1 && <InteractivePractice key={lesson.id} type={lesson.activity} onEvidence={saveEvidence} />}
    {step === 2 && <div className="space-y-6">{lesson.questions.map((question) => <ContextQuestion key={question.id} question={question} scope={scope} />)}</div>}
    {step === 3 && <div className="space-y-4 text-sm"><h3 className="font-bold">거래에서 확인할 한 가지</h3><p>{lesson.connection}</p><p>{lesson.outcome}</p><Link to="/learn?tab=review" className="inline-block text-brand-700 underline">가상 거래에서 적용해 보기 →</Link><div><LearningButton disabled={!answered} onClick={() => update({ completed: true })}>{progress.completed ? '학습 과정 완료' : '학습 과정 완료로 표시'}</LearningButton></div>{!answered && <p className="text-xs text-gray-500">앞 단계의 확인 문제 2개에 답하면 완료로 표시할 수 있습니다.</p>}{progress.completed && <p role="status">설명과 문제를 확인했어요. 이 표시는 투자 판단의 정답이나 숙련도 점수가 아닙니다.</p>}</div>}
    <div className="mt-6 flex flex-wrap gap-2"><LearningButton secondary disabled={step === 0} onClick={() => update({ step: step - 1 })}>이전</LearningButton>{step < 3 && <LearningButton onClick={() => update({ step: step + 1 })}>다음</LearningButton>}</div><StorageNotice state={state} />
  </LearningCard>;
}
