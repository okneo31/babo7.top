// 친구 목록 + 친구 추가 + 1:1 대화 시작. presence#5 표시.

import { useEffect, useState } from 'react';
import { nfc } from '@babotalk/shared';
import type { Friend } from '@babotalk/shared';
import { api, ApiError } from '@/api/client';
import { useUi } from '@/store/ui';
import { getAvatarColor, getInitial } from '@/lib/avatar';
import { PresenceDot } from './PresenceDot';

export function FriendList({ onRoomsChanged }: { onRoomsChanged: () => void }) {
  const setCurrentRoom = useUi((s) => s.setCurrentRoom);
  const setTab = useUi((s) => s.setTab);
  const openMobileChat = useUi((s) => s.openMobileChat);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const reload = () => {
    setLoading(true);
    api
      .friends()
      .then(setFriends)
      .catch(() => setFriends([]))
      .finally(() => setLoading(false));
  };

  useEffect(reload, []);

  const addFriend = async () => {
    const friendId = nfc(input.trim());
    if (!friendId) {
      window.alert('추가할 친구의 아이디나 닉네임을 입력하세요.');
      return;
    }
    setAdding(true);
    try {
      const res = await api.addFriend({ friendId });
      if (res && res.success === false) throw new Error(res.message || '추가 실패');
      setInput('');
      reload();
    } catch (e) {
      window.alert(e instanceof ApiError || e instanceof Error ? e.message : '친구 추가 실패');
    } finally {
      setAdding(false);
    }
  };

  const startDm = async (friendNick: string) => {
    try {
      const res = await api.dmRoom({ friendNick: nfc(friendNick) });
      setTab('rooms');
      setCurrentRoom({
        roomId: res.roomId,
        name: res.roomName,
        type: 'dm',
        owner: '',
        members: [],
        createdAt: new Date().toISOString(),
      });
      openMobileChat();
      onRoomsChanged();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '대화방 생성 실패');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-3 bg-[var(--tg-sidebar)] border-b border-white/5 shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void addFriend();
            }}
            placeholder="아이디 또는 닉네임 검색..."
            className="input-style py-2 bg-[#0e1621] text-sm flex-1"
          />
          <button
            onClick={() => void addFriend()}
            disabled={adding}
            className="bg-sky-500 text-white px-4 py-2 rounded-xl text-sm font-bold shrink-0 hover:bg-sky-400 transition disabled:opacity-50"
          >
            추가
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && <div className="text-center text-[#7f91a4] text-sm mt-8">불러오는 중…</div>}
        {!loading && friends.length === 0 && (
          <div className="text-center text-[#7f91a4] text-sm mt-10">
            등록된 친구가 없습니다.
            <br />
            아이디나 닉네임을 검색해 추가해보세요.
          </div>
        )}
        {friends.map((f) => (
          <div
            key={f.username}
            className="room-item p-3 rounded-2xl cursor-pointer flex justify-between items-center group bg-transparent hover:bg-[var(--tg-input)]"
          >
            <div className="relative shrink-0 mr-3">
              <div
                className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(
                  f.nickname,
                )} flex items-center justify-center text-white text-sm font-bold`}
              >
                {f.avatarUrl ? (
                  <img src={f.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  getInitial(f.nickname)
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5">
                <PresenceDot online={!!f.online} />
              </span>
            </div>
            <div className="flex flex-col flex-1 truncate pr-2 justify-center min-w-0">
              <span className="font-bold text-gray-100 group-hover:text-sky-400 truncate text-[15px]">{f.nickname}</span>
              <span className="text-[11px] text-[#7f91a4] truncate">
                {f.statusMessage ? f.statusMessage : `@${f.username}`}
              </span>
            </div>
            <button
              onClick={() => void startDm(f.nickname)}
              className="bg-sky-500/20 text-sky-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-sky-500 hover:text-white transition shrink-0 border border-sky-500/30"
            >
              1:1 대화
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
