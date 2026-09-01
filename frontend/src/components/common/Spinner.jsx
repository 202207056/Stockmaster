/** 버튼 안 등 좁은 영역에서 쓰는 로딩 표시 */
export default function Spinner({ className = 'h-4 w-4', label = '처리 중' }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}
