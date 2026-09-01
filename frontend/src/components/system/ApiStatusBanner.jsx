import { useEffect, useState } from 'react';
import { EVT_RECOVERED, EVT_SLOW } from '../../api/client';

/**
 * 콜드스타트 안내 배너 (Doc/13 §4-2)
 *
 * 배포된 백엔드가 무료 티어라 유휴 상태에서 잠듭니다. 첫 요청이 15초 이상 걸리는데
 * 아무 표시가 없으면 사용자에게는 "먹통"으로 보입니다. 응답이 3초를 넘기면
 * api/client.js 가 api:slow 이벤트를 쏘고, 이 배너가 상황을 설명합니다.
 *
 * 시연 품질에 직접 영향을 주는 장치라 우선순위를 높게 잡았습니다.
 */
export default function ApiStatusBanner() {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const onSlow = () => setSlow(true);
    const onRecovered = () => setSlow(false);
    window.addEventListener(EVT_SLOW, onSlow);
    window.addEventListener(EVT_RECOVERED, onRecovered);
    return () => {
      window.removeEventListener(EVT_SLOW, onSlow);
      window.removeEventListener(EVT_RECOVERED, onRecovered);
    };
  }, []);

  if (!slow) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4"
    >
      <div className="flex items-center gap-3 rounded-full border border-warn-200 bg-warn-50 px-5 py-2.5 shadow-lg">
        <span
          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-warn-600 border-t-transparent"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-warn-600">
          서버를 깨우는 중이에요. 처음 접속은 15초 정도 걸릴 수 있어요.
        </span>
      </div>
    </div>
  );
}
