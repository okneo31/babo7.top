import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '@babotalk/shared';

// HTTP 라우트 보호. Authorization: Bearer <jwt> 검증 후 req.user에 페이로드 부착.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const auth: string = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) throw new UnauthorizedException('토큰 없음');
    try {
      req.user = this.jwt.verify<JwtPayload>(token);
      return true;
    } catch {
      throw new UnauthorizedException('토큰이 유효하지 않습니다');
    }
  }
}
