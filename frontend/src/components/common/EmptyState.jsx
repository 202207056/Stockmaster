import { Inbox } from 'lucide-react';

/**
 * 빈 상태 (F-8)
 *
 * 아이콘은 lucide 컴포넌트를 `Icon` prop 으로 받습니다. (이모지 아님)
 * 문구 프리셋은 constants/emptyMessages.js 에 있습니다.
 *
 *   import EmptyState from '.../EmptyState';
 *   import { EMPTY_MESSAGES } from '.../constants/emptyMessages';
 *   <EmptyState {...EMPTY_MESSAGES.favorites} />
 *
 *   또는 직접:
 *   <EmptyState Icon={Star} title="..." description="..." />
 */
export default function EmptyState({
  Icon = Inbox,
  title = '표시할 내용이 없어요',
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 px-6 py-12 text-center ${className}`}
    >
      <Icon size={28} strokeWidth={1.5} aria-hidden="true" className="text-gray-300" />
      <p className="text-sm font-bold text-gray-700">{title}</p>
      {description && (
        <p className="max-w-xs text-sm leading-relaxed text-gray-500">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
