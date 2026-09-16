import { useState } from 'react';
import { PRACTICE_GUIDES } from '../../constants/practiceGuides';
import InteractivePractice from './InteractivePractice';
import { LearningButton } from './LearningUI';

export default function GuidedPractice({ lesson, onEvidence }) {
  const guide = PRACTICE_GUIDES[lesson.id];
  const [showConclusion, setShowConclusion] = useState(false);
  return <div className="space-y-5">
    <header className="rounded-xl bg-brand-50 p-4"><h3 className="font-bold text-gray-900">{guide.title}</h3><p className="mt-2 text-sm leading-relaxed text-gray-700">{guide.goal}</p></header>
    <section><h4 className="mb-3 text-sm font-bold">이 순서로 확인하세요</h4><ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-gray-700">{guide.steps.map((step) => <li key={step}>{step}</li>)}</ol></section>
    <section aria-label={guide.title} className="rounded-xl border border-gray-200 p-4"><InteractivePractice type={lesson.activity} lessonId={lesson.id} onEvidence={onEvidence} /></section>
    <section className="border-t border-gray-200 pt-4"><LearningButton secondary aria-expanded={showConclusion} onClick={() => setShowConclusion((value) => !value)}>{showConclusion ? '결과 해설 접기' : '비교한 결과, 어떻게 해석할까요?'}</LearningButton>{showConclusion && <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm leading-7"><h4 className="mb-2 font-bold">이 실습에서 이해할 개념</h4><p>{guide.conclusion}</p><p className="mt-3 text-brand-700">다음 확인 문제에서 이 개념을 다른 상황에도 적용해 보세요.</p></div>}</section>
  </div>;
}
