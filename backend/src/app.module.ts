import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { SecurityModule } from './common/security.module';
import { RedisModule } from './common/redis.module';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FriendsModule } from './modules/friends/friends.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ChatModule } from './modules/chat/chat.module';
import { FilesModule } from './modules/files/files.module';
import { PushModule } from './modules/push/push.module';
import { AdminModule } from './modules/admin/admin.module';
import { WebrtcModule } from './modules/webrtc/webrtc.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    MongooseModule.forRootAsync({
      useFactory: () => ({ uri: configuration().mongoUri }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]), // #10 레이트리밋
    // 빌드된 프런트(web/dist)를 백엔드가 직접 서빙(SPA). API/파일/소켓 경로는 제외.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'web', 'dist'),
      exclude: ['/api/(.*)', '/files/(.*)', '/socket.io/(.*)'],
    }),
    DatabaseModule,
    SecurityModule,
    RedisModule,
    AuthModule,
    UsersModule,
    FriendsModule,
    RoomsModule,
    MessagesModule,
    ChatModule,
    FilesModule,
    PushModule,
    AdminModule,
    WebrtcModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
