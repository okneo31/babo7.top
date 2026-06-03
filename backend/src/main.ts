import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const cfg = app.get(ConfigService);

  app.setGlobalPrefix('api', { exclude: ['files/(.*)'] });
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.enableCors({ origin: cfg.get<string[]>('corsOrigins'), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Socket.IO를 Redis 어댑터로(수평확장)
  const ioAdapter = new RedisIoAdapter(app, cfg.get<string>('redisUrl')!);
  await ioAdapter.connect();
  app.useWebSocketAdapter(ioAdapter);

  const port = cfg.get<number>('port')!;
  await app.listen(port);
  console.log(`✅ BaboTalk v2 API listening on :${port}`);
}
bootstrap();
