import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { nfc } from '@babotalk/shared';
import type { PublicUser, UpdateProfileDto } from '@babotalk/shared';
import { User, UserDocument } from '../../database/schemas/user.schema';

// UpdateProfileDto(shared)는 nickname?/statusMessage? 만 정의하지만,
// 명세상 avatarUrl? 갱신도 허용한다(프로필 #7).
type ProfilePatch = UpdateProfileDto & { avatarUrl?: string };

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  /** User 도큐먼트/평문을 민감정보 제외한 PublicUser로 변환. */
  toPublicUser(user: Pick<User, 'username' | 'nickname' | 'avatarUrl' | 'statusMessage' | 'isAdmin'>): PublicUser {
    const result: PublicUser = {
      username: user.username,
      nickname: user.nickname,
      isAdmin: !!user.isAdmin,
    };
    if (user.avatarUrl) result.avatarUrl = user.avatarUrl;
    if (user.statusMessage) result.statusMessage = user.statusMessage;
    return result;
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username: nfc(username) }).exec();
  }

  /** GET /api/users/me — 현재 유저 PublicUser. */
  async getMe(username: string): Promise<PublicUser> {
    const user = await this.findByUsername(username);
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다');
    return this.toPublicUser(user);
  }

  /** PATCH /api/users/me — 프로필 갱신 후 PublicUser 반환. */
  async updateMe(username: string, dto: ProfilePatch): Promise<PublicUser> {
    const user = await this.findByUsername(username);
    if (!user) throw new NotFoundException('유저를 찾을 수 없습니다');

    if (dto.nickname !== undefined) user.nickname = nfc(dto.nickname);
    if (dto.statusMessage !== undefined) user.statusMessage = dto.statusMessage;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;

    await user.save();
    return this.toPublicUser(user);
  }
}
