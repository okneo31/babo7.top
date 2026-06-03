# BaboTalk v2 — 아키텍처 & 계약(Contract)

> 이 문서는 **재빌드(v2)의 단일 진실 원천(Single Source of Truth)** 이다.
> 모든 모듈은 여기 정의된 데이터 모델 / REST / WebSocket 계약을 **그대로** 구현한다.
> 병렬 작업의 전제: 계약은 이 문서와 `shared/` 패키지에서만 바뀐다.

## 1. 목표

- 현재 운영 모놀리식(`legacy/`)의 **기능 100% 동등** + 신규 9개 기능(#1,3,4,5,6,7,8,9,10)
- **상용급 모듈 구조**: NestJS(DI/모듈) + React(컴포넌트) → 관리·업데이트·병렬개발 용이
- **무중단 전환**: v2 완성·검증 후 한 번에 컷오버. 기존 MongoDB 데이터 그대로 재사용.

## 2. 스택

| 레이어 | 기술 |
|--------|------|
| 백엔드 | NestJS + TypeScript, Mongoose(MongoDB), Socket.IO(Redis 어댑터), Passport-JWT |
| 프런트 | React + TypeScript + Vite, Zustand(상태), React Router, PWA(vite-plugin-pwa) |
| 공유 | `shared/` — 도메인 모델·DTO·소켓 이벤트 타입 (백/프 공용) |
| 실시간 | Socket.IO + `@socket.io/redis-adapter` (cluster 수평확장) |
| 미디어 | coturn(TURN). **로드맵: mediasoup SFU** 로 그룹 영상 확장 |
| 인프라 | Docker Compose: backend, web(nginx), mongo, redis, coturn, caddy |

## 3. 모노레포 구조

```
babo7.top/
├── shared/          # 공용 타입 계약 (백/프가 함께 import)
│   └── src/{models,enums,dto,events,index}.ts
├── backend/         # NestJS API + Socket.IO 게이트웨이
│   └── src/
│       ├── main.ts, app.module.ts
│       ├── config/                 # env 설정 (하위호환 기본값)
│       ├── database/schemas/       # Mongoose 스키마 (영속 계약)
│       ├── common/                 # 가드/필터/데코레이터/레이트리밋
│       └── modules/
│           ├── auth/      # 가입(초대코드)/로그인/JWT
│           ├── users/     # 프로필(아바타·상태메시지) #7
│           ├── friends/   # 친구 추가/목록/DM (승인제 #2는 제외)
│           ├── rooms/     # 공개/비밀/채널/DM 방
│           ├── messages/  # 송수신·수정·삭제·읽음·답장#3·반응#4·사라짐#9
│           ├── chat/      # Socket.IO 게이트웨이: 실시간·타이핑/온라인#5
│           ├── files/     # 업로드 + 접근토큰 보안 #8 · 음성 #6
│           ├── push/      # 웹푸시(VAPID) #1
│           ├── webrtc/    # 시그널링 (로드맵: SFU)
│           └── admin/     # 공지/통계/리셋/유저관리 #10
├── web/             # React + Vite PWA
│   └── src/{api,socket,store,screens,components,pwa}
├── legacy/          # 현재 운영 모놀리식 (롤백/참조용, 컷오버 전까지 라이브)
├── docker-compose.yml
└── ARCHITECTURE.md
```

## 4. 데이터 모델 (MongoDB, 기존 호환)

기존 컬렉션 이름/필드 유지 + 신규 필드는 **옵셔널**(기존 문서 호환).

- **users**: `username`(uniq, 로그인ID), `password`(bcrypt), `nickname`(표시명), `isAdmin`,
  `friends: string[]`(username), `avatarUrl?`#7, `statusMessage?`#7,
  `pushSubscriptions?: PushSubscription[]`#1, `createdAt`
- **rooms**: `roomId`(uniq), `name`, `type`(public|secret|channel|dm), `owner`(nickname),
  `members: string[]`(nickname), `createdAt`
- **messages**: `roomId`, `user`(nickname), `text`, `type`(text|file|image|video|voice)#6,
  `file?`{url,name,type,size,duration?}, `readBy: string[]`, `isEdited`, `isDeleted`,
  `replyTo?`{msgId,user,text}#3, `mentions?: string[]`#3,
  `reactions?: { [emoji]: string[] }`#4, `expireAt?: Date`#9(TTL 인덱스), `createdAt`
- **notices**: `text`, `createdAt`

> ⚠️ 모든 닉네임/아이디 입력은 입력 경계에서 **NFC 정규화**(legacy 버그 교훈). `shared`의 `nfc()` 사용.

## 5. REST 계약 (요약 — 상세는 `shared/src/dto.ts`)

base `/api`. 인증 필요 라우트는 `Authorization: Bearer <jwt>`.

| 메서드 | 경로 | 모듈 | 비고 |
|--------|------|------|------|
| POST | `/auth/register` | auth | 초대코드 검증 |
| POST | `/auth/login` | auth | → {token, user} |
| GET  | `/users/me` / PATCH `/users/me` | users | 프로필 조회/수정 #7 |
| POST | `/users/avatar` | users | 아바타 업로드 #7 |
| GET  | `/friends` / POST `/friends` | friends | 목록/추가 |
| POST | `/friends/dm` | friends | DM 방 생성/조회 |
| GET/POST | `/rooms` | rooms | 목록/생성 |
| POST | `/rooms/join` | rooms | 비밀방 입장 |
| GET  | `/rooms/:id/messages` | messages | 히스토리 |
| POST | `/messages/search` | messages | 방내 검색 |
| POST | `/files/upload` | files | 스트리밍 업로드 → 토큰 URL #8 |
| GET  | `/files/:id?token=` | files | 토큰 검증 후 서빙 #8 |
| POST | `/push/subscribe` | push | 웹푸시 구독 #1 |
| GET  | `/push/vapid-key` | push | 공개키 |
| POST | `/admin/*` | admin | 공지/통계/리셋/유저관리 #10 |

## 6. WebSocket 계약 (Socket.IO — 상세는 `shared/src/events.ts`)

**Client → Server**: `join_room`, `leave_room`, `send_message`, `edit_message`,
`delete_message`, `read_room`, `react_message`#4, `typing`#5, `presence_ping`#5,
WebRTC: `join_call`, `offer`, `answer`, `ice_candidate`, `nuke`, `set_timer`.

**Server → Client**: `message`, `message_updated`, `room_history`, `user_read`,
`reaction_updated`#4, `typing`#5, `presence`#5, `admin_notice`, `nuke_trigger`,
`timer_start`, WebRTC: `new_caller`, `offer`, `answer`, `ice_candidate`.

> 모든 페이로드는 `shared`의 타입으로 정적 검증된다.

## 7. 신규 기능 매핑

| # | 기능 | 담당 모듈 | 핵심 |
|---|------|-----------|------|
| 1 | 웹푸시 | push | VAPID, 오프라인 유저에 발송 |
| 3 | 답장+멘션 | messages, chat | `replyTo`/`mentions`, 멘션 알림 |
| 4 | 반응 | messages, chat | `reactions` 토글 → `reaction_updated` |
| 5 | 타이핑/온라인 | chat | Redis presence, `typing`/`presence` |
| 6 | 음성메시지 | files, messages | MediaRecorder → upload(type=voice,duration) |
| 7 | 프로필 | users | avatarUrl/statusMessage |
| 8 | 파일 접근 보안 | files | 비공개 저장 + 서명 토큰 URL |
| 9 | 사라지는 메시지 + 앱잠금 | messages(서버 TTL), web(클라 PIN/생체) |
| 10 | 관리자+하드닝 | admin, common | env 시크릿, 레이트리밋, 유저관리 |

## 8. 보안 하드닝 (#10)

- `JWT_SECRET`, 관리자 계정/비번을 **env**로 (없으면 legacy 기본값 — 하위호환).
- `@nestjs/throttler` 레이트리밋, helmet, CORS 화이트리스트.
- 파일은 공개 디렉터리 노출 금지 → 토큰 게이트(#8).
- bcrypt 라운드 유지, JWT 만료 정책 유지.

## 9. 로드맵 (이번 범위 밖, 다음 단계)

- **그룹 영상 SFU**: 현재 mesh(P2P 그물망)는 N명에 N² 스트림 → 소규모만 가능.
  **mediasoup** 기반 SFU 미디어 서버를 별도 서비스로 추가해 그룹 영상/대규모 동시통화를 지원.
  coturn은 TURN(릴레이)로 유지, SFU는 미디어 라우팅 담당. 백엔드에 `sfu` 모듈 + 시그널링 확장.
- **수평 확장**: Socket.IO Redis 어댑터 + Node cluster로 4 OCPU 풀활용 (텍스트 동시접속 수만 명).
- 친구 승인제/차단(#2)은 사용자 결정으로 이번 제외 — 추후 friends 모듈에 확장 여지.

## 10. 전환(컷오버) 전략

1. v2를 `backend/`+`web/`에 완성, 로컬·스테이징에서 검증.
2. 기존 MongoDB를 그대로 가리키게 설정(데이터 호환). 무손실.
3. `docker-compose.yml`을 v2 서비스로 교체, 한 번에 배포. `legacy/`는 롤백 보루로 보존.
