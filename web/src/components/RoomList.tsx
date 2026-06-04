// 방 목록. 검색 + 즐겨찾기(localStorage) + 선택. 현재 방 강조.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Room } from '@babotalk/shared';
import { api } from '@/api/client';
import { useAuth } from '@/store/auth';
import { useUi } from '@/store/ui';
import { getSocket } from '@/socket/socket';
import { getAvatarColor, getInitial } from '@/lib/avatar';

const LS_FAV = 'bt_favorites';

function loadFavs(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_FAV) || '[]') as string[];
  } catch {
    return [];
  }
}

export function RoomList({ reloadKey }: { reloadKey: number }) {
  const myNick = useAuth((s) => s.user?.nickname || '');
  const currentRoom = useUi((s) => s.currentRoom);
  const setCurrentRoom = useUi((s) => s.setCurrentRoom);
  const openMobileChat = useUi((s) => s.openMobileChat);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState('');
  const [favs, setFavs] = useState<string[]>(loadFavs);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    return api
      .rooms()
      .then((r) => setRooms(r))
      .catch(() => {
        /* ignore */
      })
      .finally(() => setLoading(false));
  }, []);

  // 명시적 갱신(방 생성/입장/친구변경)
  useEffect(() => {
    setLoading(true);
    void load();
  }, [reloadKey, load]);

  // 실시간 갱신: 새 메시지/읽음 이벤트가 오면 unread·lastMsg 갱신(디바운스)
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    let t: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(t);
      t = setTimeout(() => void load(), 250);
    };
    s.on('message', refresh);
    s.on('user_read', refresh);
    s.on('nuke_trigger', refresh); // 폭파된 방 목록에서 제거
    return () => {
      clearTimeout(t);
      s.off('message', refresh);
      s.off('user_read', refresh);
      s.off('nuke_trigger', refresh);
    };
  }, [load]);

  // 방을 열면 잠시 후 다시 불러와(서버의 read_room 처리 반영) 안읽음 배지 제거
  useEffect(() => {
    if (!currentRoom?.roomId) return;
    const t = setTimeout(() => void load(), 400);
    return () => clearTimeout(t);
  }, [currentRoom?.roomId, load]);

  const toggleFav = (e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    setFavs((prev) => {
      const next = prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId];
      localStorage.setItem(LS_FAV, JSON.stringify(next));
      return next;
    });
  };

  const display = (room: Room): string => {
    if (room.type === 'dm' || room.roomId.startsWith('DM_')) {
      return room.members.find((m) => m !== myNick) || room.name;
    }
    return room.name;
  };

  const sorted = useMemo(() => {
    const filtered = rooms.filter((r) => display(r).toLowerCase().includes(search.toLowerCase()));
    return [...filtered].sort((a, b) => {
      const af = favs.includes(a.roomId) ? 1 : 0;
      const bf = favs.includes(b.roomId) ? 1 : 0;
      return bf - af;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, search, favs, myNick]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="p-3 bg-[var(--tg-sidebar)] shrink-0">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7f91a4]">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="채팅방 검색..."
            className="input-style pl-9 py-2 bg-[#0e1621] text-sm"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && <div className="text-center text-[#7f91a4] text-sm mt-8">불러오는 중…</div>}
        {!loading && sorted.length === 0 && (
          <div className="text-center text-[#7f91a4] text-sm mt-10">대화방이 없습니다.</div>
        )}
        {sorted.map((room) => {
          const name = display(room);
          const isDm = room.type === 'dm' || room.roomId.startsWith('DM_');
          const active = currentRoom?.roomId === room.roomId;
          // 지금 열어 보고 있는 방은 '읽는 중'이므로 안읽음 배지를 띄우지 않는다(레이스 방지).
          const icon =
            room.type === 'secret' ? '🔒' : room.type === 'channel' ? '📢' : getInitial(name);
          const colorKey = isDm ? name : room.roomId;
          const unread = active ? 0 : room.unread || 0;
          const fav = favs.includes(room.roomId);
          return (
            <div
              key={room.roomId}
              onClick={() => {
                setCurrentRoom(room);
                openMobileChat();
              }}
              className={`room-item p-3 rounded-2xl cursor-pointer flex justify-between items-center group ${
                active ? 'bg-[var(--tg-input)]' : 'bg-transparent'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarColor(
                  colorKey,
                )} flex items-center justify-center shadow-sm shrink-0 mr-3 relative text-white font-bold`}
              >
                {icon}
                {unread > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1 border-2 border-[var(--tg-sidebar)]">
                    {unread}
                  </div>
                )}
              </div>
              <div className="flex flex-col flex-1 truncate pr-2 justify-center min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-100 group-hover:text-sky-400 truncate text-[15px] min-w-0">
                    {name}
                  </span>
                  <span
                    onClick={(e) => toggleFav(e, room.roomId)}
                    className="text-amber-400 text-sm cursor-pointer hover:scale-125 transition-transform shrink-0"
                  >
                    {fav ? '★' : '☆'}
                  </span>
                </div>
                <span className="text-[12.5px] text-[#7f91a4] mt-1 truncate min-w-0">
                  {room.lastMsgText || '대화가 없습니다.'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
