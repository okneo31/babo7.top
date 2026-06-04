// 엔트리. React 마운트 + 전역 스타일(legacy 텔레그램풍 토큰).

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/App';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import '@/styles.css';

// dev에선 서비스워커를 쓰지 않는다. 과거 등록된 SW가 남아 옛 캐시를 물면
// "새로고침 시 빈화면/수정 미반영"이 생기므로 개발 모드에서 자동 해제한다.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
  if ('caches' in window) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k)));
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
