import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { nfc, preview } from '@babotalk/shared';
import type {
  FileMeta,
  JwtPayload,
  Message as MessageDTO,
  MessageType,
  ReplyRef,
} from '@babotalk/shared';
import { Message, MessageDocument } from '../../database/schemas/message.schema';

/** createMessage 입력 — 게이트웨이가 정규화 후 전달. */
export interface CreateMessageInput {
  text?: string;
  type?: MessageType;
  file?: FileMeta | null;
  replyTo?: ReplyRef | null; // #3
  mentions?: string[]; // #3 nickname[]
  expireAt?: Date | null; // #9 사라지는 메시지
}

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  /**
   * Message 도큐먼트를 shared Message(DTO) 형태로 직렬화.
   * - reactions: Mongoose Map → 평범한 object
   * - expireAt/createdAt: Date → ISO 문자열
   */
  toDTO(doc: MessageDocument | Message): MessageDTO {
    // lean 객체/도큐먼트 모두 안전하게 다룬다.
    const anyDoc = doc as unknown as Record<string, unknown> & {
      _id?: unknown;
      reactions?: Map<string, string[]> | Record<string, string[]> | null;
      expireAt?: Date | string | null;
      createdAt?: Date | string | null;
    };

    const reactions: Record<string, string[]> = {};
    const rawReactions = anyDoc.reactions;
    if (rawReactions instanceof Map) {
      for (const [emoji, nicks] of rawReactions.entries()) {
        reactions[emoji] = Array.isArray(nicks) ? [...nicks] : [];
      }
    } else if (rawReactions && typeof rawReactions === 'object') {
      for (const [emoji, nicks] of Object.entries(rawReactions)) {
        reactions[emoji] = Array.isArray(nicks) ? [...(nicks as string[])] : [];
      }
    }

    const toIso = (v: Date | string | null | undefined): string | null => {
      if (!v) return null;
      return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
    };

    return {
      _id: String(anyDoc._id),
      roomId: (anyDoc.roomId as string) ?? '',
      user: (anyDoc.user as string) ?? '',
      text: (anyDoc.text as string) ?? '',
      type: (anyDoc.type as MessageType) ?? 'text',
      file: (anyDoc.file as FileMeta | null) ?? null,
      readBy: Array.isArray(anyDoc.readBy) ? (anyDoc.readBy as string[]) : [],
      isEdited: !!anyDoc.isEdited,
      isDeleted: !!anyDoc.isDeleted,
      replyTo: (anyDoc.replyTo as ReplyRef | null) ?? null,
      mentions: Array.isArray(anyDoc.mentions) ? (anyDoc.mentions as string[]) : [],
      reactions,
      expireAt: toIso(anyDoc.expireAt),
      createdAt: toIso(anyDoc.createdAt) ?? new Date().toISOString(),
    };
  }

  /** 신규 메시지 생성. 작성자는 readBy에 자동 포함. */
  async createMessage(
    roomId: string,
    user: string,
    input: CreateMessageInput,
  ): Promise<MessageDTO> {
    const author = nfc(user);
    const doc = await this.messageModel.create({
      roomId,
      user: author,
      text: input.text ?? '',
      type: input.type ?? 'text',
      file: input.file ?? null,
      readBy: [author],
      replyTo: input.replyTo ?? null,
      mentions: (input.mentions ?? []).map(nfc),
      expireAt: input.expireAt ?? null,
    });
    return this.toDTO(doc);
  }

  /** 메시지 수정 — 작성자 본인만. 삭제된 메시지는 수정 불가. */
  async editMessage(
    msgId: string,
    user: JwtPayload,
    newText: string,
  ): Promise<MessageDTO> {
    const msg = await this.messageModel.findById(msgId).exec();
    if (!msg) throw new NotFoundException('메시지를 찾을 수 없습니다');
    if (msg.isDeleted) throw new ForbiddenException('삭제된 메시지는 수정할 수 없습니다');
    if (msg.user !== nfc(user.nickname)) {
      throw new ForbiddenException('본인 메시지만 수정할 수 있습니다');
    }
    msg.text = newText;
    msg.isEdited = true;
    await msg.save();
    return this.toDTO(msg);
  }

  /** 소프트 삭제 — 작성자 본인만. 텍스트/파일 비우고 isDeleted 플래그. */
  async softDelete(msgId: string, user: JwtPayload): Promise<MessageDTO> {
    const msg = await this.messageModel.findById(msgId).exec();
    if (!msg) throw new NotFoundException('메시지를 찾을 수 없습니다');
    if (msg.user !== nfc(user.nickname)) {
      throw new ForbiddenException('본인 메시지만 삭제할 수 있습니다');
    }
    msg.isDeleted = true;
    msg.text = '삭제된 메시지입니다.';
    msg.file = null;
    await msg.save();
    return this.toDTO(msg);
  }

  /** 방의 모든 미읽음 메시지를 nick의 readBy에 추가. */
  async markRoomRead(roomId: string, nick: string): Promise<void> {
    const nickname = nfc(nick);
    await this.messageModel
      .updateMany(
        { roomId, readBy: { $ne: nickname } },
        { $addToSet: { readBy: nickname } },
      )
      .exec();
  }

  /** 반응 토글(#4). 같은 nick가 같은 emoji면 제거, 아니면 추가. 갱신된 Message 반환. */
  async toggleReaction(
    msgId: string,
    nick: string,
    emoji: string,
  ): Promise<MessageDTO> {
    const nickname = nfc(nick);
    const msg = await this.messageModel.findById(msgId).exec();
    if (!msg) throw new NotFoundException('메시지를 찾을 수 없습니다');

    const current = msg.reactions.get(emoji) ?? [];
    if (current.includes(nickname)) {
      const next = current.filter((n) => n !== nickname);
      if (next.length === 0) msg.reactions.delete(emoji);
      else msg.reactions.set(emoji, next);
    } else {
      msg.reactions.set(emoji, [...current, nickname]);
    }
    msg.markModified('reactions');
    await msg.save();
    return this.toDTO(msg);
  }

  /** 히스토리 — 오래된 순. */
  async getHistory(roomId: string, limit = 100): Promise<MessageDTO[]> {
    const docs = await this.messageModel
      .find({ roomId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean()
      .exec();
    return docs.map((d) => this.toDTO(d as unknown as Message));
  }

  /** 방내 검색 — 삭제되지 않은 메시지에서 keyword(대소문자 무시) 매칭, 최신순. */
  async search(roomId: string, keyword: string): Promise<MessageDTO[]> {
    const safe = (keyword || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const docs = await this.messageModel
      .find({
        roomId,
        isDeleted: false,
        text: { $regex: safe, $options: 'i' },
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
      .exec();
    return docs.map((d) => this.toDTO(d as unknown as Message));
  }

  /** 답장 인용 스냅샷 생성 헬퍼(#3) — replyTo msgId로부터 ReplyRef 구성. */
  async buildReplyRef(msgId: string): Promise<ReplyRef | null> {
    const msg = await this.messageModel.findById(msgId).lean().exec();
    if (!msg) return null;
    return {
      msgId: String((msg as unknown as { _id: unknown })._id),
      user: (msg as unknown as { user: string }).user,
      text: preview((msg as unknown as { text: string }).text ?? ''),
    };
  }
}
