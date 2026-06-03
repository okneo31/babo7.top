# BaboTalk (babo7.top)

폐쇄형 멤버십 기반의 실시간 메신저 + WebRTC 영상통화 서비스 — **https://babo7.top**

초대코드로만 가입하는 비공개 메신저로, 단일 파일 Express 서버와 PWA 프런트엔드로 동작합니다.

---

## ✨ 기능

- **가입/인증**: 초대코드 기반 가입, JWT 로그인 (관리자 슈퍼계정 별도)
- **대화방**: 공개방 · 비밀방(코드 입장) · 채널 · 1:1 DM
- **메시지**: 실시간 채팅(Socket.IO), 읽음 확인, 수정/삭제, 대화 내 검색
- **파일 전송**: 디스크 스트리밍 업로드 (대용량 OOM 방지)
- **친구**: 아이디·닉네임 검색으로 친구 추가, 친구 목록, 1:1 대화 바로가기
- **영상통화**: WebRTC 다자 영상/음성 (coturn TURN 서버 경유, LTE/5G 지원)
- **보안/운영**: 메시지 폭파 타이머, 관리자 공지·통계·시스템 리셋
- **PWA**: 아이폰/안드로이드 홈 화면 설치, 푸시 알림

## 🛠 기술 스택

| 영역 | 사용 기술 |
|------|-----------|
| 서버 | Node.js 18, Express, Socket.IO, Mongoose |
| DB / 캐시 | MongoDB, Redis |
| 프록시 / TLS | Caddy |
| 미디어 | coturn (TURN/STUN) |
| 인프라 | Oracle Cloud (VM.Standard.A1.Flex, Ubuntu) + Docker Compose |

## 📁 구조

```
babo7.top/
├── server.js            # 서버 전체 (인증·방·메시지·친구·WebRTC 시그널링)
├── public/
│   ├── index.html       # 프런트엔드 전체 (채팅 UI, PWA)
│   ├── icon.svg
│   ├── manifest.json
│   └── manual.html
├── docker-compose.yml   # app(node) + mongo + redis + caddy + coturn
├── Caddyfile            # 리버스 프록시 / 자동 TLS
└── package.json
```

> `server.js`는 의도적으로 단일 파일로 유지되는 모놀리식입니다.
> 인증, 방, 메시지, 친구, 파일 업로드 HTTP 라우트와 Socket.IO 이벤트(채팅/읽음/통화 시그널링)를 한 파일에서 처리합니다.

## 🚦 실행

### 로컬 (Docker Compose)
```bash
git clone https://github.com/okneo31/babo7.top.git
cd babo7.top
docker compose up -d        # app + mongo + redis + caddy + coturn
```
앱은 컨테이너 내부 80포트에서 구동되고 Caddy가 외부 80/443을 처리합니다.

### 단독 실행 (MongoDB/Redis 별도 구동 시)
```bash
npm install
node server.js              # 기본 80포트
```
서버는 `mongodb://mongo:27017/babotalk` 와 `redis://redis:6379` 에 연결합니다(Compose 네트워크 기준).

## 🔧 운영 메모

- **영상통화 포트(필수)**: coturn용 `UDP 3478`(시그널), `UDP 49160-49200`(미디어), `TCP 80/443`(웹)을 방화벽에서 열어야 합니다.
- **관리자**: 슈퍼 관리자 계정으로 공지 발송 / 접속 통계 / 시스템 리셋 가능.
- **초대코드**: 관리자가 생성한 6자리 코드로 가입. (비상용 마스터 키 별도)

## 📝 변경 이력 (주요)

- **한글 닉네임 친구 추가 버그 수정 (유니코드 NFC 정규화)**
  DB는 한글을 NFC(완성형)로 저장하는데 iOS/macOS 입력은 NFD(조합형)로 전송되어,
  글자가 같아도 코드포인트가 달라 닉네임 매칭이 실패했다. 서버 입력 경계에서 신원/매칭 필드
  (`username`, `nickname`, `friendId`, `myNick` 등)를 `normalize('NFC')`로 통일해 해결.
  적용: register / login / friends / add-friend / dm-room / rooms / create-room / join-room,
  소켓 join_room · msg · read_msg · read_room. add-friend에 로그인 정보 null 가드 추가.
- 파일 업로드 OOM 버그 수정: `express.raw()` 메모리 적재 → `req.pipe()` 디스크 스트리밍 전환.

## 📄 라이선스

MIT License — [@okneo31](https://github.com/okneo31)
