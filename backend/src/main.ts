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
  // CSP/COEP 비활성: 기본 CSP의 upgrade-insecure-requests가 HTTP 스테이징에서 에셋을
  // HTTPS로 강제 업그레이드해 깨지고, script-src 'self'가 Tailwind CDN을 막는다.
  // TODO(운영 하드닝): Tailwind를 PostCSS로 빌드 후 엄격한 CSP 재적용.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
    }),
  );
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
