import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { AdminGuard } from './guards/admin.guard';

// JWT 설정을 한 곳에서 구성하고 @Global로 노출. 모든 모듈이 JwtService/가드를 재사용.
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('jwt.secret'),
        signOptions: { expiresIn: cfg.get<string>('jwt.expiresIn') },
      }),
    }),
  ],
  providers: [JwtAuthGuard, WsJwtGuard, AdminGuard],
  exports: [JwtModule, JwtAuthGuard, WsJwtGuard, AdminGuard],
})
export class SecurityModule {}
