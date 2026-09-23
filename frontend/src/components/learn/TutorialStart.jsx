import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TutorialRunning } from './tutorial-context';

export default function TutorialStart({ title, children }) {
  const [started, setStarted] = useState(false);
  const navigate = useNavigate();
  return <TutorialRunning.Provider value={started}>
    <div inert={!started}>{children}</div>
    {!started && <StartDialog title={title} onStart={() => setStarted(true)} onSkip={() => navigate('/learn?tab=guide', { replace: true })} />}
  </TutorialRunning.Provider>;
}

function StartDialog({ title, onStart, onSkip }) {
  const dialog = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return <dialog ref={dialog} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event => { event.preventDefault(); onSkip(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-brand-200 bg-white p-7 shadow-xl backdrop:bg-slate-900/50">
    <p className="mb-2 text-sm font-bold text-brand-600">{title}</p>
    <h2 id={titleId} className="text-xl font-extrabold text-gray-900">튜토리얼이 시작됩니다.</h2>
    <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-gray-600">강조된 영역과 설명을 따라 직접 조작해 보세요. 지금 시작하거나 건너뛸 수 있습니다.</p>
    <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" autoFocus onClick={onStart} className="flex-1 rounded-lg bg-brand-600 px-5 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700">시작하기</button>
      <button type="button" onClick={onSkip} className="flex-1 rounded-lg border border-gray-300 px-5 py-3 font-bold text-gray-600">건너뛰기</button>
    </div>
  </dialog>;
}
