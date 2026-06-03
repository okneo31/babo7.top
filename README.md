# Babo7 Secure Messenger

보안 중심의 폐쇄형 멤버십 메신저 + 영상통화 서비스 — **https://babo7.top**

---

## 📌 현재 상태 (2026-06 기준)

이 저장소에는 **두 개의 트랙**이 공존합니다.

| 트랙 | 위치 | 상태 |
|------|------|------|
| **운영 버전 (모놀리식)** | [`legacy/`](./legacy) | ✅ **현재 babo7.top에서 라이브 서비스 중** |
| **재작성 버전 (NestJS + React Native)** | `backend/`, `mobile/` | 🚧 설계/스캐폴드 단계 (미배포) |

> 실제 사용자가 접속하는 babo7.top은 **`legacy/`의 단일 파일 Express 모놀리식**으로 동작합니다.
> 아래 "핵심 보안 기능 / Signal Protocol" 등은 재작성 버전의 **목표 아키텍처**이며 아직 구현 전입니다.

---

## 🟢 운영 버전 (legacy/) — 지금 돌아가는 코드

단일 파일 Express 앱으로, 폐쇄형 초대제 메신저입니다.

### 기능
- 초대코드 기반 가입 / JWT 로그인
- 공개방 · 비밀방(코드) · 채널 · 1:1 DM
- 실시간 채팅 (Socket.IO), 읽음 확인, 메시지 수정/삭제
- 파일 전송 (디스크 스트리밍), 대화 검색
- 친구 목록 / 친구 추가 (아이디·닉네임 검색)
- WebRTC 영상/음성 통화 (coturn TURN 서버)
- 메시지 폭파 타이머, 관리자 공지/통계/시스템 리셋
- PWA (아이폰 홈 화면 설치 지원)

### 기술 스택
- **런타임**: Node.js 18 (Express + Socket.IO + Mongoose)
- **DB / 캐시**: MongoDB, Redis
- **프록시 / TLS**: Caddy
- **미디어**: coturn (TURN/STUN)
- **인프라**: Oracle Cloud (VM.Standard.A1.Flex, Ubuntu) + Docker Compose

### 구성 파일
`legacy/` 폴더 참고 — `server.js`(서버 전체), `public/index.html`(프런트 전체),
`docker-compose.yml`, `Caddyfile`, `package.json`.

### 최근 변경
- **한글 닉네임 친구 추가 버그 수정 (유니코드 NFC 정규화)** — iOS/macOS의 NFD 조합형 입력과
  DB의 NFC 완성형 저장이 불일치해 닉네임 매칭이 실패하던 문제를 입력 경계 NFC 통일로 해결.
  자세한 내용은 [`legacy/README.md`](./legacy/README.md) 참고.

---

## 🚧 재작성 버전 (backend/ + mobile/) — 목표 아키텍처

차세대 버전은 E2EE를 적용한 NestJS 백엔드 + React Native 앱으로 재작성을 계획 중입니다.
아래 내용은 **구현 목표**이며 현재는 스캐폴드 상태입니다.

### 🔒 목표 보안 기능
- **End-to-End 암호화 (E2EE)**: Signal Protocol 기반
- **완전 순방향 비밀성 (Perfect Forward Secrecy)**
- **안전한 키 교환**: X3DH (Extended Triple Diffie-Hellman)
- **메시지 자동 삭제** (선택 사항)
- **스크린샷 방지**, **생체 인증 지원**

### 🛠 목표 기술 스택
- **모바일**: React Native, TypeScript, Redux Toolkit, React Navigation, WebRTC, react-native-fast-crypto
- **백엔드**: NestJS, TypeScript, Socket.io, WebRTC Signaling, JWT
- **데이터/인프라**: Supabase(PostgreSQL), Redis, S3 호환 스토리지

### 🔐 Signal Protocol 설계
- **Identity Key**: 장기 공개/개인 키 쌍
- **Signed Prekey**: 주기적으로 갱신되는 서명 키
- **One-time Prekeys**: 일회성 키 번들
- **Double Ratchet Algorithm**: 메시지 암호화
- 클라이언트 측 암호화 / 서버는 암호문만 저장·전달 / 키는 클라이언트에만 보관

---

## 📁 프로젝트 구조

```
babo7.top/
├── legacy/              # ✅ 현재 운영 중인 모놀리식 (Express)
│   ├── server.js        #    서버 전체 (인증/방/메시지/친구/WebRTC 시그널링)
│   ├── public/          #    프런트엔드 (index.html, PWA 자산)
│   ├── docker-compose.yml
│   ├── Caddyfile
│   └── package.json
│
├── backend/             # 🚧 재작성 NestJS 서버 (스캐폴드)
│   └── src/modules/     #    auth, chat, conversations, messages, users, webrtc
│
├── mobile/              # 🚧 재작성 React Native 앱 (스캐폴드)
│   └── src/
│
├── docs/                # 문서 (SECURITY, SETUP, DATABASE_SCHEMA)
└── README.md
```

## 🚦 시작하기

### 운영 버전 (legacy) 로컬 실행
```bash
git clone https://github.com/okneo31/babo7.top.git
cd babo7.top/legacy
docker compose up -d        # app + mongo + redis + caddy + coturn
```

### 재작성 버전 (개발 중)
```bash
cd backend && npm install   # NestJS 서버
cd ../mobile && npm install # React Native 앱
```
각 프로젝트에 `.env` 파일 필요 (`.env.example` 참고).

## 📝 개발 상태

- [x] 운영 모놀리식(legacy) — **라이브 서비스 중**
- [x] 재작성 프로젝트 초기 스캐폴드
- [ ] NestJS 백엔드 구현
- [ ] React Native 앱 UI/UX
- [ ] E2EE (Signal Protocol) 구현
- [ ] WebRTC 영상통화 (재작성본)
- [ ] 재작성본 배포 및 마이그레이션

## 📄 라이선스

MIT License

## 👥 기여자

- [@okneo31](https://github.com/okneo31)

---

**⚠️ 주의**: 재작성 버전(backend/, mobile/)은 개발 중입니다. 프로덕션 사용 전 보안 감사를 받으세요.
운영 중인 서비스는 `legacy/` 버전입니다.
