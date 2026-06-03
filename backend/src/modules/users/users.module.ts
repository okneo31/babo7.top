import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

// 모델은 @Global DatabaseModule, 가드는 @Global SecurityModule이 제공하므로 import 불필요.
// UsersService를 export해 다른 모듈(auth 등)이 PublicUser 변환/조회를 재사용할 수 있게 한다.
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
