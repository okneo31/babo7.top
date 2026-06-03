// 로그인 화면. legacy 텔레그램풍 다크 UI 보존.

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { ApiError } from '@/api/client';

export function Login() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const loading = useAuth((s) => s.loading);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      window.alert(err instanceof ApiError || err instanceof Error ? err.message : '로그인 실패');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] p-6 bg-[#0e1621]">
      <div className="bg-[#17212b] p-8 rounded-3xl w-full max-w-sm shadow-2xl border border-white/5">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg rotate-3">
            <span className="text-3xl text-white">💬</span>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-white mb-1 text-center tracking-tight">바보톡</h1>
        <p className="text-center text-[#7f91a4] text-sm mb-8">SECURE MESSENGER</p>
        <form className="space-y-4" onSubmit={submit}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            type="text"
            placeholder="아이디"
            autoComplete="username"
            required
            className="input-style"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="비밀번호"
            autoComplete="current-password"
            required
            className="input-style"
          />
          <button type="submit" disabled={loading} className="btn-primary mt-4 shadow-lg shadow-sky-500/20 disabled:opacity-50">
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>
        <Link
          to="/register"
          className="block text-sm text-sky-400 text-center cursor-pointer hover:text-sky-300 transition mt-4 font-semibold"
        >
          새 계정 만들기
        </Link>
      </div>
    </div>
  );
}
