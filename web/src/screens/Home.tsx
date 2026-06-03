// 홈. 사이드바(프로필 헤더 + 방/친구 탭 + 액션) + 채팅영역.
// 전역 소켓 이벤트(공지#10, presence#5) + 푸시 구독#1 배선.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { useUi } from '@/store/ui';
import { api } from '@/api/client';
import { getSocket } from '@/socket/socket';
import { ensurePushSubscription } from '@/features/push';
import { getAvatarColor, getInitial } from '@/lib/avatar';
import { RoomList } from '@/components/RoomList';
import { FriendList } from '@/components/FriendList';
import { ChatRoom } from '@/components/ChatRoom';
import { CreateRoomModal, JoinSecretModal } from '@/components/CreateRoomModal';
import { ProfileModal } from '@/components/ProfileModal';
import { AdminPanel } from '@/components/AdminPanel';

const LS_READ_NOTICE = 'bt_read_notice_id';

export function Home() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const tab = useUi((s) => s.tab);
  const setTab = useUi((s) => s.setTab);
  const mobileChatOpen = useUi((s) => s.mobileChatOpen);

  const [roomsReloadKey, setRoomsReloadKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [notice, setNotice] = useState<{ id: string; text: string } | null>(null);

  const reloadRooms = () => setRoomsReloadKey((k) => k + 1);

  // 전역 소켓 이벤트 + presence ping + 푸시
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNotice = (p: { id: string; text: string }) => {
      if (!p?.id) return;
      if (localStorage.getItem(LS_READ_NOTICE) === p.id) return;
      setNotice(p);
    };
    socket.on('admin_notice', onNotice);

    socket.emit('presence_ping');
    const pingId = window.setInterval(() => socket.emit('presence_ping'), 30000);

    void ensurePushSubscription();

    return () => {
      socket.off('admin_notice', onNotice);
      window.clearInterval(pingId);
    };
  }, []);

  const dismissNotice = () => {
    if (notice) localStorage.setItem(LS_READ_NOTICE, notice.id);
    setNotice(null);
  };

  const doLogout = () => {
    if (window.confirm('정말로 로그아웃 하시겠습니까?')) {
      logout();
      navigate('/login', { replace: true });
    }
  };

  const generateInvite = async () => {
    try {
      const res = await api.invite();
      const msg = `[바보톡 가입 초대장]\n\n초대코드: ${res.code}\n접속주소: https://babo7.top\n\n*24시간 내에 가입하세요.`;
      if (navigator.share) await navigator.share({ title: '바보톡 초대', text: msg });
      else {
        await navigator.clipboard.writeText(msg);
        window.alert(`초대장이 복사되었습니다!\n\n코드: ${res.code}`);
      }
    } catch (e) {
      window.alert('초대장 생성 실패: ' + (e instanceof Error ? e.message : ''));
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden">
      {/* 사이드바 */}
      <div
        className={`${
          mobileChatOpen ? 'hidden' : 'flex'
        } md:flex w-full md:w-80 bg-[var(--tg-sidebar)] flex-col border-r border-white/5 z-20`}
      >
        {/* 프로필 헤더 */}
        <div className="p-4 border-b border-white/5 flex justify-between items-center">
          <button onClick={() => setShowProfile(true)} className="flex items-center gap-3 text-left">
            <div
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(
                user.nickname,
              )} flex items-center justify-center text-white font-bold text-lg overflow-hidden`}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                getInitial(user.nickname)
              )}
            </div>
            <div>
              <h2 className="font-bold text-white text-base leading-tight">{user.nickname}</h2>
              <div className="text-[11px] text-[var(--tg-muted)]">@{user.username}</div>
            </div>
          </button>
          <div className="flex gap-1.5">
            {user.isAdmin && (
              <button
                onClick={() => setShowAdmin(true)}
                className="bg-red-500/20 text-red-400 border border-red-500/30 p-2 rounded-xl text-sm font-bold shrink-0"
                title="관리자"
              >
                ⚙
              </button>
            )}
            <button onClick={() => void generateInvite()} className="btn-soft p-2 rounded-xl text-lg shrink-0" title="초대장">
              📩
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-soft p-2 rounded-xl text-lg shrink-0" title="방 만들기">
              ➕
            </button>
            <button
              onClick={() => setShowJoin(true)}
              className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 p-2 rounded-xl text-lg shrink-0"
              title="비밀방 입장"
            >
              🔒
            </button>
            <button onClick={doLogout} className="btn-danger-soft p-2 rounded-xl text-lg shrink-0" title="로그아웃">
              🚪
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex text-sm text-[#7f91a4] border-b border-white/5 shrink-0">
          <button
            onClick={() => setTab('rooms')}
            className={`flex-1 py-3 font-bold border-b-2 transition ${
              tab === 'rooms' ? 'text-sky-400 border-sky-400' : 'border-transparent hover:text-white'
            }`}
          >
            💬 대화방
          </button>
          <button
            onClick={() => setTab('friends')}
            className={`flex-1 py-3 font-bold border-b-2 transition ${
              tab === 'friends' ? 'text-sky-400 border-sky-400' : 'border-transparent hover:text-white'
            }`}
          >
            👥 친구 목록
          </button>
        </div>

        {tab === 'rooms' ? <RoomList reloadKey={roomsReloadKey} /> : <FriendList onRoomsChanged={reloadRooms} />}
      </div>

      {/* 채팅영역 */}
      <div className={`${mobileChatOpen ? 'flex' : 'hidden'} md:flex flex-col flex-1 min-w-0`}>
        <ChatRoom />
      </div>

      {/* 모달 */}
      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} onCreated={reloadRooms} />}
      {showJoin && <JoinSecretModal onClose={() => setShowJoin(false)} onJoined={reloadRooms} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}

      {/* 전체 공지 모달 #10 */}
      {notice && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#17212b] border border-sky-500/50 w-full max-w-sm p-6 rounded-2xl relative shadow-2xl">
            <div className="flex justify-center -mt-12 mb-4">
              <div className="w-16 h-16 bg-sky-500 rounded-full flex items-center justify-center ring-4 ring-[#17212b]">
                <span className="text-3xl text-white">📢</span>
              </div>
            </div>
            <h3 className="font-bold text-xl mb-4 text-white text-center">전체 공지사항</h3>
            <div className="text-gray-300 text-[15px] whitespace-pre-wrap mb-6 bg-[#0e1621] p-4 rounded-xl border border-white/5 max-h-[40vh] overflow-y-auto leading-relaxed">
              {notice.text}
            </div>
            <button onClick={dismissNotice} className="btn-primary bg-sky-500 text-white w-full py-3">
              확인했습니다
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
