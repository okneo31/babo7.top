// 엔트리. React 마운트 + 전역 스타일(legacy 텔레그램풍 토큰).

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/App';
import '@/styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
