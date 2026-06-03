import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '@babotalk/shared';

// admin → 전체 브로드캐스트 전용 게이트웨이.
// @WebSocketGateway는 모든 게이트웨이가 동일한 io 서버 인스턴스를 공유하므로,
// 여기서 주입받은 server로 emit하면 chat/webrtc로 접속한 모든 소켓에 전달된다.
@Injectable()
@WebSocketGateway()
export class AdminGateway {
  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents>;

  /** 새 공지를 전체에 송출(broadcast #10). */
  emitNotice(notice: { id: string; text: string }): void {
    this.server.emit('admin_notice', { id: notice.id, text: notice.text });
  }

  /** 전체 초기화 신호(reset #10). 클라가 로컬 상태/세션을 비운다. */
  emitSystemReset(): void {
    // system_reset은 shared 이벤트 계약 밖의 운영 신호 — legacy와 동일한 이름 보존.
    (this.server as Server).emit('system_reset');
  }
}
