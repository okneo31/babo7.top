import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '@babotalk/shared';

// 컨트롤러에서 @CurrentUser() user: JwtPayload 로 인증 유저 주입.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => ctx.switchToHttp().getRequest().user,
);
