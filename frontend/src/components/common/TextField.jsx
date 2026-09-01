import { useId } from 'react';

/**
 * 폼 입력 한 칸 (라벨 + 입력 + 도움말/오류)
 *
 * 로그인·회원가입 폼에서 같은 마크업을 반복하지 않으려고 뺐습니다.
 * 오류가 있으면 테두리 색과 함께 aria-invalid / aria-describedby 를 걸어
 * 스크린리더에도 어느 칸이 잘못됐는지 전달됩니다.
 */
export default function TextField({
  label,
  error,
  hint,
  type = 'text',
  className = '',
  ...inputProps
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  const message = error || hint;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-bold text-gray-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? msgId : undefined}
        className={`rounded-lg border bg-white px-4 py-2.5 text-sm text-gray-900 transition placeholder:text-gray-400 focus:outline-none ${
          error
            ? 'border-up-500 focus:border-up-600'
            : 'border-gray-300 focus:border-brand-500'
        }`}
        {...inputProps}
      />
      {message && (
        <p id={msgId} className={`text-xs ${error ? 'text-up-600' : 'text-gray-400'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
