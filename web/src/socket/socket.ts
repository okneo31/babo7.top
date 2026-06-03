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

  // PM2 cluster(다중 워커)에서는 polling이 sticky session을 요구하므로 websocket 우선.
  // Redis 어댑터가 워커 간 브로드캐스트를 처리하고, websocket은 단일 연결이라 워커에 고정된다.
  socket = io({
    auth: { token },
    transports: ['websocket'],
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
