import { useState } from 'react';

export default function Avatar({ name, src }) {
  const [failed, setFailed] = useState(null);
  return <span aria-hidden="true" className="community-avatar flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-base font-bold text-brand-700 ring-1 ring-brand-100">
    {src && failed !== src ? <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(src)} /> : Array.from(name || '?')[0]}
  </span>;
}
