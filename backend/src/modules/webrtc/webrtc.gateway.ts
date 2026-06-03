// TODO(로드맵): mediasoup SFU로 그룹 영상 확장 — 현재는 mesh relay.
// 지금은 P2P mesh(N명 → N² 스트림)라 소규모 통화만 가능하다. 그룹/대규모 통화는
// 아래 MediaService 인터페이스 구현체(SfuMediaService)를 주입해 SFU 라우팅으로 전환한다.
// 시그널링 이벤트(join_call/offer/answer/ice_candidate) 계약은 유지하고,
// relay 분기 지점만 SFU producer/consumer 협상으로 교체하면 된다.

import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import type { ServerToClientEvents, ClientToServerEvents } from '@babotalk/shared';
import { verifySocket } from '../../common/guards/ws-jwt.guard';

/**
 * SFU 도입 지점(placeholder).
 * mesh relay 단계에서는 미사용. SFU 단계에서 이 인터페이스의 구현체를 게이트웨이에
 * 주입해 offer/answer/ice를 P2P relay 대신 미디어 서버 협상으로 라우팅한다.
 */
export interface MediaService {
  /** 통화 참가 시 SFU transport/producer 준비. mesh 단계에서는 no-op. */
  onJoinCall(roomId: string, socketId: string): Promise<void> | void;
  /** SDP/ICE를 SFU로 라우팅(mesh에서는 사용하지 않음). */
  routeSignal(target: string, payload: unknown): Promise<void> | void;
  /** 통화 이탈 시 SFU 자원 정리. */
  onLeaveCall(roomId: string, socketId: string): Promise<void> | void;
}

// WebRTC 시그널링 게이트웨이. chat과 동일한 io 서버를 공유한다(@WebSocketGateway).
// 방 멤버십(socket.data.roomId)은 chat 게이트웨이의 join_room에서 설정된 값을 사용한다.
@Injectable()
@WebSocketGateway()
export class WebrtcGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents>;

  // mesh 단계에서는 주입하지 않는다(undefined). SFU 단계에서 DI로 연결.
  private readonly media?: MediaService;

  constructor(private readonly jwt: JwtService) {}

  // 핸드셰이크 인증 — 토큰이 유효하면 socket.data.user에 페이로드를 부착한다.
  // chat 게이트웨이와 동일 io 서버를 공유하므로 연결 자체를 끊지는 않는다(끊으면
  // 텍스트 채팅 연결까지 죽는다). 미인증 소켓은 각 시그널링 핸들러에서 차단한다.
  handleConnection(socket: Socket): void {
    const user = verifySocket(this.jwt, socket);
    if (user) socket.data.user = user;
  }

  // 통화 참가: 같은 방(socket.data.roomId)의 다른 소켓에게 new_caller 알림.
  // legacy: socket.to(socket.roomId).emit('new_caller', socket.id)
  @SubscribeMessage('join_call')
  onJoinCall(@ConnectedSocket() socket: Socket): void {
    if (!socket.data.user) return;
    const roomId: string | undefined = socket.data.roomId;
    if (!roomId) return;
    socket.to(roomId).emit('new_caller', socket.id);
    void this.media?.onJoinCall(roomId, socket.id);
  }

  // SDP offer relay → target 소켓. legacy: io.to(p.target).emit('offer', p)
  @SubscribeMessage('offer')
  onOffer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() p: { target: string; sdp: unknown; sender: string },
  ): void {
    if (!socket.data.user || !p?.target) return;
    this.server.to(p.target).emit('offer', { sdp: p.sdp, sender: p.sender });
  }

  // SDP answer relay → target 소켓.
  @SubscribeMessage('answer')
  onAnswer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() p: { target: string; sdp: unknown; sender: string },
  ): void {
    if (!socket.data.user || !p?.target) return;
    this.server.to(p.target).emit('answer', { sdp: p.sdp, sender: p.sender });
  }

  // ICE candidate relay → target 소켓.
  @SubscribeMessage('ice_candidate')
  onIceCandidate(
    @ConnectedSocket() socket: Socket,
    @MessageBody() p: { target: string; candidate: unknown; sender: string },
  ): void {
    if (!socket.data.user || !p?.target) return;
    this.server
      .to(p.target)
      .emit('ice_candidate', { candidate: p.candidate, sender: p.sender });
  }
}
