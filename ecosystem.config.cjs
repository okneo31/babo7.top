// PM2 구동 설정 — 네이티브 cluster로 4 OCPU 풀활용.
// Socket.IO Redis 어댑터(common/redis-io.adapter)가 워커 간 이벤트를 공유하므로
// instances를 늘려도 방 브로드캐스트가 모든 워커에 전달된다.
//
// 사용:
//   npm ci && npm run build           # shared→backend→web 빌드
//   pm2 start ecosystem.config.cjs    # 최초 기동
//   pm2 reload babotalk-api           # 무중단 재배포
//   pm2 logs babotalk-api / pm2 monit
module.exports = {
  apps: [
    {
      name: 'babotalk-api',
      script: 'backend/dist/main.js',
      cwd: __dirname,
      exec_mode: 'cluster',
      instances: 'max', // = OCPU 수(4). 필요시 숫자로 고정.
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
        // 실제 값은 backend/.env 에서 로드됨(@nestjs/config). 여기선 최소만.
        PORT: '3000', // Caddy가 앞단 80/443을 처리하고 이쪽으로 프록시
      },
    },
  ],
};
