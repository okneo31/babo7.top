// 타입드 Socket.IO 싱글톤. 토큰으로 연결/재연결.
// io({ auth: { token } }) — 기본 네임스페이스. 이벤트/페이로드는 shared 계약.

import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@babotalk/shared';

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

/** 토큰으로 연결(또는 기존 소켓 재사용). 토큰이 바뀌면 재연결. */
export function connectSocket(token: string): TypedSocket {
  if (socket) {
    const auth = socket.auth as { token?: string } | undefined;
    if (auth?.token === token) {
      if (!socket.connected) socket.connect();
      return socket;
    }
    // 토큰 변경 → 기존 소켓 정리 후 재생성
    socket.disconnect();
    socket = null;
  }

  socket = io({
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  }) as TypedSocket;

  return socket;
}

/** 현재 소켓 (없으면 null). */
export function getSocket(): TypedSocket | null {
  return socket;
}

/** 로그아웃 시 소켓 종료. */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
