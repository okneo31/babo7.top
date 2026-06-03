// 라우터. 비로그인 → Login/Register, 로그인 → Home. #9 앱잠금 게이트.

import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { appLock } from '@/features/appLock';
import { Login } from '@/screens/Login';
import { Register } from '@/screens/Register';
import { Home } from '@/screens/Home';
import { AppLock } from '@/components/AppLock';

export function App() {
  const token = useAuth((s) => s.token);
  const hydrate = useAuth((s) => s.hydrate);
  const [locked, setLocked] = useState(() => appLock.isEnabled());

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const authed = !!token;

  // 잠금이 켜져 있고 로그인 상태면 잠금 화면 우선
  if (authed && locked) {
    return <AppLock onUnlock={() => setLocked(false)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={authed ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={authed ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/" element={authed ? <Home /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to={authed ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
