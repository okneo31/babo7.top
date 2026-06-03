// #7 프로필. 닉네임/상태메시지 편집, 아바타 업로드. + #9 앱잠금 설정.

import { useState } from 'react';
import { nfc } from '@babotalk/shared';
import { api } from '@/api/client';
import { uploadFile } from '@/api/files';
import { useAuth } from '@/store/auth';
import { appLock } from '@/features/appLock';
import { getAvatarColor, getInitial } from '@/lib/avatar';
import { ModalShell } from './CreateRoomModal';

export function ProfileModal({ onClose }: { onClose: () => void }) {
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [busy, setBusy] = useState(false);

  // 앱 잠금 상태
  const [lockEnabled, setLockEnabled] = useState(appLock.isEnabled());
  const [pin, setPin] = useState('');

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    try {
      const meta = await uploadFile(f, f.name);
      setAvatarUrl(meta.url);
    } catch (err) {
      window.alert('아바타 업로드 실패: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await api.updateProfile({
        nickname: nfc(nickname.trim()) || undefined,
        statusMessage: statusMessage.trim(),
        avatarUrl: avatarUrl || undefined,
      });
      setUser(res.user);
      onClose();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setBusy(false);
    }
  };

  const enableLock = async () => {
    if (pin.length < 4) {
      window.alert('PIN은 4자리 이상 입력하세요.');
      return;
    }
    await appLock.setPin(pin);
    setLockEnabled(true);
    setPin('');
    if (appLock.webAuthnSupported() && window.confirm('생체 인증도 등록하시겠습니까?')) {
      await appLock.registerWebAuthn(user?.username || 'user');
    }
    window.alert('앱 잠금이 활성화되었습니다.');
  };

  const disableLock = () => {
    appLock.disable();
    setLockEnabled(false);
    window.alert('앱 잠금이 해제되었습니다.');
  };

  return (
    <ModalShell onClose={onClose} title="내 프로필">
      <div className="overflow-y-auto pr-1 flex-1 space-y-4">
        <div className="flex flex-col items-center gap-3">
          <div
            className={`w-20 h-20 rounded-full bg-gradient-to-br ${getAvatarColor(
              nickname || 'me',
            )} flex items-center justify-center text-white text-2xl font-bold overflow-hidden`}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              getInitial(nickname)
            )}
          </div>
          <label className="text-sky-400 text-sm font-bold cursor-pointer hover:text-sky-300">
            아바타 변경
            <input type="file" accept="image/*" className="hidden" onChange={onPickAvatar} disabled={busy} />
          </label>
        </div>

        <div>
          <label className="text-xs text-[#7f91a4] font-bold mb-1 block">닉네임</label>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="input-style bg-[#0e1621]"
            placeholder="닉네임"
          />
        </div>

        <div>
          <label className="text-xs text-[#7f91a4] font-bold mb-1 block">상태 메시지</label>
          <input
            value={statusMessage}
            onChange={(e) => setStatusMessage(e.target.value)}
            className="input-style bg-[#0e1621]"
            placeholder="상태 메시지를 입력하세요"
          />
        </div>

        <div className="border-t border-white/10 pt-4">
          <label className="text-xs text-sky-400 font-bold mb-2 block">🔒 앱 잠금 (#9)</label>
          {lockEnabled ? (
            <button onClick={disableLock} className="btn-danger-soft w-full py-3 rounded-xl font-bold text-sm">
              앱 잠금 해제하기
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN (4자리 이상)"
                className="input-style bg-[#0e1621] flex-1"
              />
              <button
                onClick={() => void enableLock()}
                className="bg-sky-500 text-white px-4 rounded-xl text-sm font-bold shrink-0 hover:bg-sky-400"
              >
                설정
              </button>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => void save()}
        disabled={busy}
        className="btn-primary bg-sky-500 text-white shrink-0 mt-4 disabled:opacity-50"
      >
        {busy ? '저장 중…' : '저장'}
      </button>
    </ModalShell>
  );
}
