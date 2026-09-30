import { useCallback, useState } from 'react';
import { fetchStockLogo } from '../../api/data';
import { safeExternalUrl } from '../../api/normalize';
import useRemote from '../../hooks/useRemote';
import { useSitePractice } from '../../contexts/site-practice';

export default function StockLogo({ code, name, className = 'h-8 w-8' }) {
  const practice = useSitePractice();
  const resource = useRemote(useCallback((signal) => fetchStockLogo(code, signal), [code]), !!code && !practice, { cacheKey: JSON.stringify(['logo', code]), publicCache: true });
  const src = resource.data?.symbol_code === code ? safeExternalUrl(resource.data.logo_url) : null;
  const [failedSrc, setFailedSrc] = useState(null);
  return <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-100 bg-white text-xs font-bold text-gray-500 ${className}`}>
    {src && src !== failedSrc
      ? <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedSrc(src)} className="h-full w-full object-contain" />
      : (name?.trim().slice(0, 1) || code?.slice(0, 1) || '·')}
  </span>;
}
