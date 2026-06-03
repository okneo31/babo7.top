import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { PushService } from './push.service';

// User 모델은 @Global DatabaseModule, ConfigService는 @Global ConfigModule,
// 가드는 @Global SecurityModule이 제공하므로 추가 import 불필요.
// PushService를 export해 messages/chat 등이 sendToNickname()으로 오프라인 알림을 보낼 수 있게 한다.
@Module({
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
