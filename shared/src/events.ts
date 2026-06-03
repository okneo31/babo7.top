// Socket.IO 이벤트 계약. 게이트웨이와 프런트 소켓 클라이언트가 공유한다.

import type { Message, ReplyRef } from './models.js';

// ===== Client → Server =====
export interface ClientToServerEvents {
  join_room: (p: { roomId: string }) => void;
  leave_room: () => void;
  send_message: (p: {
    roomId: string;
    text: string;
    type?: Message['type'];
    file?: Message['file'];
    replyTo?: ReplyRef | null; // #3
    expireSeconds?: number; // #9 사라지는 메시지
  }) => void;
  edit_message: (p: { msgId: string; newText: string }) => void;
  delete_message: (p: { msgId: string }) => void;
  read_room: (p: { roomId: string }) => void;
  react_message: (p: { msgId: string; emoji: string }) => void; // #4
  typing: (p: { roomId: string; isTyping: boolean }) => void; // #5
  presence_ping: () => void; // #5 접속 알림

  // WebRTC 시그널링 (로드맵: SFU 확장)
  join_call: () => void;
  offer: (p: { target: string; sdp: unknown; sender: string }) => void;
  answer: (p: { target: string; sdp: unknown; sender: string }) => void;
  ice_candidate: (p: { target: string; candidate: unknown; sender: string }) => void;

  // 방 폭파
  nuke: () => void;
  set_timer: (p: { minutes: number }) => void;
}

// ===== Server → Client =====
export interface ServerToClientEvents {
  message: (m: Message) => void;
  message_updated: (m: Message) => void;
  room_history: (p: { msgs: Message[]; members: string[] }) => void;
  user_read: (p: { nickname: string }) => void;
  reaction_updated: (m: Message) => void; // #4
  typing: (p: { roomId: string; nickname: string; isTyping: boolean }) => void; // #5
  presence: (p: { online: string[] }) => void; // #5 (nickname[])
  set_role: (p: { isOwner: boolean; roomType: string }) => void;
  admin_notice: (p: { id: string; text: string }) => void;
  nuke_trigger: () => void;
  timer_start: (endTimeMs: number) => void;
  sys_msg: (text: string) => void;

  new_caller: (uid: string) => void;
  offer: (p: { sdp: unknown; sender: string }) => void;
  answer: (p: { sdp: unknown; sender: string }) => void;
  ice_candidate: (p: { candidate: unknown; sender: string }) => void;
}

/** JWT 페이로드 (소켓 핸드셰이크/HTTP 공용) */
export interface JwtPayload {
  sub: string; // user id
  username: string;
  nickname: string;
  isAdmin: boolean;
}
