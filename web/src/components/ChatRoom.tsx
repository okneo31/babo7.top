// 채팅방. 헤더 + 메시지 리스트 + 입력창. 소켓 이벤트 전부 배선.
// #3 답장/멘션, #4 반응, #5 타이핑/읽음, #6 음성, #9 사라지는 메시지, WebRTC 통화, 방 폭파.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { extractMentions, preview } from '@babotalk/shared';
import type { Message, FileMeta, ReplyRef } from '@babotalk/shared';
import { getSocket } from '@/socket/socket';
import { useAuth } from '@/store/auth';
import { useUi } from '@/store/ui';
import { uploadFile } from '@/api/files';
import { showLocalNotification } from '@/features/push';
import { MessageItem } from './MessageItem';
import { TypingIndicator } from './TypingIndicator';
import { ReplyComposer } from './ReplyPreview';
import { VoiceRecorder } from './VoiceRecorder';
import { DisappearingPicker } from './DisappearingPicker';
import { CallView } from './CallView';
import { SearchModal } from './SearchModal';

export function ChatRoom() {
  const room = useUi((s) => s.currentRoom);
  const setCurrentRoom = useUi((s) => s.setCurrentRoom);
  const closeMobileChat = useUi((s) => s.closeMobileChat);
  const replyTarget = useUi((s) => s.replyTarget);
  const setReplyTarget = useUi((s) => s.setReplyTarget);
  const expireSeconds = useUi((s) => s.expireSeconds);
  const setExpireSeconds = useUi((s) => s.setExpireSeconds);
  const user = useAuth((s) => s.user);
  const myNick = user?.nickname || '';
  const isAdmin = !!user?.isAdmin;

  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<string[]>([]);
  const [online, setOnline] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [roomType, setRoomType] = useState<string>(room?.type || 'public');
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [countdownEnd, setCountdownEnd] = useState<number | null>(null);
  const [countdownLabel, setCountdownLabel] = useState('');

  const listRef = useRef<HTMLDivElement | null>(null);
  const typingSentRef = useRef(false);
  const typingTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const roomId = room?.roomId || null;

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  // ---- 방 진입/이탈 + 소켓 이벤트 구독 ----
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !roomId) return;

    setMessages([]);
    setMembers([]);
    setTypingUsers([]);
    setInCall(false);
    setCountdownEnd(null);
    setIsOwner(false);

    socket.emit('join_room', { roomId });

    const onHistory = (p: { msgs: Message[]; members: string[] }) => {
      setMessages(p.msgs);
      setMembers(p.members || []);
      scrollToBottom();
      socket.emit('read_room', { roomId });
    };
    const onMessage = (m: Message) => {
      if (m.roomId !== roomId) {
        if (m.user !== myNick) showLocalNotification('새 메시지', `${m.user}: ${m.text || '첨부 파일'}`);
        return;
      }
      setMessages((prev) => (prev.some((x) => x._id === m._id) ? prev : [...prev, m]));
      scrollToBottom();
      if (m.user !== myNick) socket.emit('read_room', { roomId });
    };
    const onUpdated = (m: Message) => {
      if (m.roomId !== roomId) return;
      setMessages((prev) => prev.map((x) => (x._id === m._id ? m : x)));
    };
    const onReaction = (m: Message) => {
      if (m.roomId !== roomId) return;
      setMessages((prev) => prev.map((x) => (x._id === m._id ? m : x)));
    };
    const onUserRead = (p: { nickname: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          (m.readBy || []).includes(p.nickname) ? m : { ...m, readBy: [...(m.readBy || []), p.nickname] },
        ),
      );
    };
    const onTyping = (p: { roomId: string; nickname: string; isTyping: boolean }) => {
      if (p.roomId !== roomId || p.nickname === myNick) return;
      setTypingUsers((prev) => {
        const without = prev.filter((n) => n !== p.nickname);
        return p.isTyping ? [...without, p.nickname] : without;
      });
    };
    const onPresence = (p: { online: string[] }) => setOnline(p.online);
    const onRole = (p: { isOwner: boolean; roomType: string }) => {
      setIsOwner(p.isOwner);
      setRoomType(p.roomType);
    };
    const onSys = (t: string) => {
      const sys: Message = {
        _id: `sys-${Date.now()}-${Math.random()}`,
        roomId,
        user: '',
        text: t,
        type: 'text',
        readBy: [],
        isEdited: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, sys]);
      scrollToBottom();
    };
    const onNuke = () => {
      window.alert('💥 대화방이 폭파되었습니다.');
      setMessages([]);
      setCountdownEnd(null);
      // 방이 삭제됐으므로 채팅창을 닫는다(목록은 RoomList가 nuke_trigger로 갱신).
      closeMobileChat();
      setCurrentRoom(null);
    };
    const onTimer = (endTimeMs: number) => setCountdownEnd(endTimeMs);

    socket.on('room_history', onHistory);
    socket.on('message', onMessage);
    socket.on('message_updated', onUpdated);
    socket.on('reaction_updated', onReaction);
    socket.on('user_read', onUserRead);
    socket.on('typing', onTyping);
    socket.on('presence', onPresence);
    socket.on('set_role', onRole);
    socket.on('sys_msg', onSys);
    socket.on('nuke_trigger', onNuke);
    socket.on('timer_start', onTimer);

    return () => {
      socket.emit('leave_room');
      socket.off('room_history', onHistory);
      socket.off('message', onMessage);
      socket.off('message_updated', onUpdated);
      socket.off('reaction_updated', onReaction);
      socket.off('user_read', onUserRead);
      socket.off('typing', onTyping);
      socket.off('presence', onPresence);
      socket.off('set_role', onRole);
      socket.off('sys_msg', onSys);
      socket.off('nuke_trigger', onNuke);
      socket.off('timer_start', onTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, myNick]);

  // 탭 복귀 시 읽음 처리
  useEffect(() => {
    const onVis = () => {
      if (!document.hidden && roomId) getSocket()?.emit('read_room', { roomId });
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [roomId]);

  // 폭파 카운트다운 표시
  useEffect(() => {
    if (countdownEnd == null) {
      setCountdownLabel('');
      return;
    }
    const tick = () => {
      const d = countdownEnd - Date.now();
      if (d <= 0) {
        setCountdownLabel('폭파 중…');
        return;
      }
      const m = Math.floor(d / 60000);
      const s = Math.floor((d % 60000) / 1000);
      setCountdownLabel(`폭파까지 ${m}분 ${s}초`);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [countdownEnd]);

  // ---- 전송 ----
  const canWrite = roomType !== 'channel' || isOwner || isAdmin;

  const send = useCallback(
    (overrideText?: string, file?: FileMeta, type?: Message['type']) => {
      const socket = getSocket();
      const body = overrideText !== undefined ? overrideText : text;
      if (!socket || !roomId) return;
      if (!file && !body.trim()) return;

      const reply: ReplyRef | null = replyTarget;
      // 멘션은 text에 그대로 담겨 전송되고, 서버가 extractMentions로 재추출/알림 처리한다(#3).
      void (body ? extractMentions(body) : []);

      socket.emit('send_message', {
        roomId,
        text: body,
        type: type || (file ? guessType(file) : 'text'),
        file: file || undefined,
        replyTo: reply,
        expireSeconds: expireSeconds > 0 ? expireSeconds : undefined,
      });

      if (overrideText === undefined) {
        setText('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      }
      setReplyTarget(null);
      stopTyping();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, roomId, replyTarget, expireSeconds],
  );

  const stopTyping = () => {
    if (typingSentRef.current && roomId) {
      getSocket()?.emit('typing', { roomId, isTyping: false });
      typingSentRef.current = false;
    }
    if (typingTimerRef.current != null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  };

  const onType = (value: string) => {
    setText(value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 96) + 'px';
    }
    if (!roomId) return;
    if (!typingSentRef.current) {
      getSocket()?.emit('typing', { roomId, isTyping: true });
      typingSentRef.current = true;
    }
    if (typingTimerRef.current != null) window.clearTimeout(typingTimerRef.current);
    typingTimerRef.current = window.setTimeout(stopTyping, 2500);
  };

  // ---- 파일 첨부 ----
  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !roomId) return;
    if (f.size > 200 * 1024 * 1024) {
      window.alert('🚨 200MB 이하의 파일만 전송할 수 있습니다.');
      return;
    }
    setUploading(true);
    try {
      const meta = await uploadFile(f, f.name);
      send('', meta, guessType(meta));
    } catch (err) {
      window.alert('🚨 파일 전송 실패\n\n' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    } finally {
      setUploading(false);
    }
  };

  // ---- 메시지 액션 ----
  const onEdit = (msgId: string, newText: string) => getSocket()?.emit('edit_message', { msgId, newText });
  const onDelete = (msgId: string) => getSocket()?.emit('delete_message', { msgId });
  const onReact = (msgId: string, emoji: string) => getSocket()?.emit('react_message', { msgId, emoji });
  const onReply = (m: Message) =>
    setReplyTarget({ msgId: m._id, user: m.user, text: preview(m.text || (m.file ? '첨부 파일' : ''), 60) });

  // ---- 방 폭파(관리자/방장) ----
  const [nukeMin, setNukeMin] = useState(0);
  const executeNuke = () => {
    const socket = getSocket();
    if (!socket) return;
    if (nukeMin === 0) {
      if (window.confirm('💥 이 방의 모든 기록을 즉시 폭파할까요?')) socket.emit('nuke');
    } else {
      if (window.confirm(`⏱ ${nukeMin}분 뒤 폭파를 예약할까요?`)) socket.emit('set_timer', { minutes: nukeMin });
    }
  };

  const headerTitle = useMemo(() => {
    if (!room) return '대화방 선택';
    if (room.type === 'dm' || room.roomId.startsWith('DM_')) {
      return room.members.find((m) => m !== myNick) || room.name;
    }
    return room.name;
  }, [room, myNick]);

  if (!room) {
    return (
      <div className="hidden md:flex flex-1 items-center justify-center bg-[var(--tg-bg)] text-[#7f91a4]">
        <div className="text-center">
          <div className="text-5xl mb-3">💬</div>
          <p>대화방을 선택하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 bg-[var(--tg-bg)] relative w-full min-w-0">
      {showSearch && <SearchModal roomId={room.roomId} onClose={() => setShowSearch(false)} />}
      {inCall && <CallView socket={getSocket()!} onEnd={() => setInCall(false)} />}

      {/* 헤더 */}
      <div className="glass-panel px-3 py-2 flex justify-between items-center z-10 sticky top-0 w-full shrink-0">
        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 pr-2">
          <button onClick={closeMobileChat} className="md:hidden text-[#7f91a4] hover:text-white text-2xl px-1 shrink-0">
            ◀
          </button>
          <div className="flex flex-col truncate min-w-0">
            <span className="font-bold text-white text-lg truncate flex items-center gap-2">
              {headerTitle}
            </span>
            <span className="text-[11px] text-[var(--tg-primary)] font-mono truncate">
              {room.roomId.startsWith('DM_') ? '🔒 1:1 대화' : `코드: ${room.roomId}`}
              {online.length > 0 && <span className="text-emerald-400 ml-2">● {online.length} 온라인</span>}
            </span>
          </div>
        </div>
        <div className="flex gap-1.5 items-center shrink-0">
          <button
            onClick={() => setShowSearch(true)}
            className="btn-soft px-2.5 py-1.5 rounded-lg text-[15px]"
            title="검색"
          >
            🔍
          </button>
          <button
            onClick={() => setInCall((v) => !v)}
            className="bg-sky-500/10 text-sky-400 hover:bg-sky-500 hover:text-white transition px-2.5 py-1.5 rounded-lg text-[15px]"
            title="화상통화"
          >
            📞
          </button>
          {(isOwner || isAdmin) && (
            <div className="flex gap-1 items-center ml-1 pl-2 border-l border-white/10">
              <select
                value={nukeMin}
                onChange={(e) => setNukeMin(Number(e.target.value))}
                className="bg-[#242f3d] text-[11px] text-white px-1.5 py-2 rounded-lg outline-none font-bold cursor-pointer"
              >
                <option value={0}>즉시</option>
                <option value={1}>1분</option>
                <option value={60}>1시간</option>
                <option value={1440}>24시간</option>
              </select>
              <button onClick={executeNuke} className="btn-danger-soft px-2.5 py-1.5 rounded-lg text-[15px]" title="폭파">
                💣
              </button>
            </div>
          )}
        </div>
      </div>

      {countdownEnd != null && (
        <div className="bg-red-500/90 backdrop-blur-md text-white text-sm text-center py-1.5 font-bold animate-pulse z-10 shrink-0">
          ⏳ {countdownLabel}
        </div>
      )}

      {/* 메시지 리스트 */}
      <div ref={listRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 w-full min-w-0">
        {messages.map((m) =>
          m.user === '' ? (
            <div key={m._id} className="flex justify-center my-2">
              <span className="bg-[#17212b] text-[#7f91a4] text-[11px] font-semibold py-1 px-3 rounded-full border border-white/5">
                {m.text}
              </span>
            </div>
          ) : (
            <MessageItem
              key={m._id}
              msg={m}
              myNick={myNick}
              members={members}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={onReact}
              onReply={onReply}
            />
          ),
        )}
      </div>

      <TypingIndicator names={typingUsers} />

      {/* 읽기전용 배너 (채널, 비방장) */}
      {!canWrite && (
        <div className="px-4 py-4 bg-[var(--tg-sidebar)] text-center text-[#7f91a4] font-bold text-[15px] z-10 w-full shrink-0 border-t border-white/5">
          📢 채널 관리자만 메시지를 보낼 수 있습니다.
        </div>
      )}

      {/* 답장 컴포저 */}
      {canWrite && replyTarget && <ReplyComposer target={replyTarget} onCancel={() => setReplyTarget(null)} />}

      {/* 입력창 */}
      {canWrite && (
        <div className="px-3 pt-2 pb-3 bg-[var(--tg-sidebar)] flex gap-2 items-end z-10 w-full shrink-0 border-t border-white/5">
          <label
            className="cursor-pointer text-[#7f91a4] hover:text-sky-400 p-2.5 rounded-full transition shrink-0"
            title="파일 첨부"
          >
            {uploading ? <span className="text-sky-400 text-xs animate-pulse">…</span> : '📎'}
            <input ref={fileInputRef} type="file" className="hidden" onChange={onPickFile} disabled={uploading} />
          </label>

          <VoiceRecorder onSend={(file) => send('', file, 'voice')} />

          <DisappearingPicker value={expireSeconds} onChange={setExpireSeconds} />

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex-1 flex gap-2 items-end bg-[var(--tg-input)] rounded-3xl pr-1.5 border border-transparent focus-within:border-sky-500/50 transition-all w-full min-w-0"
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="메시지 입력..."
              className="bg-transparent w-full text-[15px] text-white py-3 pl-4 pr-1 outline-none resize-none max-h-24 min-w-0"
            />
            <button
              type="submit"
              className="bg-sky-500 hover:bg-sky-400 text-white rounded-full w-9 h-9 mb-1.5 shrink-0 flex items-center justify-center transition shadow-md"
              title="전송"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function guessType(file: FileMeta): Message['type'] {
  const t = file.type || '';
  if (t.startsWith('image/')) return 'image';
  if (t.startsWith('video/')) return 'video';
  if (t.startsWith('audio/')) return 'voice';
  return 'file';
}
