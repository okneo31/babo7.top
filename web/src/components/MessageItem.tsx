// 메시지 한 건. 텍스트/이미지/영상/파일/음성#6, 수정·삭제, 읽음표시, 반응#4, 답장#3, 멘션#3.

import { useState } from 'react';
import type { Message } from '@babotalk/shared';
import { getAvatarColor, getInitial, formatTime } from '@/lib/avatar';
import { MentionText } from './MentionText';
import { ReactionBar, ReactionPicker } from './Reactions';
import { ReplyQuote } from './ReplyPreview';

export interface MessageItemProps {
  msg: Message;
  myNick: string;
  members: string[];
  onEdit: (msgId: string, newText: string) => void;
  onDelete: (msgId: string) => void;
  onReact: (msgId: string, emoji: string) => void;
  onReply: (msg: Message) => void;
}

export function MessageItem({ msg, myNick, members, onEdit, onDelete, onReact, onReply }: MessageItemProps) {
  const isMe = msg.user === myNick;
  const [showReactPicker, setShowReactPicker] = useState(false);

  // 읽음 안 한 멤버 수 (#읽음표시) — 삭제 메시지 제외
  let unreadCount = 0;
  let unreadNames = '';
  if (!msg.isDeleted && members.length > 0) {
    const readBy = msg.readBy || [];
    const unread = members.filter((m) => m !== msg.user && !readBy.includes(m));
    unreadCount = unread.length;
    unreadNames = unread.join(', ');
  }

  const startEdit = () => {
    const next = window.prompt('메시지 수정:', msg.text);
    if (next !== null && next.trim() !== '') onEdit(msg._id, next);
  };
  const confirmDelete = () => {
    if (window.confirm('메시지를 삭제하시겠습니까?')) onDelete(msg._id);
  };

  const timeBadge = (
    <div className={`flex flex-col ${isMe ? 'items-end mr-2' : 'items-start ml-2'} justify-end mb-1 shrink-0`}>
      {unreadCount > 0 && (
        <button
          className="text-[12px] text-sky-400 font-bold mt-0.5 hover:text-sky-300"
          title="안 읽은 사람 확인"
          onClick={() => window.alert('👀 아직 안 읽은 사람:\n\n' + unreadNames)}
        >
          {unreadCount}
        </button>
      )}
      <span className="text-[10px] text-[var(--tg-muted)] mt-0.5">{formatTime(msg.createdAt)}</span>
    </div>
  );

  const bubble = (
    <div className={`relative group msg-bubble ${isMe ? 'msg-me' : 'msg-other'}`}>
      {/* 호버 메뉴: 답장/반응/수정/삭제 */}
      <div className="msg-menu">
        <button onClick={() => onReply(msg)} className="text-xs text-gray-300 hover:text-white hover:bg-white/10 px-2 py-1 rounded">
          답장
        </button>
        <button
          onClick={() => setShowReactPicker((v) => !v)}
          className="text-xs text-gray-300 hover:text-white hover:bg-white/10 px-2 py-1 rounded"
        >
          반응
        </button>
        {isMe && !msg.isDeleted && (
          <>
            <button onClick={startEdit} className="text-xs text-gray-300 hover:text-white hover:bg-white/10 px-2 py-1 rounded">
              수정
            </button>
            <button onClick={confirmDelete} className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded">
              삭제
            </button>
          </>
        )}
      </div>

      {showReactPicker && (
        <div className="absolute -top-11 left-0 z-20">
          <ReactionPicker
            onPick={(emoji) => {
              onReact(msg._id, emoji);
              setShowReactPicker(false);
            }}
          />
        </div>
      )}

      {msg.replyTo && <ReplyQuote replyTo={msg.replyTo} />}

      <MessageBody msg={msg} myNick={myNick} />
    </div>
  );

  return (
    <div className={isMe ? 'flex justify-end' : 'flex justify-start'}>
      {!isMe && (
        <div
          className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(
            msg.user,
          )} flex items-center justify-center text-white font-bold text-[15px] mr-2.5 shrink-0 shadow-sm mt-5`}
        >
          {getInitial(msg.user)}
        </div>
      )}
      <div className="flex flex-col max-w-[80%]">
        {!isMe && <div className="text-[13px] text-sky-400 mb-1 ml-1 font-semibold">{msg.user}</div>}
        <div className="flex items-end">
          {isMe && timeBadge}
          <div className="min-w-0">
            {bubble}
            <ReactionBar reactions={msg.reactions} myNick={myNick} onToggle={(e) => onReact(msg._id, e)} />
          </div>
          {!isMe && timeBadge}
        </div>
      </div>
    </div>
  );
}

function MessageBody({ msg, myNick }: { msg: Message; myNick: string }) {
  if (msg.isDeleted) {
    return <span className="italic text-white/50 text-sm">🚫 삭제된 메시지입니다</span>;
  }

  const file = msg.file;
  const fileType = file?.type || '';

  return (
    <div>
      {msg.text && <MentionText text={msg.text} myNick={myNick} />}
      {msg.isEdited && <span className="text-[10px] text-white/50 ml-2 align-bottom">(수정됨)</span>}

      {file && fileType.startsWith('image/') && (
        <div className="file-preview mt-1">
          <img
            src={file.url}
            alt={file.name}
            onClick={() => window.open(file.url, '_blank')}
            className="cursor-pointer max-h-60 rounded-xl border border-white/10"
          />
        </div>
      )}

      {file && fileType.startsWith('video/') && (
        <div className="file-preview mt-1">
          <video src={file.url} controls className="max-h-60 rounded-xl border border-white/10" />
        </div>
      )}

      {file && (msg.type === 'voice' || fileType.startsWith('audio/')) && (
        <div className="mt-1 flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2 border border-white/5">
          <span className="text-lg">🎤</span>
          <audio src={file.url} controls className="h-8 max-w-[200px]" />
          {file.duration != null && (
            <span className="text-[11px] text-white/60">
              {Math.floor(file.duration / 60)}:{String(Math.round(file.duration % 60)).padStart(2, '0')}
            </span>
          )}
        </div>
      )}

      {file && !fileType.startsWith('image/') && !fileType.startsWith('video/') && msg.type !== 'voice' && !fileType.startsWith('audio/') && (
        <div
          className="mt-1 p-3 bg-black/20 rounded-xl border border-white/5 flex items-center gap-3 hover:bg-black/30 transition cursor-pointer"
          onClick={() => window.open(file.url, '_blank')}
        >
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-xl shrink-0">📄</div>
          <div className="flex flex-col min-w-0">
            <span className="text-sky-300 font-bold text-sm truncate max-w-[160px]">{file.name}</span>
            <span className="text-xs text-white/50 mt-0.5">다운로드</span>
          </div>
        </div>
      )}
    </div>
  );
}
