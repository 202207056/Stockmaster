import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { warmUpServer } from './api/client';

/**
 * 앱이 뜨자마자 서버를 한 번 깨웁니다. (Doc/13 §4-2)
 *
 * 배포된 백엔드가 무료 티어라 유휴 상태에서 잠들고, 첫 요청이 15초 이상 걸립니다.
 * 사용자가 로그인 버튼을 누르기 전에 미리 깨워 두면 체감 지연이 크게 줄어듭니다.
 * 실패해도 앱 동작에는 영향이 없습니다.
 */
warmUpServer();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
