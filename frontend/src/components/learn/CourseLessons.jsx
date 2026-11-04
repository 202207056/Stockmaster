import { useState } from 'react';
import { Link } from 'react-router-dom';
import { COURSES, LESSONS } from '../../constants/learningContent';
import { LEARNING_SOURCES, LESSON_EXPLANATIONS } from '../../constants/lessonExplanations';
import useLearning from '../../hooks/useLearning';
import ContextQuestion from './ContextQuestion';
import GuidedPractice from './GuidedPractice';
import { PRACTICE_GUIDES } from '../../constants/practiceGuides';
import { LearningButton, LearningCard, StorageNotice } from './LearningUI';
import { EMPTY_ANSWER } from '../../utils/learning';

const progressDefault = { step: 0, completed: false, updatedAt: '' };

export default function CourseLessons({ scope, lessonId }) {
  const { state, store } = useLearning(scope);
  const lesson = LESSONS.find((item) => item.id === lessonId);
  if (lessonId && !lesson) return <LearningCard title="수업을 찾을 수 없어요"><Link to="/learn?tab=courses" className="text-brand-700 underline">투자 기초 과정으로</Link></LearningCard>;
  if (lesson) return <LessonPlayer key={lesson.id} lesson={lesson} scope={scope} />;
  return <div className="learn-courses flex flex-col gap-5"><h2 className="text-lg font-bold text-gray-800">투자 기초 과정</h2>{COURSES.map((course, index) => <LearningCard key={course.id} title={<><span className="learn-course-number">{String(index + 1).padStart(2, '0')}</span>{course.title}</>} aside={<span className="learn-course-count">{LESSONS.filter(item => item.course === course.id && store.read(`lesson:${item.id}`, progressDefault).completed).length} / {LESSONS.filter(item => item.course === course.id).length} 완료</span>}><p className="mb-4 text-sm text-gray-500">{course.goal}</p><ul className="divide-y divide-gray-100">{LESSONS.filter((item) => item.course === course.id).map((item) => {
    const progress = store.read(`lesson:${item.id}`, progressDefault);
    return <li key={item.id} className={`learn-lesson-row ${progress.completed ? 'is-complete' : ''}`}><div className="min-w-0"><Link to={`/learn?tab=courses&lesson=${item.id}`} className="text-sm font-bold text-gray-800 hover:text-brand-700">{item.id} · {item.title}</Link><p className="mt-1 text-xs text-gray-500">{item.situation}</p><p className="mt-1 text-xs text-gray-500">{progress.completed ? '학습 과정 완료' : progress.step > 0 ? '이어서 보기' : '5~8분 · 가상 상황과 실습'}</p></div><Link to={`/learn?tab=courses&lesson=${item.id}`} className="text-sm font-bold text-brand-700">{progress.completed ? '다시 학습하기' : '학습하기'} →</Link></li>;
  })}</ul></LearningCard>)}{!state.persistent && <StorageNotice state={state} />}</div>;
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
  return <div className="lesson-reader"><LearningCard title={`${lesson.id} · ${lesson.title}`} aside={<Link to="/learn?tab=courses" className="text-sm text-gray-500 underline">투자 기초 과정</Link>}>
    <p className="lesson-objective"><span>학습 목표</span>{lesson.outcome}</p>
    <ol className="lesson-steps">{['개념 먼저 읽기', '사례로 개념 확인', '짧게 확인', '다음에 적용'].map((label, i) => <li key={label} aria-current={step === i ? 'step' : undefined} className={`rounded-full px-3 py-1.5 ${step === i ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{i + 1}. {label}</li>)}</ol>
    {step === 0 && <article className="lesson-reading">
      <section className="lesson-answer"><h3>핵심 개념</h3><p>{explanation.answer}</p></section>
      <section className="lesson-explanation"><h3>왜 그런가요?</h3><div>{explanation.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div></section>
      <section className="lesson-takeaway"><h3>기억할 한 가지</h3><p>{explanation.takeaway}</p></section>
      <section className="lesson-activity-preview"><h3>실습에서 확인하기</h3><p>{PRACTICE_GUIDES[lesson.id].goal}</p><p className="lesson-note">계산 예시는 교육용 가상 상황이며, 별도 표시가 없으면 비용을 제외합니다.</p></section>
      <details className="lesson-sources"><summary>참고 자료 · 2026.09.16 확인</summary><ul>{explanation.sources.map(id => <li key={id}><a href={LEARNING_SOURCES[id].url} target="_blank" rel="noopener noreferrer">{LEARNING_SOURCES[id].title} ↗</a></li>)}</ul><p>일반 투자 원리를 한국어로 정리했습니다. 해외 시장의 세금·주문 제도를 국내에 그대로 적용하는 설명은 아닙니다.</p></details>
    </article>}

    {step === 1 && <div className="lesson-practice"><GuidedPractice key={lesson.id} lesson={lesson} onEvidence={saveEvidence} /></div>}
    {step === 2 && <div className="lesson-questions space-y-6">{lesson.questions.map((question) => <ContextQuestion key={question.id} question={question} scope={scope} />)}</div>}
    {step === 3 && <div className="lesson-application space-y-4"><h3 className="font-bold">거래에서 확인할 한 가지</h3><p>{lesson.connection}</p><p>{lesson.outcome}</p><Link to="/trading" className="inline-block text-brand-700 underline">매수 화면에서 판단 점검하기 →</Link><div><LearningButton disabled={!answered} onClick={() => update({ completed: true })}>{progress.completed ? '학습 과정 완료' : '학습 과정 완료로 표시'}</LearningButton></div>{!answered && <p className="text-xs text-gray-500">앞 단계의 확인 문제 2개에 답하면 완료로 표시할 수 있습니다.</p>}{progress.completed && <p role="status">설명과 문제를 확인했어요. 이 표시는 투자 판단의 정답이나 숙련도 점수가 아닙니다.</p>}</div>}
    <div className="lesson-controls"><LearningButton secondary disabled={step === 0} onClick={() => update({ step: step - 1 })}>이전</LearningButton>{step < 3 && <LearningButton onClick={() => update({ step: step + 1 })}>{step === 0 ? `${PRACTICE_GUIDES[lesson.id].title} →` : step === 1 ? '확인 문제로 이해 점검하기 →' : '다음'}</LearningButton>}{step === 3 && progress.completed && nextLesson && <Link to={`/learn?tab=courses&lesson=${nextLesson.id}`} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-bold text-brand-700">다음 수업: {nextLesson.title} →</Link>}</div>{!state.persistent && <StorageNotice state={state} />}
  </LearningCard></div>;
}
