import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';

// 모델(@Global DatabaseModule), Redis(@Global RedisModule),
// JwtService/가드(@Global SecurityModule)는 모두 전역 제공 → import 불필요.
// UsersModule만 PublicUser 변환 헬퍼(UsersService) 사용을 위해 import.
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
