import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getTheme, setTheme, subscribeTheme } from '../../utils/theme';

export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeTheme, getTheme, () => 'light') === 'dark';
  const label = dark ? '라이트 모드로 전환' : '다크 모드로 전환';
  const Icon = dark ? Sun : Moon;
  return <button type="button" onClick={() => setTheme(dark ? 'light' : 'dark')}
    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
    aria-label={label} title={label}><Icon size={14} aria-hidden="true" /><span>{dark ? '라이트 모드' : '다크 모드'}</span></button>;
}
