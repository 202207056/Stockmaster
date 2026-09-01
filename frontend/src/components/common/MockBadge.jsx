/**
 * "샘플 데이터" 표시
 *
 * 연동 전 레이아웃을 채워 둔 영역에 붙입니다. (constants/mockData.js 와 세트)
 *
 * 왜 필요한가
 *  가짜 숫자를 화면에 띄우면 시연·발표 중에 실제 데이터로 오해받습니다.
 *  특히 지수와 시세는 그럴듯해 보여서 구분이 안 됩니다. 이 배지가 그 경계를 만듭니다.
 *
 * 연동이 끝나면 해당 영역에서 이 컴포넌트를 지웁니다.
 */
export default function MockBadge({ className = '', label = '샘플' }) {
  return (
    <span
      title="연동 전 임시 데이터입니다. 실제 시세가 아닙니다."
      className={`inline-flex items-center rounded border border-warn-200 bg-warn-50 px-1.5 py-0.5 text-[10px] font-bold text-warn-600 ${className}`}
    >
      {label}
    </span>
  );
}
