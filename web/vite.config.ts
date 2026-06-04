import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// dev 전용: 과거 등록된 서비스워커가 옛 캐시를 물고 "새로고침 시 빈화면"을 일으키므로,
// /sw.js, /dev-sw.js, /registerSW.js 자리에 '자폭' SW를 내려준다.
// 갇힌 워커가 업데이트 확인(네트워크) 때 이걸 받아 캐시 삭제 + unregister + 클라이언트 새로고침.
function selfDestroyingSw(): Plugin {
  const body =
    "self.addEventListener('install',()=>self.skipWaiting());" +
    "self.addEventListener('activate',async()=>{try{" +
    'const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)));' +
    'await self.registration.unregister();' +
    'const cs=await self.clients.matchAll({type:"window"});cs.forEach(c=>c.navigate(c.url));' +
    '}catch(e){}});';
  return {
    name: 'self-destroying-sw',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const u = (req.url || '').split('?')[0];
        if (u === '/sw.js' || u === '/dev-sw.js' || u === '/registerSW.js') {
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cache-Control', 'no-store');
          res.end(u === '/registerSW.js' ? '' : body);
          return;
        }
        next();
      });
    },
  };
}

// dev에선 서비스워커(PWA)를 켜지 않는다 — SW 캐시가 깨진 모듈을 물고
// "새로고침 시 빈 화면"을 일으킬 수 있어서. PWA는 운영 빌드에서만 활성화.
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    ...(command === 'serve' ? [selfDestroyingSw()] : []),
    ...(command === 'build'
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            manifest: {
              name: 'BaboTalk',
              short_name: 'BaboTalk',
              theme_color: '#17212b',
              background_color: '#0e1621',
              display: 'standalone',
              icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
            },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@babotalk/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // dev 캐시 지옥 방지: 브라우저가 모듈/HTML을 캐시하지 않게 강제(일반 창에서도 항상 최신)
    headers: { 'Cache-Control': 'no-store' },
    // 모노레포: web 루트 밖의 ../shared 소스를 dev 서버가 서빙하도록 허용
    fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
    proxy: {
      '/api': 'http://localhost:3000',
      '/files': 'http://localhost:3000',
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
}));
