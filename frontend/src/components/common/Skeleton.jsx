/**
 * 로딩 자리표시자 (F-8)
 *
 * 스피너 대신 스켈레톤을 기본으로 쓰는 이유:
 * Render 콜드스타트로 첫 응답이 15초까지 걸립니다. 그동안 화면이 비어 있으면
 * "고장난 것"처럼 보이는데, 스켈레톤은 "무엇이 올지"를 미리 보여 줍니다.
 */
export function Skeleton({ className = '', ...props }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" {...props} />;
}

/** 텍스트 여러 줄 */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

/** 목록 행 */
export function SkeletonList({ rows = 5, className = '' }) {
  return (
    <div className={`flex flex-col ${className}`} aria-busy="true" aria-live="polite">
      <span className="sr-only">불러오는 중입니다</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between border-b border-gray-100 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

/** 카드 */
export function SkeletonCard({ className = '' }) {
  return (
    <div className={`rounded-lg border border-gray-100 p-4 ${className}`} aria-hidden="true">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="mt-3 h-7 w-32" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}

export default Skeleton;
