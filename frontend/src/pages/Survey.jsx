import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MAX_SCORE, SURVEY, calcStyle, isComplete, totalScore } from '../constants/survey';
import HelpIcon from '../components/learn/HelpIcon';

/**
 * 투자성향 설문 (§5-4)
 *
 * 고친 것
 *  - 선택지가 전부 "설문 선택지 내용이 들어갑니다."로 되어 있었고, 첫 문항의 첫 번째가
 *    항상 체크된 것처럼 보이는 눈속임이 들어 있었습니다.
 *  - 제출하면 아무것도 저장하지 않고 alert 만 띄운 뒤 대시보드로 넘어갔습니다.
 *
 * 지금
 *  - 실제 문항·선택지·배점을 constants/survey.js 에서 읽어 옵니다.
 *  - 총점으로 성향을 프론트에서 계산해 결과 화면까지 보여 줍니다.
 *    (GET /api/ai/propensity 는 분석 주체가 없어 항상 null 이라 서버 결과를 쓸 수 없습니다.)
 *  - 로그인 없이도 설문하고 결과를 볼 수 있습니다. 결과는 이 브라우저에만 남습니다.
 *
 * TODO(F-19): 제출 시 POST /api/ai/survey 로 원본 답변을 저장하고,
 *             PUT /api/users/survey 로 계산된 성향 라벨을 저장합니다.
 */
const RESULT_KEY = 'gp_survey_result';

export default function Survey() {
  const [selections, setSelections] = useState({});
  const [result, setResult] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(RESULT_KEY) || 'null');
    } catch {
      return null;
    }
  });
  const [touched, setTouched] = useState(false);

  const score = totalScore(selections);
  const complete = isComplete(selections);
  const answered = SURVEY.filter((q) => selections[q.number] != null).length;

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!complete) {
      // 첫 미응답 문항으로 스크롤해 어디가 비었는지 바로 보이게 합니다.
      const first = SURVEY.find((q) => selections[q.number] == null);
      document
        .getElementById(`question-${first.number}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const style = calcStyle(score);
    const payload = { score, code: style.code, label: style.label };
    try {
      localStorage.setItem(RESULT_KEY, JSON.stringify(payload));
    } catch {
      /* 저장 실패해도 결과 화면은 보여 줍니다. */
    }
    setResult(payload);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetry = () => {
    setResult(null);
    setSelections({});
    setTouched(false);
  };

  if (result) return <SurveyResult result={result} onRetry={handleRetry} />;

  return (
    <div className="mx-auto w-full max-w-2xl">
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

      {/* 진행률 */}
      <div className="sticky top-[4.5rem] z-20 -mx-2 bg-white/95 px-2 py-3 backdrop-blur">
        <div className="flex items-center justify-between text-xs font-bold text-gray-500">
          <span>
            {answered} / {SURVEY.length} 문항
          </span>
          <span className="tabular">
            {score}점 / {MAX_SCORE}점
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
                        onChange={() => setSelections((prev) => ({ ...prev, [q.number]: idx }))}
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
            className="rounded-lg bg-brand-600 px-8 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            결과 보기
          </button>
          <Link to="/dashboard" className="text-sm font-medium text-gray-400 hover:text-gray-700">
            나중에 할게요
          </Link>
        </div>
      </form>
    </div>
  );
}

function SurveyResult({ result, onRetry }) {
  const style = calcStyle(result.score);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <p className="text-sm font-bold text-brand-600">투자성향 분석 결과</p>
      <h1 className="mt-2 flex items-center text-3xl font-extrabold text-gray-900">
        {style.label}
        <HelpIcon termId="risk_profile" />
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">{style.summary}</p>

      <div className="mt-8 flex flex-col gap-4 rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">총점</span>
          <span className="tabular text-lg font-extrabold text-gray-900">
            {result.score} / {MAX_SCORE}점
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-brand-600"
            style={{ width: `${(result.score / MAX_SCORE) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
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

      {/* TODO(F-19): 서버 저장 전까지는 이 브라우저에만 남습니다. */}
      <p className="mt-4 text-xs text-gray-400">
        아직 서버에 저장되지 않는 임시 결과예요. 다른 기기에서는 보이지 않습니다.
      </p>

      <div className="mt-8 flex flex-wrap gap-3 pb-8">
        <Link
          to="/dashboard"
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
        >
          대시보드로 가기
        </Link>
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
