// 새 방/채널 만들기. 친구 초대 체크박스. legacy 흐름 보존.

import { useEffect, useState } from 'react';
import { nfc } from '@babotalk/shared';
import type { Friend, RoomType } from '@babotalk/shared';
import { api } from '@/api/client';
import { useUi } from '@/store/ui';
import { getAvatarColor, getInitial } from '@/lib/avatar';

export function CreateRoomModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const setCurrentRoom = useUi((s) => s.setCurrentRoom);
  const openMobileChat = useUi((s) => s.openMobileChat);

  const [name, setName] = useState('');
  const [type, setType] = useState<RoomType>('public');
  const [customId, setCustomId] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invitees, setInvitees] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.friends().then(setFriends).catch(() => setFriends([]));
  }, []);

  const toggleInvitee = (nick: string) => {
    setInvitees((prev) => {
      const next = new Set(prev);
      if (next.has(nick)) next.delete(nick);
      else next.add(nick);
      return next;
    });
  };

  const create = async () => {
    if (!name.trim()) {
      window.alert('방 제목을 입력해주세요.');
      return;
    }
    if (type === 'secret' && invitees.size === 0 && !customId.trim()) {
      window.alert('🔒 비밀방 개설 시 방 코드를 입력하거나 친구를 1명 이상 초대해야 합니다.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.createRoom({
        name: name.trim(),
        type,
        customId: customId.trim() || undefined,
        invitees: invitees.size ? [...invitees].map((n) => nfc(n)) : undefined,
      });
      onCreated();
      setCurrentRoom({
        roomId: res.roomId,
        name: name.trim(),
        type,
        owner: '',
        members: [],
        createdAt: new Date().toISOString(),
      });
      openMobileChat();
      onClose();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '방 생성 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title="새 방 / 채널 만들기">
      <div className="overflow-y-auto pr-1 flex-1 space-y-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="방 제목"
          className="input-style bg-[#0e1621]"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as RoomType)}
          className="input-style bg-[#0e1621]"
        >
          <option value="public">🔓 일반 공개방 (누구나 대화)</option>
          <option value="channel">📢 공지 채널 (방장만 쓰기)</option>
          <option value="secret">🔒 비밀 그룹방 (초대 전용)</option>
        </select>
        <input
          value={customId}
          onChange={(e) => setCustomId(e.target.value.toUpperCase())}
          placeholder="방 코드 (비밀방: 선택사항)"
          className="input-style bg-[#0e1621] uppercase text-sm"
        />
        <div>
          <label className="text-xs text-sky-400 font-bold mb-2 block">👥 초대할 친구 선택 (선택사항)</label>
          <div className="max-h-36 overflow-y-auto bg-[#0e1621] rounded-xl border border-white/5 p-2 space-y-1">
            {friends.length === 0 ? (
              <div className="text-sm text-[#7f91a4] text-center py-3">추가된 친구가 없습니다.</div>
            ) : (
              friends.map((f) => (
                <label
                  key={f.username}
                  className="flex items-center gap-3 p-2 hover:bg-[#242f3d] rounded-lg cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={invitees.has(f.nickname)}
                    onChange={() => toggleInvitee(f.nickname)}
                    className="invite-checkbox w-4 h-4 rounded text-sky-500"
                  />
                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(
                      f.nickname,
                    )} flex items-center justify-center text-white font-bold text-xs shrink-0`}
                  >
                    {getInitial(f.nickname)}
                  </div>
                  <span className="text-[14px] text-gray-200 font-semibold">{f.nickname}</span>
                </label>
              ))
            )}
          </div>
        </div>
      </div>
      <button
        onClick={() => void create()}
        disabled={busy}
        className="btn-primary bg-sky-500 text-white shrink-0 mt-4 disabled:opacity-50"
      >
        {busy ? '개설 중…' : '개설 및 초대하기'}
      </button>
    </ModalShell>
  );
}

export function JoinSecretModal({ onClose, onJoined }: { onClose: () => void; onJoined: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const setCurrentRoom = useUi((s) => s.setCurrentRoom);
  const openMobileChat = useUi((s) => s.openMobileChat);

  const join = async () => {
    const roomId = code.trim().toUpperCase();
    if (!roomId) {
      window.alert('방 코드를 입력해주세요.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.joinRoom({ roomId });
      onJoined();
      setCurrentRoom({
        roomId,
        name: res.name,
        type: 'secret',
        owner: res.owner,
        members: [],
        createdAt: new Date().toISOString(),
      });
      openMobileChat();
      onClose();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '입장 실패');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title="🔒 비밀방 입장">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="방 코드 입력"
        className="input-style bg-[#0e1621] mb-6 text-center uppercase text-lg tracking-widest"
      />
      <button onClick={() => void join()} disabled={busy} className="btn-primary bg-sky-500 text-white disabled:opacity-50">
        입장하기
      </button>
    </ModalShell>
  );
}

export function ModalShell({
  onClose,
  title,
  children,
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#17212b] border border-white/10 w-full max-w-sm p-6 rounded-2xl relative shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-xl text-[#7f91a4] hover:text-white">
          ✕
        </button>
        <h3 className="font-bold text-xl mb-4 text-white shrink-0">{title}</h3>
        {children}
      </div>
    </div>
  );
}
