import { Star } from 'lucide-react';

export default function FavoriteButton({ selected, onClick }) {
  const label = selected ? '관심종목 해제' : '관심종목 추가';
  return <button type="button" onClick={onClick} aria-label={label} aria-pressed={selected} title={label} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-brand-700 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
    <Star size={23} fill={selected ? 'currentColor' : 'none'} aria-hidden="true" />
  </button>;
}
