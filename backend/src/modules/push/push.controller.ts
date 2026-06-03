import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { JwtPayload, SubscribeDto, VapidKeyResult } from '@babotalk/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PushService } from './push.service';

// @Controller('push') + 전역 'api' prefix → 최종 경로 `/api/push/...`.
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  /** GET /api/push/vapid-key — 클라이언트 구독 생성에 쓰는 공개키. 가드 불필요. */
  @Get('vapid-key')
  getVapidKey(): VapidKeyResult {
    return this.push.getVapidKey();
  }

  /** POST /api/push/subscribe — 현재 유저 구독 등록(중복 endpoint 무시). */
  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  async subscribe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubscribeDto,
  ): Promise<{ success: true }> {
    await this.push.subscribe(user.username, dto.subscription);
    return { success: true };
  }
}
