import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import type { JwtPayload } from '@babotalk/shared';

// Socket.IO 핸드셰이크 인증. handshake.auth.token 검증 후 socket.data.user에 부착.
@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const socket: Socket = ctx.switchToWs().getClient();
    const token =
      socket.handshake?.auth?.token ||
      (socket.handshake?.headers?.authorization || '').replace('Bearer ', '');
    try {
      socket.data.user = this.jwt.verify<JwtPayload>(token);
      return true;
    } catch {
      return false;
    }
  }
}

// 게이트웨이 connection 시 토큰 검증에 쓰는 헬퍼(가드 밖에서도 사용 가능).
export function verifySocket(jwt: JwtService, socket: Socket): JwtPayload | null {
  const token =
    socket.handshake?.auth?.token ||
    (socket.handshake?.headers?.authorization || '').replace('Bearer ', '');
  try {
    return jwt.verify<JwtPayload>(token);
  } catch {
    return null;
  }
}
