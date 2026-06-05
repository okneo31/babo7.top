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

  // 과거 PWA 빌드로 사용자 브라우저에 박힌 서비스워커를 제거하기 위한 '자폭 SW'.
  // 브라우저는 새로고침 때 /sw.js 업데이트를 네트워크로 확인 → 이걸 받아 캐시삭제+unregister+리로드.
  const SELF_DESTROY_SW =
    "self.addEventListener('install',()=>self.skipWaiting());" +
    "self.addEventListener('activate',async()=>{try{" +
    'const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)));' +
    'await self.registration.unregister();' +
    'const cs=await self.clients.matchAll({type:"window"});cs.forEach(c=>c.navigate(c.url));' +
    '}catch(e){}});';
  app.use((req: { path: string }, res: any, next: () => void) => {
    if (req.path === '/sw.js' || req.path === '/registerSW.js') {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'no-store');
      res.end(req.path === '/registerSW.js' ? '' : SELF_DESTROY_SW);
      return;
    }
    next();
  });

  // index.html(및 API)은 항상 최신으로 — HTTP 캐시 staleness 방지.
  // 해시 붙은 불변 에셋(/assets/*)만 캐시 허용.
  app.use((req: { path: string }, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    if (!req.path.startsWith('/assets/')) res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Socket.IO를 Redis 어댑터로(수평확장)
  const ioAdapter = new RedisIoAdapter(app, cfg.get<string>('redisUrl')!);
  await ioAdapter.connect();
  app.useWebSocketAdapter(ioAdapter);

  const port = cfg.get<number>('port')!;
  await app.listen(port);
  console.log(`✅ BaboTalk v2 API listening on :${port}`);
}
bootstrap();
