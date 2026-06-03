// 도메인 모델 — API 응답/소켓 페이로드의 공용 형태.
// MongoDB 영속 스키마(backend/src/database/schemas)는 이 형태와 정합해야 한다.

import type { MessageType, RoomType } from './enums.js';

/** 웹푸시 구독 (#1) */
export interface PushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** 첨부 파일 (#6 voice는 duration 포함) */
export interface FileMeta {
  /** 토큰 게이트 URL: /api/files/:id?token=... (#8) */
  url: string;
  name: string;
  type: string; // MIME
  size: number;
  duration?: number; // 음성/영상 길이(초) #6
}

/** 답장 인용 스냅샷 (#3) */
export interface ReplyRef {
  msgId: string;
  user: string; // nickname
  text: string; // 미리보기(잘린 원문)
}

/** 공개 유저(민감정보 제외) */
export interface PublicUser {
  username: string; // 로그인 ID
  nickname: string; // 표시명
  avatarUrl?: string; // #7
  statusMessage?: string; // #7
  isAdmin?: boolean;
}

export interface Message {
  _id: string;
  roomId: string;
  user: string; // nickname
  text: string;
  type: MessageType;
  file?: FileMeta | null;
  readBy: string[]; // nickname[]
  isEdited: boolean;
  isDeleted: boolean;
  replyTo?: ReplyRef | null; // #3
  mentions?: string[]; // nickname[] #3
  reactions?: Record<string, string[]>; // emoji -> nickname[] #4
  expireAt?: string | null; // ISO, 사라지는 메시지 #9
  createdAt: string; // ISO
}

export interface Room {
  roomId: string;
  name: string;
  type: RoomType;
  owner: string; // nickname
  members: string[]; // nickname[]
  createdAt: string;
  // 목록 표시용 파생 필드(서버 계산)
  unread?: number;
  lastMsgText?: string;
  lastMsgTime?: string;
}

export interface Friend {
  username: string;
  nickname: string;
  avatarUrl?: string;
  statusMessage?: string;
  online?: boolean; // #5 presence
}

export interface Notice {
  id: string;
  text: string;
  createdAt: string;
}
