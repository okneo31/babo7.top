import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

export const REDIS = Symbol('REDIS_CLIENT');

// 연결된 Redis 클라이언트를 @Global 토큰으로 제공. 어느 모듈이든 @Inject(REDIS)로 사용.
// (초대코드 저장 #auth, presence #chat, 캐시 등)
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: async (cfg: ConfigService): Promise<RedisClientType> => {
        const client: RedisClientType = createClient({ url: cfg.get<string>('redisUrl') });
        client.on('error', (e) => console.error('Redis error', e));
        await client.connect();
        return client;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
