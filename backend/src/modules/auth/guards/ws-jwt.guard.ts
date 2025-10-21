import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    try {
      const client = context.switchToWs().getClient();
      const token = client.handshake?.auth?.token;

      if (!token) {
        return false;
      }

      const payload = this.jwtService.verify(token);
      client.user = payload;

      return true;
    } catch (error) {
      return false;
    }
  }
}
