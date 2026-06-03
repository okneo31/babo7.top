import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type {
  AdminStatsResult,
  AdminUserRow,
  BroadcastDto,
  AdminResetDto,
  AdminBanDto,
  ApiResult,
  Ok,
} from '@babotalk/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminService } from './admin.service';
import { AdminGateway } from './admin.gateway';

// #10 관리자 라우트. 모든 엔드포인트는 JWT 인증 + 관리자 권한 필요.
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly gateway: AdminGateway,
  ) {}

  @Post('stats')
  stats(): Promise<AdminStatsResult> {
    return this.admin.stats();
  }

  @Post('broadcast')
  async broadcast(@Body() dto: BroadcastDto): Promise<Ok> {
    const notice = await this.admin.broadcast(dto.message);
    this.gateway.emitNotice({ id: notice.id, text: notice.text });
    return { success: true };
  }

  @Post('reset')
  async reset(@Body() dto: AdminResetDto): Promise<ApiResult> {
    if (dto?.confirm !== 'CONFIRM_NUKE') {
      return { success: false, message: '확인 문구가 일치하지 않아 취소되었습니다.' };
    }
    await this.admin.reset();
    this.gateway.emitSystemReset();
    return { success: true };
  }

  @Get('users')
  users(): Promise<AdminUserRow[]> {
    return this.admin.listUsers();
  }

  @Post('ban')
  async ban(@Body() dto: AdminBanDto): Promise<ApiResult> {
    const { banned } = await this.admin.ban(dto.username);
    return banned
      ? { success: true }
      : { success: false, message: '대상 유저를 찾지 못했습니다.' };
  }
}
