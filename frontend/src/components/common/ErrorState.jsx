import { TriangleAlert } from 'lucide-react';
import { toUserMessage } from '../../api/client';

/**
 * 오류 상태 (F-8)
 *
 * error 객체를 그대로 넘기면 FastAPI 의 detail 문구를 꺼내서 보여 줍니다.
 * (Doc/13 §3-4 — "매수 가능 현금이 부족합니다." 같은 문구가 그대로 노출됩니다)
 */
export default function ErrorState({ error, message, onRetry, className = '' }) {
  const text = message || (error ? error.userMessage || toUserMessage(error) : '문제가 발생했어요.');

  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center gap-3 px-6 py-10 text-center ${className}`}
    >
      <TriangleAlert size={28} strokeWidth={1.5} aria-hidden="true" className="text-gray-400" />
      <p className="max-w-sm text-sm leading-relaxed font-medium text-gray-700">{text}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}

/** 인라인(작은 영역)용 한 줄 오류 */
export function InlineError({ error, message, className = '' }) {
  const text = message || (error ? error.userMessage || toUserMessage(error) : null);
  if (!text) return null;
  return (
    <p role="alert" className={`text-sm text-up-600 ${className}`}>
      {text}
    </p>
  );
}
