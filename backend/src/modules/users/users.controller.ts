import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import type { MeResult, UpdateProfileDto } from '@babotalk/shared';
import type { JwtPayload } from '@babotalk/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';

// avatarUrl? 갱신도 허용(명세 #7).
type UpdateProfileBody = UpdateProfileDto & { avatarUrl?: string };

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // 계약(MeResult = { user }) 준수 — 프런트 api.me()가 res.user 로 읽는다.
  @Get('me')
  async getMe(@CurrentUser() user: JwtPayload): Promise<MeResult> {
    return { user: await this.users.getMe(user.username) };
  }

  @Patch('me')
  async updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileBody,
  ): Promise<MeResult> {
    return { user: await this.users.updateMe(user.username, dto) };
  }
}
