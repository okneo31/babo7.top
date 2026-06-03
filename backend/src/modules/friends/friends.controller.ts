import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type {
  AddFriendDto,
  ApiResult,
  DmRoomDto,
  DmRoomResult,
  FriendsResult,
  JwtPayload,
} from '@babotalk/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FriendsService } from './friends.service';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  // GET /api/friends — 현재 유저의 친구 목록
  @Get()
  list(@CurrentUser() user: JwtPayload): Promise<FriendsResult> {
    return this.friends.list(user.username);
  }

  // POST /api/friends — 친구 추가
  @Post()
  add(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddFriendDto,
  ): Promise<ApiResult> {
    return this.friends.add(user.username, dto.friendId);
  }

  // POST /api/friends/dm — DM 방 생성/조회
  @Post('dm')
  dm(
    @CurrentUser() user: JwtPayload,
    @Body() dto: DmRoomDto,
  ): Promise<DmRoomResult> {
    return this.friends.dmRoom(user.nickname, dto.friendNick);
  }
}
