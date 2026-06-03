import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';

// 스키마는 DatabaseModule(@Global)에서 등록·노출되므로 여기서 forFeature 불필요.
// MessagesService를 export 하여 ChatModule이 주입·재사용한다.
@Module({
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
