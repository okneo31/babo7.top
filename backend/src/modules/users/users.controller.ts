import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import type { PublicUser, UpdateProfileDto } from '@babotalk/shared';
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

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload): Promise<PublicUser> {
    return this.users.getMe(user.username);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileBody,
  ): Promise<PublicUser> {
    return this.users.updateMe(user.username, dto);
  }
}
