import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { JwtPayload } from '@babotalk/shared';

// JwtAuthGuard 다음에 적용. req.user.isAdmin 검사. (#10)
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user: JwtPayload | undefined = ctx.switchToHttp().getRequest().user;
    if (!user?.isAdmin) throw new ForbiddenException('관리자 전용');
    return true;
  }
}
