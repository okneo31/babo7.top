import { Controller, Get, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import type { IceConfigResult, IceServer } from '@babotalk/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// GET /api/webrtc/ice — STUN/TURN 설정을 런타임에 내려준다.
// TURN 자격은 코드/번들에 박지 않고 env에서만 읽으며, secret 모드면 시간제한 자격을 생성한다.
@Controller('webrtc')
export class WebrtcController {
  constructor(private readonly config: ConfigService) {}

  @Get('ice')
  @UseGuards(JwtAuthGuard) // 로그인 사용자에게만 TURN 자격 제공
  ice(): IceConfigResult {
    const iceServers: IceServer[] = [{ urls: this.config.get<string>('stun')! }];

    const turn = this.config.get<{
      url: string;
      secret: string;
      ttlSec: number;
      username: string;
      password: string;
    }>('turn')!;

    if (turn.url) {
      if (turn.secret) {
        // coturn use-auth-secret: username = "<만료유닉스초>", credential = base64(HMAC-SHA1(secret, username))
        const username = String(Math.floor(Date.now() / 1000) + turn.ttlSec);
        const credential = createHmac('sha1', turn.secret).update(username).digest('base64');
        iceServers.push({ urls: turn.url, username, credential });
      } else if (turn.username) {
        // 정적 자격(레거시 호환) — 값은 env에서만 온다.
        iceServers.push({ urls: turn.url, username: turn.username, credential: turn.password });
      }
    }

    return { iceServers };
  }
}
