import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGateway } from './admin.gateway';

// #10 관리자 모듈. 모델은 @Global DatabaseModule, 가드/JWT는 @Global SecurityModule,
// Redis는 @Global RedisModule이 제공하므로 별도 import 불필요.
@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminGateway],
  exports: [AdminGateway],
})
export class AdminModule {}
