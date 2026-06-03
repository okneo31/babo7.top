// #10 관리자 제어판. 통계/공지/유저관리/전체초기화.

import { useEffect, useState } from 'react';
import { nfc } from '@babotalk/shared';
import type { AdminStatsResult, AdminUserRow } from '@babotalk/shared';
import { api } from '@/api/client';
import { ModalShell } from './CreateRoomModal';

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<AdminStatsResult | null>(null);
  const [notice, setNotice] = useState('');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [showUsers, setShowUsers] = useState(false);

  const refreshStats = () => api.adminStats().then(setStats).catch(() => setStats(null));
  useEffect(() => { refreshStats(); }, []);

  const sendNotice = async () => {
    if (!notice.trim()) return;
    try {
      await api.adminBroadcast({ message: notice.trim() });
      window.alert('공지 전송 완료');
      setNotice('');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '공지 실패');
    }
  };

  const loadUsers = async () => {
    try {
      const rows = await api.adminUsers();
      setUsers(rows);
      setShowUsers(true);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '유저 목록 실패');
    }
  };

  const banUser = async (username: string) => {
    if (!window.confirm(`정말 ${username} 계정을 차단/삭제할까요?`)) return;
    try {
      await api.adminBan({ username: nfc(username) });
      setUsers((prev) => prev.filter((u) => u.username !== username));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '차단 실패');
    }
  };

  const nuke = async () => {
    if (!window.confirm('☣️ [경고] 정말로 모든 데이터를 초기화하시겠습니까?')) return;
    if (window.prompt("확인을 위해 'CONFIRM_NUKE' 입력") !== 'CONFIRM_NUKE') return;
    try {
      await api.adminReset({ confirm: 'CONFIRM_NUKE' });
      window.alert('초기화 요청 완료');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : '초기화 실패');
    }
  };

  return (
    <ModalShell onClose={onClose} title="관리자 제어판">
      <div className="overflow-y-auto pr-1 flex-1 space-y-4">
        <div className="bg-[#0e1621] p-4 rounded-xl text-sm text-gray-300 border border-white/5">
          <Row label="가입된 유저" value={stats ? `${stats.userCount} 명` : '-'} />
          <Row label="활성 채널" value={stats ? `${stats.totalRooms} 개` : '-'} />
          <Row label="온라인" value={stats ? `${stats.onlineCount} 명` : '-'} />
          <button onClick={refreshStats} className="w-full btn-soft py-2.5 rounded-lg mt-4 font-bold text-xs">
            데이터 새로고침
          </button>
        </div>

        <div>
          <input
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
            placeholder="전체 공지 내용 입력..."
            className="input-style bg-[#0e1621] mb-3"
          />
          <button
            onClick={() => void sendNotice()}
            className="w-full bg-blue-500/20 text-blue-400 border border-blue-500/30 py-3 rounded-xl font-bold hover:bg-blue-500 hover:text-white transition"
          >
            📢 긴급 공지 발송
          </button>
        </div>

        <div>
          <button onClick={() => void loadUsers()} className="w-full btn-soft py-2.5 rounded-lg font-bold text-sm">
            👥 유저 관리
          </button>
          {showUsers && (
            <div className="mt-2 max-h-40 overflow-y-auto bg-[#0e1621] rounded-xl border border-white/5 p-2 space-y-1">
              {users.length === 0 && <div className="text-xs text-[#7f91a4] text-center py-2">유저 없음</div>}
              {users.map((u) => (
                <div key={u.username} className="flex items-center justify-between text-xs px-2 py-1.5">
                  <span className="truncate">
                    <span className="text-white font-bold">{u.nickname}</span>
                    <span className="text-[#7f91a4]"> @{u.username}</span>
                    {u.isAdmin && <span className="text-amber-400 ml-1">★</span>}
                  </span>
                  {!u.isAdmin && (
                    <button
                      onClick={() => void banUser(u.username)}
                      className="text-red-400 hover:text-red-300 px-2 shrink-0"
                    >
                      차단
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-white/10 pt-4">
          <button
            onClick={() => void nuke()}
            className="w-full bg-red-500 text-white py-3.5 rounded-xl font-bold text-base shadow-lg hover:bg-red-600 transition"
          >
            ☢️ 시스템 전체 초기화
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center mt-2 first:mt-0">
      <span className="text-[#7f91a4]">{label}:</span>
      <span className="font-bold text-white text-lg">{value}</span>
    </div>
  );
}
