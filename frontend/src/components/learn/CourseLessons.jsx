import { useState } from 'react';
import { Link } from 'react-router-dom';
import { COURSES, LESSONS } from '../../constants/learningContent';
import { LEARNING_SOURCES, LESSON_EXPLANATIONS } from '../../constants/lessonExplanations';
import useLearning from '../../hooks/useLearning';
import ContextQuestion from './ContextQuestion';
import InteractivePractice from './InteractivePractice';
import { LearningButton, LearningCard, StorageNotice } from './LearningUI';
import { EMPTY_ANSWER } from '../../utils/learning';

const progressDefault = { step: 0, completed: false, updatedAt: '' };

export default function CourseLessons({ scope, lessonId }) {
  const { state, store } = useLearning(scope);
  const lesson = LESSONS.find((item) => item.id === lessonId);
  if (lessonId && !lesson) return <LearningCard title="수업을 찾을 수 없어요"><Link to="/learn?tab=courses" className="text-brand-700 underline">투자 기초 과정으로</Link></LearningCard>;
  if (lesson) return <LessonPlayer key={lesson.id} lesson={lesson} scope={scope} />;
  return <div className="flex flex-col gap-5"><h2 className="text-lg font-bold text-gray-800">투자 기초 과정</h2><p className="text-sm leading-relaxed text-gray-500">권장 순서: 1. 주문과 계좌 → 2. 손익과 보유 → 3. 금액과 위험 → 4. 뉴스와 정보 → 5. 계획과 복기. 각 수업은 개념 설명 읽기 → 직접 계산·판단 → 확인 문제 → 거래에 적용 순서입니다. 필요한 단계부터 볼 수 있습니다.</p>{COURSES.map((course) => <LearningCard key={course.id} title={course.title} aside={<span className="text-xs text-gray-500">기초 과정 {course.id}</span>}><p className="mb-4 text-sm text-gray-500">{course.goal}</p><ul className="divide-y divide-gray-100">{LESSONS.filter((item) => item.course === course.id).map((item) => {
    const progress = store.read(`lesson:${item.id}`, progressDefault);
    return <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><Link to={`/learn?tab=courses&lesson=${item.id}`} className="text-sm font-bold text-gray-800 hover:text-brand-700">{item.id} · {item.title}</Link><p className="mt-1 text-xs text-gray-500">{progress.completed ? '학습 과정 완료' : progress.step > 0 ? '이어서 보기' : '5~8분 · 가상 상황과 실습'}</p></div><Link to={`/learn?tab=courses&lesson=${item.id}`} className="text-sm font-bold text-brand-700">{progress.completed ? '다시 학습하기' : '학습하기'} →</Link></li>;
  })}</ul></LearningCard>)}<StorageNotice state={state} /></div>;
}

function LessonPlayer({ lesson, scope }) {
  const { store, state } = useLearning(scope);
  const progress = store.read(`lesson:${lesson.id}`, progressDefault);
  const [step, setStep] = useState(0);
  const explanation = LESSON_EXPLANATIONS[lesson.id];
  const update = (value) => {
    if (value.step !== undefined) setStep(value.step);
    store.write(`lesson:${lesson.id}`, { ...progress, ...value, updatedAt: new Date().toISOString() });
  };
  const answered = lesson.questions.every((q) => store.read(`question:${q.id}`, EMPTY_ANSWER).answered);
  const nextLesson = LESSONS[LESSONS.findIndex((item) => item.id === lesson.id) + 1];
  const saveEvidence = (reason) => {
    const previous = state.records.scenario && typeof state.records.scenario === 'object' ? state.records.scenario : {};
    store.write('scenario', { ...previous, reason, stage: 0 });
  };
  return <LearningCard title={`${lesson.id} · ${lesson.title}`} aside={<Link to="/learn?tab=courses" className="text-sm text-gray-500 underline">투자 기초 과정</Link>}>
    <p className="mb-4 text-sm text-gray-500">{lesson.outcome}</p>
    <ol className="mb-5 flex flex-wrap gap-2 text-xs">{['개념 먼저 읽기', '직접 해보기', '짧게 확인', '다음에 적용'].map((label, i) => <li key={label} aria-current={step === i ? 'step' : undefined} className={`rounded-full px-3 py-1.5 ${step === i ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}. {label}</li>)}</ol>
    {step === 0 && <article className="space-y-5 text-sm leading-7 text-gray-700"><div className="rounded-xl bg-brand-50 p-5"><h3 className="mb-2 text-xs font-bold text-brand-700">질문의 답</h3><p className="text-base font-bold leading-relaxed text-gray-900">{explanation.answer}</p></div><h3 className="font-bold text-gray-900">왜 그런가요?</h3>{explanation.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<div className="border-l-4 border-brand-500 pl-4"><h3 className="font-bold">기억할 한 가지</h3><p>{explanation.takeaway}</p></div><section className="rounded-xl bg-gray-50 p-4"><h3 className="font-bold">이제 직접 확인해 볼까요?</h3><p>{lesson.situation}</p><p>{lesson.action}</p><p className="mt-2 text-xs text-gray-500">계산 예시는 직접 구성한 교육용 가상 상황이며, 별도 표시가 없으면 비용을 제외합니다.</p></section><footer className="text-xs leading-relaxed text-gray-500"><p className="mb-2 font-bold">참고 자료 · 2026.09.16 확인</p><ul className="space-y-2">{explanation.sources.map((id) => <li key={id}><a href={LEARNING_SOURCES[id].url} target="_blank" rel="noopener noreferrer" className="underline">{LEARNING_SOURCES[id].title} ↗</a></li>)}</ul><p className="mt-2">일반 투자 원리를 한국어로 정리했습니다. 해외 시장의 세금·주문 제도를 국내에 그대로 적용하는 설명은 아닙니다.</p></footer></article>}
    {step === 1 && <InteractivePractice key={lesson.id} type={lesson.activity} onEvidence={saveEvidence} />}
    {step === 2 && <div className="space-y-6">{lesson.questions.map((question) => <ContextQuestion key={question.id} question={question} scope={scope} />)}</div>}
    {step === 3 && <div className="space-y-4 text-sm"><h3 className="font-bold">거래에서 확인할 한 가지</h3><p>{lesson.connection}</p><p>{lesson.outcome}</p><Link to="/trading" className="inline-block text-brand-700 underline">매수 화면에서 판단 점검하기 →</Link><div><LearningButton disabled={!answered} onClick={() => update({ completed: true })}>{progress.completed ? '학습 과정 완료' : '학습 과정 완료로 표시'}</LearningButton></div>{!answered && <p className="text-xs text-gray-500">앞 단계의 확인 문제 2개에 답하면 완료로 표시할 수 있습니다.</p>}{progress.completed && <p role="status">설명과 문제를 확인했어요. 이 표시는 투자 판단의 정답이나 숙련도 점수가 아닙니다.</p>}</div>}
    <div className="mt-6 flex flex-wrap gap-2"><LearningButton secondary disabled={step === 0} onClick={() => update({ step: step - 1 })}>이전</LearningButton>{step < 3 && <LearningButton onClick={() => update({ step: step + 1 })}>{step === 0 ? '직접 해보며 이해하기 →' : '다음'}</LearningButton>}{step === 3 && progress.completed && nextLesson && <Link to={`/learn?tab=courses&lesson=${nextLesson.id}`} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-brand-700">다음 수업: {nextLesson.title} →</Link>}</div><StorageNotice state={state} />
  </LearningCard>;
}
