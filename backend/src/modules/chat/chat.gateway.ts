import { Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { RedisClientType } from 'redis';
import {
  extractMentions,
  nfc,
  preview,
} from '@babotalk/shared';
import type {
  ClientToServerEvents,
  JwtPayload,
  Message as MessageDTO,
  ReplyRef,
  ServerToClientEvents,
} from '@babotalk/shared';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { verifySocket } from '../../common/guards/ws-jwt.guard';
import { REDIS } from '../../common/redis.module';
import { MessagesService } from '../messages/messages.service';
import { PushService } from '../push/push.service';
import { Room, RoomDocument } from '../../database/schemas/room.schema';
import { Message, MessageDocument } from '../../database/schemas/message.schema';

const ADMIN_NICK = '관리자';
const PRESENCE_KEY = 'presence';
const PRESENCE_TTL_SEC = 120; // presence set 만료(좀비 정리)

type AppServer = Server<ClientToServerEvents, ServerToClientEvents>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: AppServer;

  constructor(
    private readonly jwt: JwtService,
    private readonly messages: MessagesService,
    private readonly push: PushService,
    @Inject(REDIS) private readonly redis: RedisClientType,
    @InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  // ===== 연결 / 인증 =====
  async handleConnection(socket: AppSocket): Promise<void> {
    const payload = verifySocket(this.jwt, socket);
    if (!payload) {
      socket.disconnect(true);
      return;
    }
    socket.data.user = payload;
  }

  async handleDisconnect(socket: AppSocket): Promise<void> {
    const user = socket.data.user as JwtPayload | undefined;
    if (user?.nickname) {
      try {
        await this.redis.sRem(PRESENCE_KEY, nfc(user.nickname));
        await this.broadcastPresence();
      } catch {
        /* redis 장애는 무시 */
      }
    }
  }

  // ===== 헬퍼 =====
  private user(socket: AppSocket): JwtPayload {
    return socket.data.user as JwtPayload;
  }

  private async broadcastPresence(): Promise<void> {
    const online = await this.redis.sMembers(PRESENCE_KEY);
    this.server.emit('presence', { online });
  }

  /** 방 멤버 중 현재 소켓에 접속하지 않은 닉네임 목록(오프라인 푸시 대상). */
  private async offlineMembers(
    roomId: string,
    members: string[],
    excludeNick: string,
  ): Promise<string[]> {
    const sockets = await this.server.in(roomId).fetchSockets();
    const onlineInRoom = new Set<string>();
    for (const s of sockets) {
      const u = (s.data as { user?: JwtPayload }).user;
      if (u?.nickname) onlineInRoom.add(nfc(u.nickname));
    }
    return members
      .map(nfc)
      .filter((m) => m !== nfc(excludeNick) && !onlineInRoom.has(m));
  }

  // ===== join_room =====
  @SubscribeMessage('join_room')
  async onJoinRoom(socket: AppSocket, p: { roomId: string }): Promise<void> {
    const { roomId } = p;
    const nick = nfc(this.user(socket).nickname);
    socket.join(roomId);
    socket.data.roomId = roomId;

    const room = await this.roomModel.findOne({ roomId }).exec();
    const isOwner =
      (!!room && room.owner === nick) || nick === ADMIN_NICK;
    socket.emit('set_role', {
      isOwner,
      roomType: room ? room.type : 'public',
    });

    if (room && !room.members.includes(nick)) {
      room.members.push(nick);
      await room.save();
    }

    await this.messages.markRoomRead(roomId, nick);

    const msgs = await this.messages.getHistory(roomId, 100);
    socket.emit('room_history', {
      msgs,
      members: room ? room.members : [],
    });

    socket.to(roomId).emit('user_read', { nickname: nick });
  }

  // ===== leave_room =====
  @SubscribeMessage('leave_room')
  onLeaveRoom(socket: AppSocket): void {
    const roomId = socket.data.roomId as string | undefined;
    if (roomId) {
      socket.leave(roomId);
      socket.data.roomId = undefined;
    }
  }

  // ===== send_message =====
  @SubscribeMessage('send_message')
  async onSendMessage(
    socket: AppSocket,
    p: {
      roomId: string;
      text: string;
      type?: MessageDTO['type'];
      file?: MessageDTO['file'];
      replyTo?: ReplyRef | null;
      expireSeconds?: number;
    },
  ): Promise<void> {
    const user = this.user(socket);
    const nick = nfc(user.nickname);
    const roomId = p.roomId || (socket.data.roomId as string);
    if (!roomId) return;

    const room = await this.roomModel.findOne({ roomId }).exec();

    // channel: owner/admin만 발신 허용
    if (room && room.type === 'channel') {
      if (room.owner !== nick && nick !== ADMIN_NICK) return;
    }

    const text = p.text ?? '';
    const mentions = extractMentions(text); // #3
    const expireAt =
      p.expireSeconds && p.expireSeconds > 0
        ? new Date(Date.now() + p.expireSeconds * 1000)
        : null; // #9

    const dto = await this.messages.createMessage(roomId, nick, {
      text,
      type: p.type,
      file: p.file ?? null,
      replyTo: p.replyTo ?? null,
      mentions,
      expireAt,
    });

    this.server.to(roomId).emit('message', dto);

    // #1 오프라인 멤버 + #3 멘션 대상 푸시
    await this.notifyPush(roomId, room?.members ?? [], nick, dto, mentions);
  }

  private async notifyPush(
    roomId: string,
    members: string[],
    senderNick: string,
    dto: MessageDTO,
    mentions: string[],
  ): Promise<void> {
    try {
      const offline = await this.offlineMembers(roomId, members, senderNick);
      const mentionSet = new Set(mentions.map(nfc));
      const targets = new Set<string>(offline);
      // 멘션 대상은 온라인이어도 알림(#3)
      for (const m of mentionSet) {
        if (m !== senderNick) targets.add(m);
      }

      const body = dto.isDeleted
        ? '메시지'
        : preview(dto.text || (dto.file ? '📁 첨부파일' : '메시지'), 80);

      await Promise.all(
        [...targets].map((nickname) =>
          this.push.sendToNickname(nickname, {
            title: senderNick,
            body,
            url: `/room/${roomId}`,
          }),
        ),
      );
    } catch {
      /* 푸시 실패는 메시지 전송을 막지 않는다 */
    }
  }

  // ===== edit_message =====
  @SubscribeMessage('edit_message')
  async onEditMessage(
    socket: AppSocket,
    p: { msgId: string; newText: string },
  ): Promise<void> {
    const user = this.user(socket);
    try {
      const dto = await this.messages.editMessage(p.msgId, user, p.newText);
      this.server.to(dto.roomId).emit('message_updated', dto);
    } catch {
      /* 권한 없음/없는 메시지 — 무시 */
    }
  }

  // ===== delete_message =====
  @SubscribeMessage('delete_message')
  async onDeleteMessage(
    socket: AppSocket,
    p: { msgId: string },
  ): Promise<void> {
    const user = this.user(socket);
    try {
      const dto = await this.messages.softDelete(p.msgId, user);
      this.server.to(dto.roomId).emit('message_updated', dto);
    } catch {
      /* 권한 없음/없는 메시지 — 무시 */
    }
  }

  // ===== read_room =====
  @SubscribeMessage('read_room')
  async onReadRoom(
    socket: AppSocket,
    p: { roomId: string },
  ): Promise<void> {
    const nick = nfc(this.user(socket).nickname);
    const roomId = p.roomId || (socket.data.roomId as string);
    if (!roomId) return;
    await this.messages.markRoomRead(roomId, nick);
    socket.to(roomId).emit('user_read', { nickname: nick });
  }

  // ===== react_message (#4) =====
  @SubscribeMessage('react_message')
  async onReactMessage(
    socket: AppSocket,
    p: { msgId: string; emoji: string },
  ): Promise<void> {
    const nick = nfc(this.user(socket).nickname);
    try {
      const dto = await this.messages.toggleReaction(p.msgId, nick, p.emoji);
      this.server.to(dto.roomId).emit('reaction_updated', dto);
    } catch {
      /* 없는 메시지 — 무시 */
    }
  }

  // ===== typing (#5) =====
  @SubscribeMessage('typing')
  onTyping(
    socket: AppSocket,
    p: { roomId: string; isTyping: boolean },
  ): void {
    const nickname = nfc(this.user(socket).nickname);
    const roomId = p.roomId || (socket.data.roomId as string);
    if (!roomId) return;
    socket.to(roomId).emit('typing', {
      roomId,
      nickname,
      isTyping: p.isTyping,
    });
  }

  // ===== presence_ping (#5) =====
  @SubscribeMessage('presence_ping')
  async onPresencePing(socket: AppSocket): Promise<void> {
    const nick = nfc(this.user(socket).nickname);
    try {
      await this.redis.sAdd(PRESENCE_KEY, nick);
      await this.redis.expire(PRESENCE_KEY, PRESENCE_TTL_SEC);
      await this.broadcastPresence();
    } catch {
      /* redis 장애는 무시 */
    }
  }

  // ===== nuke =====
  @SubscribeMessage('nuke')
  async onNuke(socket: AppSocket): Promise<void> {
    const roomId = socket.data.roomId as string | undefined;
    if (!roomId) return;
    // 소유자/관리자만 폭파
    const nick = nfc(this.user(socket).nickname);
    const room = await this.roomModel.findOne({ roomId }).exec();
    if (room && room.owner !== nick && nick !== ADMIN_NICK) return;

    await this.destroyRoomAndFiles(roomId);
    this.server.to(roomId).emit('nuke_trigger');
    this.server.in(roomId).socketsLeave(roomId);
  }

  // ===== set_timer =====
  @SubscribeMessage('set_timer')
  async onSetTimer(
    socket: AppSocket,
    p: { minutes: number },
  ): Promise<void> {
    const roomId = socket.data.roomId as string | undefined;
    if (!roomId) return;
    const nick = nfc(this.user(socket).nickname);
    const room = await this.roomModel.findOne({ roomId }).exec();
    if (room && room.owner !== nick && nick !== ADMIN_NICK) return;

    const ms = Math.max(0, (p.minutes || 0) * 60 * 1000);
    this.server.to(roomId).emit('timer_start', Date.now() + ms);
    setTimeout(async () => {
      const still = await this.roomModel.findOne({ roomId }).exec();
      if (still) {
        await this.destroyRoomAndFiles(roomId);
        this.server.to(roomId).emit('nuke_trigger');
        this.server.in(roomId).socketsLeave(roomId);
      }
    }, ms);
  }

  /** legacy destroyRoomAndFiles 보존: 방 메시지+첨부파일+방 자체 삭제. */
  private async destroyRoomAndFiles(roomId: string): Promise<void> {
    // 파일 삭제는 files 모듈 책임(토큰 게이트 #8)이라 여기선 DB 레코드 정리.
    // 메시지·방 도큐먼트를 제거하면 첨부 메타도 함께 사라진다.
    await this.messageModel.deleteMany({ roomId }).exec();
    await this.roomModel.deleteOne({ roomId }).exec();
  }
}
