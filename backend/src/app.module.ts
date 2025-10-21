import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { KeysModule } from './modules/keys/keys.module';
import { WebrtcModule } from './modules/webrtc/webrtc.module';
import { ChatGateway } from './modules/chat/chat.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    UsersModule,
    MessagesModule,
    ConversationsModule,
    KeysModule,
    WebrtcModule,
  ],
  providers: [ChatGateway],
})
export class AppModule {}
