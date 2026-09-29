import { useState } from 'react';
import { Newspaper } from 'lucide-react';
import { safeExternalUrl } from '../../api/normalize';

export default function NewsThumbnail({ url }) {
  const src = safeExternalUrl(url);
  const [failedSrc, setFailedSrc] = useState(null);
  return <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white" aria-hidden="true">
    {src && src !== failedSrc
      ? <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedSrc(src)} className="h-full w-full object-cover" />
      : <Newspaper size={24} strokeWidth={1.5} className="text-gray-300" />}
  </div>;
}
