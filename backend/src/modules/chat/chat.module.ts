import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { MessagesModule } from '../messages/messages.module';
import { PushModule } from '../push/push.module';

// 크로스 의존:
//  - MessagesModule → MessagesService 주입(메시지 저장/직렬화 재사용)
//  - PushModule → PushService 주입(오프라인/멘션 푸시 #1 #3)
// JwtModule/REDIS/스키마는 각각 @Global(SecurityModule/RedisModule/DatabaseModule)에서 제공.
@Module({
  imports: [MessagesModule, PushModule],
  providers: [ChatGateway],
  exports: [ChatGateway],
})
export class ChatModule {}
