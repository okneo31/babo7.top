import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { INestApplicationContext } from '@nestjs/common';

// Socket.IO를 Redis pub/sub로 묶어 여러 워커/인스턴스 간 이벤트를 공유한다.
// → Node cluster 수평확장 시 방 브로드캐스트가 모든 워커에 전달됨(텍스트 동시접속 수만 명).
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext, private readonly redisUrl: string) {
    super(app);
  }

  async connect(): Promise<void> {
    const pub = createClient({ url: this.redisUrl });
    const sub = pub.duplicate();
    await Promise.all([pub.connect(), sub.connect()]);
    this.adapterConstructor = createAdapter(pub, sub);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, { ...options, cors: { origin: '*' } });
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }
}
