import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type {
  ApiResult,
  CreateRoomDto,
  CreateRoomResult,
  JoinRoomDto,
  JoinRoomResult,
  JwtPayload,
  RoomsResult,
} from '@babotalk/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoomsService } from './rooms.service';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  // GET /api/rooms — 현재 유저 닉네임 기준 방 목록
  @Get()
  list(@CurrentUser() user: JwtPayload): Promise<RoomsResult> {
    return this.rooms.list(user.nickname);
  }

  // POST /api/rooms — 방 생성
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateRoomDto,
  ): Promise<CreateRoomResult | ApiResult> {
    return this.rooms.create(user.nickname, dto);
  }

  // POST /api/rooms/join — 비밀방 입장
  @Post('join')
  join(
    @CurrentUser() user: JwtPayload,
    @Body() dto: JoinRoomDto,
  ): Promise<JoinRoomResult | ApiResult> {
    return this.rooms.join(user.nickname, dto.roomId);
  }
}
