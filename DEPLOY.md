# BaboTalk v2 배포 (PM2 cluster + Caddy)

현재 운영 중인 legacy 모놀리식(`babotalk-app-1` 컨테이너)은 **그대로 두고**, v2를 **다른 포트(3000)** 에 PM2로 띄워 검증한 뒤, Caddy를 v2로 전환한다. 문제 시 Caddy만 되돌리면 legacy로 즉시 롤백.

> 인프라 재사용: **mongo / redis / coturn 컨테이너는 변경 없음.** v2는 기존 MongoDB(`babotalk` DB)를 그대로 가리킨다 → 유저/방/메시지/친구 데이터 무손실.

## 0. 사전: Node 20 + PM2 (호스트)
```bash
# Node 20 (없으면)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm i -g pm2
```

## 1. 소스 + 빌드 (호스트)
```bash
cd ~ && git clone https://github.com/okneo31/babo7.top.git babotalk-v2 && cd babotalk-v2
npm ci
npm run build            # shared → backend → web (dist 생성)
```

## 2. 환경변수 `backend/.env`
`backend/.env.example`를 복사해 채운다. **운영 필수 교체**: `JWT_SECRET`, `ADMIN_PW`, `FILE_TOKEN_SECRET`, VAPID 키.
```bash
cp backend/.env.example backend/.env
# VAPID 키 생성:
npx --prefix backend web-push generate-vapid-keys
# .env 에 PORT=3000, MONGO_URI=mongodb://localhost:27017/babotalk (또는 컨테이너 IP),
#   REDIS_URL=redis://localhost:6379, VAPID_* , 시크릿들 채우기
```
> Mongo/Redis가 Docker 컨테이너면 호스트에서 접근하도록 해당 컨테이너 포트를 호스트에 노출하거나(`-p 27017:27017`), Mongo/Redis URI를 컨테이너 네트워크 IP로 지정.

## 3. PM2 기동 (4코어 cluster)
```bash
pm2 start ecosystem.config.cjs      # babotalk-api, instances=max(=4)
pm2 logs babotalk-api               # 부팅/연결 로그 확인
pm2 save && pm2 startup             # 재부팅 자동기동
```
스모크 체크: `curl -s localhost:3000/api/push/vapid-key` → 공개키 JSON이 오면 OK.

## 4. Caddy 전환 (legacy → v2)
`deploy/Caddyfile`을 Caddy가 읽도록 교체. 정적 경로 매핑:
- `/srv/web` ← `~/babotalk-v2/web/dist`
- `/srv/uploads` ← 기존 업로드 폴더(`~/babotalk/public/uploads`)
- 백엔드 업스트림 `host.docker.internal:3000` (Caddy 컨테이너에 `extra_hosts: host.docker.internal:host-gateway` 필요. 네이티브면 `127.0.0.1:3000`)

```bash
# 예: 기존 caddy 컨테이너의 Caddyfile/마운트를 v2용으로 교체 후
docker restart babotalk-caddy-1
```
브라우저로 https://babo7.top 접속 → v2 동작 확인.

## 5. 검증 체크리스트
- [ ] 가입(초대코드)/로그인 → 토큰 발급
- [ ] 방 목록/생성/입장, 1:1 DM
- [ ] 메시지 송수신(실시간), 수정/삭제, 읽음
- [ ] 친구 추가(한글 닉네임 NFC), 친구목록
- [ ] 반응(#4)/답장·멘션(#3)/타이핑·온라인(#5)
- [ ] 파일·이미지·음성(#6) 업로드/재생, 토큰 URL(#8)
- [ ] 프로필 아바타/상태(#7), 사라지는 메시지·앱잠금(#9)
- [ ] 푸시 구독/수신(#1), 영상통화(WebRTC)
- [ ] 관리자 통계/공지/유저관리(#10)

## 6. 롤백
Caddy를 legacy 설정으로 되돌리고 `docker restart babotalk-caddy-1`. legacy 컨테이너(`babotalk-app-1`)는 계속 살아있으므로 즉시 복구.

## 7. 재배포 (무중단)
```bash
cd ~/babotalk-v2 && git pull && npm ci && npm run build && pm2 reload babotalk-api
```

## 로드맵: 그룹 영상 SFU
현재 영상은 mesh(P2P). 대규모 그룹 영상은 **mediasoup SFU**를 별도 서비스로 추가(`ARCHITECTURE.md` 9장). coturn은 TURN으로 유지.
