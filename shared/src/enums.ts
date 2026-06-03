// 도메인 열거형 — 백엔드/프런트 공용

export const RoomType = {
  PUBLIC: 'public',
  SECRET: 'secret',
  CHANNEL: 'channel',
  DM: 'dm',
} as const;
export type RoomType = (typeof RoomType)[keyof typeof RoomType];

export const MessageType = {
  TEXT: 'text',
  IMAGE: 'image',
  VIDEO: 'video',
  FILE: 'file',
  VOICE: 'voice', // #6 음성 메시지
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];
