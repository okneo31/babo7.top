import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import type { RedisClientType } from 'redis';
import { nfc } from '@babotalk/shared';
import type { AdminStatsResult, AdminUserRow, Notice as NoticeModel } from '@babotalk/shared';
import { REDIS } from '../../common/redis.module';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { Room, RoomDocument } from '../../database/schemas/room.schema';
import { Message, MessageDocument } from '../../database/schemas/message.schema';
import { Notice, NoticeDocument } from '../../database/schemas/notice.schema';

// Redis presence set 키 — chat 게이트웨이가 온라인 유저를 적재하는 집합.
// (chat 모듈과 동일한 컨벤션을 따른다. 없으면 size 0 → onlineCount 0.)
export const PRESENCE_SET = 'presence:online';

// #10 admin 비즈니스 로직. 게이트웨이 emit과 분리되어 순수 데이터 처리만 담당.
@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>,
    @InjectModel(Message.name) private readonly messageModel: Model<MessageDocument>,
    @InjectModel(Notice.name) private readonly noticeModel: Model<NoticeDocument>,
    @Inject(REDIS) private readonly redis: RedisClientType,
    private readonly config: ConfigService,
  ) {}

  /** POST /api/admin/stats — 유저/방 수 + Redis presence set 크기. */
  async stats(): Promise<AdminStatsResult> {
    const [userCount, totalRooms] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.roomModel.countDocuments().exec(),
    ]);
    let onlineCount = 0;
    try {
      onlineCount = await this.redis.sCard(PRESENCE_SET);
    } catch {
      onlineCount = 0; // presence set 미존재/Redis 오류 시 0
    }
    return { userCount, totalRooms, onlineCount };
  }

  /**
   * POST /api/admin/broadcast — 기존 공지 비우고 새 공지 1건 저장.
   * emit은 컨트롤러가 AdminGateway를 통해 수행한다(io 서버 공유).
   */
  async broadcast(message: string): Promise<NoticeModel> {
    await this.noticeModel.deleteMany({}).exec();
    const created = await this.noticeModel.create({ text: message });
    return {
      id: String(created._id),
      text: created.text,
      createdAt: (created as NoticeDocument & { createdAt?: Date }).createdAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  /**
   * POST /api/admin/reset — rooms/messages/users/notices 전부 삭제 +
   * uploads 디렉터리 비우기. system_reset emit은 컨트롤러가 수행한다.
   */
  async reset(): Promise<void> {
    await Promise.all([
      this.roomModel.deleteMany({}).exec(),
      this.messageModel.deleteMany({}).exec(),
      this.userModel.deleteMany({}).exec(),
      this.noticeModel.deleteMany({}).exec(),
    ]);
    await this.clearUploads();
  }

  /** config.upload.dir 안의 파일을 모두 제거(디렉터리 자체는 보존). */
  private async clearUploads(): Promise<void> {
    const dir = this.config.get<string>('upload.dir') ?? './uploads';
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      await Promise.all(
        entries.map((e) =>
          fs.rm(path.join(dir, e.name), { recursive: true, force: true }),
        ),
      );
    } catch {
      // 업로드 디렉터리가 아직 없으면 무시(legacy 동작과 동일).
    }
  }

  /** GET /api/admin/users — 관리용 유저 목록. */
  async listUsers(): Promise<AdminUserRow[]> {
    const users = await this.userModel
      .find({}, 'username nickname isAdmin createdAt')
      .lean()
      .exec();
    return users.map((u) => ({
      username: u.username,
      nickname: u.nickname,
      isAdmin: !!u.isAdmin,
      createdAt:
        (u as { createdAt?: Date }).createdAt?.toISOString() ?? new Date().toISOString(),
    }));
  }

  /** POST /api/admin/ban — 해당 유저 isBanned=true. */
  async ban(username: string): Promise<{ banned: boolean }> {
    const res = await this.userModel
      .updateOne({ username: nfc(username) }, { $set: { isBanned: true } })
      .exec();
    return { banned: res.matchedCount > 0 };
  }
}
