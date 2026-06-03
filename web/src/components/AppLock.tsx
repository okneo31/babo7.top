// #9 앱 잠금 게이트. 잠금이 켜져 있으면 앱 진입 시 PIN/생체 요구.

import { useEffect, useState } from 'react';
import { appLock } from '@/features/appLock';

export function AppLock({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [tryingBio, setTryingBio] = useState(false);

  // 진입 시 생체 자동 시도(있을 때)
  useEffect(() => {
    if (appLock.hasWebAuthn()) {
      void tryBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitPin() {
    if (await appLock.verifyPin(pin)) {
      onUnlock();
    } else {
      setError('PIN이 올바르지 않습니다.');
      setPin('');
    }
  }

  async function tryBiometric() {
    setTryingBio(true);
    setError('');
    const ok = await appLock.verifyWebAuthn();
    setTryingBio(false);
    if (ok) onUnlock();
    else setError('생체 인증에 실패했습니다. PIN을 입력하세요.');
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-[#0e1621] flex flex-col items-center justify-center p-6">
      <div className="bg-[#17212b] p-8 rounded-3xl w-full max-w-xs shadow-2xl border border-white/5 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-sky-500/20 rounded-2xl flex items-center justify-center text-3xl">🔒</div>
        </div>
        <h1 className="text-xl font-bold text-white mb-1">앱 잠금</h1>
        <p className="text-[#7f91a4] text-sm mb-6">PIN을 입력해 잠금을 해제하세요</p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submitPin();
          }}
          placeholder="••••"
          className="input-style bg-[#0e1621] text-center text-2xl tracking-[0.5em] mb-4"
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button onClick={() => void submitPin()} className="btn-primary bg-sky-500 text-white mb-3">
          잠금 해제
        </button>
        {appLock.hasWebAuthn() && (
          <button
            onClick={() => void tryBiometric()}
            disabled={tryingBio}
            className="btn-soft w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50"
          >
            {tryingBio ? '인증 중…' : '👆 생체 인증으로 해제'}
          </button>
        )}
      </div>
    </div>
  );
}
