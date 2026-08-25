/**
 * 빈 상태 (F-8)
 *
 * 문구 프리셋은 constants/emptyMessages.js 에 있습니다.
 *   import EmptyState from '.../EmptyState';
 *   import { EMPTY_MESSAGES } from '.../constants/emptyMessages';
 *   <EmptyState {...EMPTY_MESSAGES.favorites} />
 */
export default function EmptyState({
  icon = '🔍',
  title = '표시할 내용이 없어요',
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 px-6 py-12 text-center ${className}`}
    >
      <div className="text-3xl" aria-hidden="true">
        {icon}
      </div>
      <p className="text-sm font-bold text-gray-700">{title}</p>
      {description && (
        <p className="max-w-xs text-sm leading-relaxed text-gray-500">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
