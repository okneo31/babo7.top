import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { nfc, RoomType } from '@babotalk/shared';
import type {
  ApiResult,
  CreateRoomDto,
  CreateRoomResult,
  JoinRoomResult,
  Room as RoomDto,
  RoomsResult,
} from '@babotalk/shared';
import { Room, RoomDocument } from '../../database/schemas/room.schema';
import {
  Message,
  MessageDocument,
} from '../../database/schemas/message.schema';

@Injectable()
export class RoomsService {
  constructor(
    @InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  /** 방 목록 (legacy /api/rooms 동작 보존: unread/lastMsg 파생 + 최신순 정렬) */
  async list(nicknameRaw: string): Promise<RoomsResult> {
    const nickname = nfc(nicknameRaw);
    const rooms = await this.roomModel
      .find({
        $or: [
          { type: RoomType.PUBLIC },
          { type: RoomType.CHANNEL },
          { members: nickname },
        ],
      })
      .lean();

    const result: RoomDto[] = [];
    for (const r of rooms) {
      const unread = await this.messageModel.countDocuments({
        roomId: r.roomId,
        readBy: { $ne: nickname },
      });
      const lastMsg = await this.messageModel
        .findOne({ roomId: r.roomId })
        .sort({ createdAt: -1 })
        .lean();
      const lastMsgText = lastMsg
        ? lastMsg.isDeleted
          ? '🚫 삭제된 메시지'
          : lastMsg.text || (lastMsg.file ? '📁 첨부파일' : '')
        : '';
      const createdAt = this.toIso((r as { createdAt?: Date }).createdAt);
      const lastMsgTime = lastMsg
        ? this.toIso((lastMsg as { createdAt?: Date }).createdAt)
        : createdAt;

      result.push({
        roomId: r.roomId,
        name: r.name,
        type: r.type,
        owner: r.owner,
        members: r.members,
        createdAt,
        unread,
        lastMsgText,
        lastMsgTime,
      });
    }

    result.sort(
      (a, b) =>
        new Date(b.lastMsgTime ?? 0).getTime() -
        new Date(a.lastMsgTime ?? 0).getTime(),
    );
    return result;
  }

  /** 방 생성 (legacy /api/create-room 동작 보존) */
  async create(
    ownerRaw: string,
    dto: CreateRoomDto,
  ): Promise<CreateRoomResult | ApiResult> {
    const owner = nfc(ownerRaw);
    const { name, type, customId } = dto;
    const invitees = Array.isArray(dto.invitees)
      ? dto.invitees.map((n) => nfc(n))
      : [];

    if (type === RoomType.SECRET && (!customId || customId.trim() === '')) {
      return {
        success: false,
        message: '비밀방은 방 코드를 필수로 입력해야 합니다.',
      };
    }

    let roomId = customId
      ? customId.toUpperCase().replace(/[^A-Z0-9]/g, '')
      : Math.random().toString(36).substring(2, 8).toUpperCase();

    if (roomId.length < 2) {
      return { success: false, message: '방 코드는 2글자 이상이어야 합니다.' };
    }
    if (await this.roomModel.findOne({ roomId })) {
      return { success: false, message: '이미 사용 중인 방 코드입니다.' };
    }

    const members = [...new Set([owner, ...invitees])];
    await new this.roomModel({ roomId, name, type, owner, members }).save();
    return { roomId };
  }

  /** 비밀방 입장 (legacy /api/join-room 동작 보존) */
  async join(
    nicknameRaw: string,
    roomId: string,
  ): Promise<JoinRoomResult | ApiResult> {
    const nickname = nfc(nicknameRaw);
    const room = await this.roomModel.findOne({ roomId });
    if (!room) {
      return { success: false, message: '존재하지 않는 방 코드입니다.' };
    }
    if (room.type === RoomType.DM || room.roomId.startsWith('DM_')) {
      return {
        success: false,
        message: '🔒 1:1 대화방은 코드로 난입할 수 없습니다.',
      };
    }
    if (!room.members.includes(nickname)) {
      room.members.push(nickname);
      await room.save();
    }
    return { name: room.name, owner: room.owner };
  }

  private toIso(d?: Date | string | null): string {
    if (!d) return new Date(0).toISOString();
    return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
  }
}
