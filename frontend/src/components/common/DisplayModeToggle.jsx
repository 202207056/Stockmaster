import { useEffect, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';

export default function DisplayModeToggle() {
  const [mode, setMode] = useState(() => window.innerWidth < 768 ? 'mobile' : 'desktop');
  useEffect(() => {
    const receive = event => {
      if (event.origin !== window.location.origin || event.source !== window.parent || event.data?.type !== 'stockmaster:display-state') return;
      if (event.data.mode === 'desktop' || event.data.mode === 'mobile') setMode(event.data.mode);
    };
    window.addEventListener('message', receive);
    window.parent.postMessage({ type: 'stockmaster:display-ready' }, window.location.origin);
    return () => window.removeEventListener('message', receive);
  }, []);
  const mobile = mode === 'mobile';
  const label = mobile ? 'PC 버전으로 전환' : '모바일 버전으로 전환';
  const Icon = mobile ? Monitor : Smartphone;
  return <button type="button" onClick={() => window.parent.postMessage({ type: 'stockmaster:display-mode', mode: mobile ? 'desktop' : 'mobile' }, window.location.origin)}
    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
    aria-label={label} title={label}><Icon size={14} aria-hidden="true" /><span>{mobile ? 'PC 버전' : '모바일 버전'}</span></button>;
}
