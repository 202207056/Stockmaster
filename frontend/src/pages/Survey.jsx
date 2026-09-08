import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SURVEY, STYLES, calcStyle, isComplete, totalScore, toAnswerPayload } from '../constants/survey';
import HelpIcon from '../components/learn/HelpIcon';
import useAuth from '../hooks/useAuth';
import useRemote from '../hooks/useRemote';
import { fetchSurvey, saveSurvey } from '../api/data';
import { updateInvestmentStyle } from '../api/auth';
import { getToken } from '../api/client';
import RemoteState from '../components/common/RemoteState';
import { InlineError } from '../components/common/ErrorState';

/**
 * 투자성향 설문
 *
 * 이 화면의 위치
 *  회원가입 직후 한 번 뜨는 온보딩 화면입니다. 그래서 **상단 메뉴바(Layout)를 쓰지 않고**
 *  App.jsx 에서 Layout 밖 라우트로 뺐습니다. 설문에만 집중하도록 하기 위함입니다.
 *  나중에 다시 하고 싶으면 내 정보 화면에서 들어옵니다.
 *
 * 점수를 감춘 이유
 *  배점(0/5/10/15)은 내부 계산 방식일 뿐이고, 사용자가 볼 이유가 없습니다.
 *  점수가 보이면 "높은 점수 = 좋은 결과"로 오해해 솔직하게 답하지 않게 됩니다.
 *  그래서 진행률만 보여 주고, 결과도 총점 대신 성향 스펙트럼상의 위치로 표시합니다.
 *
 * 고친 것 (기존 시안)
 *  - 선택지가 전부 "설문 선택지 내용이 들어갑니다."였고, 첫 문항 첫 선택지가
 *    항상 체크된 것처럼 보이는 눈속임이 있었습니다.
 *  - 제출하면 아무것도 저장하지 않고 alert 만 띄운 뒤 대시보드로 넘어갔습니다.
 *
 * 제출 시 답변과 규칙 기반 성향을 각각 서버에 저장합니다.
 * 두 번째 저장 실패는 부분 실패로 안내하고 재제출을 허용합니다.
 */
export default function Survey() {
  const { user, isAuthenticated } = useAuth();
  const resource = useRemote(useCallback((signal) => fetchSurvey(signal), []), isAuthenticated);
  return <RemoteState resource={resource} authenticated={isAuthenticated}>{resource.data && <SurveyForm key={user?.user_id} answers={resource.data} />}</RemoteState>;
}

function SurveyForm({ answers }) {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [selections, setSelections] = useState(() => Object.fromEntries(SURVEY.flatMap((question) => {
    const answer = answers.find((item) => item.question_number === question.number);
    const index = question.options.findIndex((option) => option.label === answer?.selected_answer);
    return index < 0 ? [] : [[question.number, index]];
  })));
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);

  const complete = isComplete(selections);
  const answered = SURVEY.filter((q) => selections[q.number] != null).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setTouched(true);
    if (!complete) {
      // 첫 미응답 문항으로 스크롤해 어디가 비었는지 바로 보이게 합니다.
      const first = SURVEY.find((q) => selections[q.number] == null);
      document
        .getElementById(`question-${first.number}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const score = totalScore(selections);
    const style = calcStyle(score);
    const payload = { score, code: style.code, label: style.label };
    setBusy(true);
    setError(null);
    let answersSaved = false;
    const token = getToken();
    try {
      await saveSurvey(toAnswerPayload(selections));
      answersSaved = true;
      if (token !== getToken()) throw new Error('로그인 계정이 바뀌어 성향 저장을 중단했습니다.');
      await updateInvestmentStyle(style.label);
      if (token !== getToken()) return;
      setUser((current) => current?.user_id === user.user_id ? { ...current, investment_style: style.label } : current);
      setResult(payload);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(answersSaved ? new Error('답변은 저장됐지만 성향 저장에 실패했습니다. 다시 제출해 주세요.') : err);
    } finally {
      setBusy(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setSelections({});
    setTouched(false);
  };

  return (
    <SurveyShell>
      {result ? (
        <SurveyResult
          result={result}
          onRetry={handleRetry}
          onDone={() => navigate('/dashboard')}
        />
      ) : (
        <>
          <div className="pb-8">
            <h1 className="text-3xl leading-snug font-extrabold text-gray-900">
              <span className="text-brand-600">투자성향</span>을<br />
              알려 주세요
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              더 나은 맞춤형 분석을 위한 질문이에요.
              <br />
              투자에 대해 잘 몰라도 괜찮아요. 결과는 나중에 다시 바꿀 수 있습니다.
            </p>
          </div>

          {/* 진행률 — 점수는 표시하지 않습니다 */}
          <div className="sticky top-0 z-20 -mx-2 bg-white/95 px-2 py-3 backdrop-blur">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500">
              <span>
                {answered} / {SURVEY.length} 문항
              </span>
              <span className="font-medium text-gray-400">
                {complete ? '모두 답하셨어요' : '솔직하게 답할수록 정확해요'}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${(answered / SURVEY.length) * 100}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-10">
            {SURVEY.map((q) => {
              const missing = touched && selections[q.number] == null;
              return (
                <fieldset key={q.number} id={`question-${q.number}`}>
                  <legend className="mb-3 text-sm font-bold text-gray-800">
                    {q.number}. {q.question}
                    {missing && (
                      <span className="ml-2 text-xs font-medium text-up-600">답변해 주세요</span>
                    )}
                  </legend>
                  <div className="flex flex-col gap-2">
                    {q.options.map((opt, idx) => {
                      const selected = selections[q.number] === idx;
                      return (
                        <label
                          key={opt.label}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                            selected
                              ? 'border-brand-400 bg-brand-50'
                              : missing
                                ? 'border-up-200 bg-white hover:border-gray-300'
                                : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question_${q.number}`}
                            checked={selected}
                            onChange={() =>
                              setSelections((prev) => ({ ...prev, [q.number]: idx }))
                            }
                            className="h-4 w-4 accent-brand-600"
                          />
                          <span
                            className={`text-sm ${selected ? 'font-bold text-gray-900' : 'text-gray-600'}`}
                          >
                            {opt.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}

            <div className="flex items-center gap-3 pb-8">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-brand-600 px-8 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
              >
                {busy ? '서버에 저장 중…' : '저장하고 결과 보기'}
              </button>
              <Link
                to="/dashboard"
                className="text-sm font-medium text-gray-400 hover:text-gray-700"
              >
                나중에 할게요
              </Link>
            </div>
            <InlineError error={error} />
          </form>
        </>
      )}
    </SurveyShell>
  );
}

/**
 * 설문 전용 껍데기 — 상단 메뉴 없이 로고만 둡니다.
 * 온보딩 중에 다른 메뉴로 새어 나가지 않게 하려는 의도입니다.
 */
function SurveyShell({ children }) {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-2xl px-6 py-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-extrabold text-white">
            MI
          </span>
          <span className="text-sm font-extrabold text-gray-900">프로젝트</span>
        </Link>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

function SurveyResult({ result, onRetry, onDone }) {
  const style = calcStyle(result.score);
  const position = STYLES.findIndex((s) => s.code === style.code);

  return (
    <div>
      <p className="text-sm font-bold text-brand-600">투자성향 분석 결과</p>
      <h1 className="mt-2 flex items-center text-3xl font-extrabold text-gray-900">
        {style.label}
        <HelpIcon termId="risk_profile" />
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">{style.summary}</p>

      {/* 총점 대신 성향 스펙트럼에서의 위치를 보여 줍니다 */}
      <div className="mt-8 rounded-xl border border-gray-200 p-6">
        <div className="flex justify-between text-xs font-medium text-gray-400">
          <span>안정</span>
          <span>공격</span>
        </div>
        <div className="mt-2 flex gap-1">
          {STYLES.map((s, i) => (
            <div
              key={s.code}
              className={`h-2 flex-1 rounded-full ${
                i === position ? 'bg-brand-600' : 'bg-gray-100'
              }`}
            />
          ))}
        </div>
        <div className="mt-3 flex justify-between text-[11px] text-gray-400">
          {STYLES.map((s, i) => (
            <span key={s.code} className={i === position ? 'font-bold text-brand-700' : ''}>
              {s.label}
            </span>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
          <span className="flex items-center text-sm text-gray-500">
            권장 주식 비중
            <HelpIcon termId="diversification" />
          </span>
          <span className="text-sm font-bold text-gray-900">{style.stockRatio}</span>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-brand-50 p-5">
        <p className="text-sm font-bold text-brand-700">이렇게 시작해 보세요</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">{style.advice}</p>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        답변과 성향을 서버에 저장했어요. 현재 결과는 설문 점수 규칙에 따른 분류이며 AI 분석 결과는 아닙니다.
      </p>

      <div className="mt-8 flex flex-wrap gap-3 pb-8">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          시작하기
        </button>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
        >
          다시 하기
        </button>
      </div>
    </div>
  );
}
