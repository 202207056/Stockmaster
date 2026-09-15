export function LearningCard({ title, children, aside }) {
  return <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 sm:p-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-bold text-gray-800">{title}</h2>{aside}</div>{children}</section>;
}

export function LearningButton({ children, secondary = false, className = '', ...props }) {
  return <button type="button" {...props} className={`rounded-lg border px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${secondary ? 'border-gray-300 text-gray-700 hover:bg-gray-50' : 'border-brand-600 bg-brand-600 text-white hover:bg-brand-700'} ${className}`}>{children}</button>;
}

export function SimulationLabel() {
  return <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">교육용 가상 데이터 · 비용 제외</span>;
}

export function LearningField({ label, children }) {
  return <label className="flex min-w-0 flex-col gap-2 text-sm font-medium text-gray-700">{label}{children}</label>;
}

export function StorageNotice({ state }) {
  return <p role="status" className="mt-3 text-xs leading-relaxed text-gray-500">{state.notice || '기록은 이 브라우저에만 저장됩니다. 다른 기기와 동기화되지 않습니다.'}</p>;
}
