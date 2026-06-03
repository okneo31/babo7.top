// 회원가입 화면. 초대코드 검증. legacy UI 보존.

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { ApiError } from '@/api/client';

export function Register() {
  const navigate = useNavigate();
  const register = useAuth((s) => s.register);
  const loading = useAuth((s) => s.loading);
  const [inviteCode, setInviteCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(inviteCode, username, password, nickname);
      window.alert('가입 완료! 로그인하세요.');
      navigate('/login', { replace: true });
    } catch (err) {
      window.alert(err instanceof ApiError || err instanceof Error ? err.message : '가입 실패');
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
        <p className="text-center text-[#7f91a4] text-sm mb-8">새 계정 만들기</p>
        <form className="space-y-4" onSubmit={submit}>
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            type="text"
            placeholder="초대 코드"
            required
            className="input-style text-center text-sky-400 font-bold"
          />
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
            autoComplete="new-password"
            required
            className="input-style"
          />
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            type="text"
            placeholder="닉네임"
            required
            className="input-style"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary mt-4 bg-[#242f3d] text-white hover:bg-[#2a394a] disabled:opacity-50"
          >
            {loading ? '가입 중…' : '회원가입'}
          </button>
        </form>
        <Link to="/login" className="block text-sm text-[#7f91a4] text-center cursor-pointer hover:text-white transition mt-4">
          👈 로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
