import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { nfc } from '@babotalk/shared';
import type {
  ApiResult,
  DmRoomResult,
  Friend,
  FriendsResult,
} from '@babotalk/shared';
import { RoomType } from '@babotalk/shared';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { Room, RoomDocument } from '../../database/schemas/room.schema';

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>,
  ) {}

  /** 현재 유저의 친구 목록(username[] → Friend[]) */
  async list(username: string): Promise<FriendsResult> {
    const me = await this.userModel.findOne({ username }).lean();
    if (!me) return [];
    const friends = await this.userModel
      .find({ username: { $in: me.friends ?? [] } }, 'username nickname avatarUrl statusMessage')
      .lean();
    return friends.map(
      (f): Friend => ({
        username: f.username,
        nickname: f.nickname,
        avatarUrl: f.avatarUrl || undefined,
        statusMessage: f.statusMessage || undefined,
        online: false, // #5 presence는 chat 모듈에서 채움
      }),
    );
  }

  /** 친구 추가 (legacy /api/add-friend 동작 보존 + NFC + null 가드) */
  async add(myUsername: string, rawFriendId: string): Promise<ApiResult> {
    const friendId = nfc(rawFriendId);
    const friend = await this.userModel.findOne({
      $or: [{ username: friendId }, { nickname: friendId }],
    });
    if (!friend) {
      return { success: false, message: '존재하지 않는 아이디 또는 닉네임입니다.' };
    }
    if (myUsername === friend.username) {
      return { success: false, message: '자신을 친구로 추가할 수 없습니다.' };
    }
    const me = await this.userModel.findOne({ username: myUsername });
    if (!me) {
      return {
        success: false,
        message: '로그인 정보가 올바르지 않습니다. 다시 로그인해 주세요.',
      };
    }
    if (me.friends.includes(friend.username)) {
      return { success: false, message: '이미 추가된 친구입니다.' };
    }
    me.friends.push(friend.username);
    await me.save();
    return { success: true, message: '친구 추가 완료!' };
  }

  /** DM 방 생성/조회 (legacy /api/dm-room 동작 보존) */
  async dmRoom(myNickRaw: string, friendNickRaw: string): Promise<DmRoomResult> {
    const myNick = nfc(myNickRaw);
    const friendNick = nfc(friendNickRaw);
    const sorted = [myNick, friendNick].sort();
    const hash = Buffer.from(sorted.join('_')).toString('hex').substring(0, 16);
    const roomId = 'DM_' + hash;

    let room = await this.roomModel.findOne({ roomId });
    if (!room) {
      room = await new this.roomModel({
        roomId,
        name: '1:1 대화',
        type: RoomType.DM,
        owner: myNick,
        members: [myNick, friendNick],
      }).save();
    } else {
      if (room.type !== RoomType.DM) room.type = RoomType.DM;
      if (!room.members.includes(myNick)) room.members.push(myNick);
      if (!room.members.includes(friendNick)) room.members.push(friendNick);
      await room.save();
    }
    return { roomId, roomName: friendNick };
  }
}
