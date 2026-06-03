import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// dev에선 서비스워커(PWA)를 켜지 않는다 — SW 캐시가 깨진 모듈을 물고
// "새로고침 시 빈 화면"을 일으킬 수 있어서. PWA는 운영 빌드에서만 활성화.
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
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
    // 모노레포: web 루트 밖의 ../shared 소스를 dev 서버가 서빙하도록 허용
    fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
    proxy: {
      '/api': 'http://localhost:3000',
      '/files': 'http://localhost:3000',
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
}));
