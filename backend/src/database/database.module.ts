import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Room, RoomSchema } from './schemas/room.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { Notice, NoticeSchema } from './schemas/notice.schema';

// 모든 스키마를 한 곳에서 등록하고 MongooseModule을 re-export.
// @Global 이므로 어느 모듈이든 모델을 주입받을 수 있다(messages가 User 등 교차 참조).
const models = MongooseModule.forFeature([
  { name: User.name, schema: UserSchema },
  { name: Room.name, schema: RoomSchema },
  { name: Message.name, schema: MessageSchema },
  { name: Notice.name, schema: NoticeSchema },
]);

@Global()
@Module({
  imports: [models],
  exports: [models],
})
export class DatabaseModule {}
