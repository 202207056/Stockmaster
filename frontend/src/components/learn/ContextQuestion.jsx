import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import useLearning from '../../hooks/useLearning';
import { EMPTY_ANSWER, recordAnswer } from '../../utils/learning';
import { LearningButton } from './LearningUI';

export default function ContextQuestion({ question, scope }) {
  const groupId = useId();
  const { store } = useLearning(scope);
  const saved = store.read(`question:${question.id}`, EMPTY_ANSWER);
  const [choice, setChoice] = useState(-1);
  const [retrying, setRetrying] = useState(false);
  const locked = saved.answered && !retrying;
  const selected = locked ? saved.selected : choice;
  return <div className="flex flex-col gap-3">
    <p className="rounded-lg bg-gray-50 p-4 text-sm leading-relaxed text-gray-800">{question.prompt}</p>
    <fieldset className="flex flex-col gap-2" disabled={locked}><legend className="mb-2 text-sm font-bold">문장의 의미 또는 결과를 선택해 주세요.</legend>{question.options.map((option, i) => <label key={option} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${selected === i ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200'}`}><input type="radio" name={`question-${groupId}`} checked={selected === i} onChange={() => setChoice(i)} className="mt-1 accent-brand-600" />{option}</label>)}</fieldset>
    {locked ? <>
      <div role="status" className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed"><strong>{saved.correct ? '잘 이해했어요.' : '이 부분을 다시 살펴보세요.'}</strong><p className="mt-1">{question.explanation}</p><p className="mt-2 text-xs text-gray-500">{saved.attempts}회 확인 · 첫 시도 {saved.firstCorrect ? '정답' : '다시 확인 필요'}</p></div>
      <div className="flex flex-wrap items-center gap-3"><LearningButton secondary onClick={() => { setChoice(-1); setRetrying(true); }}>다시 풀기</LearningButton>{question.lessonId && <Link className="text-sm text-brand-700 underline" to={`/learn?tab=courses&lesson=${question.lessonId}`}>관련 설명 보기</Link>}</div>
    </> : <div><LearningButton disabled={choice < 0} onClick={() => { store.write(`question:${question.id}`, recordAnswer(saved, choice, question.correct)); setRetrying(false); }}>답 확인하기</LearningButton></div>}
  </div>;
}
