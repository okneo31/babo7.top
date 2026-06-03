# legacy — 현재 운영 중인 모놀리식 버전 (BaboTalk)

이 폴더는 **실제 babo7.top 도메인에서 운영 중인** 단일 파일 Express 모놀리식 애플리케이션의 스냅샷입니다.
(저장소 루트의 NestJS + React Native 재작성 프로젝트와는 별개의, 현재 라이브 코드입니다.)

## 구성

| 파일 | 설명 |
|------|------|
| `server.js` | Express + Socket.IO + Mongoose 단일 서버 (인증/방/메시지/친구/WebRTC 시그널링) |
| `public/index.html` | 프런트엔드 전체 (PWA, 채팅 UI) |
| `public/{icon.svg,manifest.json,manual.html}` | PWA 자산 |
| `package.json` | 런타임 의존성 |
| `docker-compose.yml` | app(node) + mongo + redis + caddy + coturn 구성 |
| `Caddyfile` | 리버스 프록시 / TLS |

## 배포 환경

- Oracle Cloud (VM.Standard.A1.Flex, Ubuntu), Docker Compose
- `babotalk-app-1` 컨테이너가 이 디렉터리를 `/app`으로 마운트하여 `node server.js` 실행

## 이번 변경 — 한글 닉네임 친구 추가 버그 수정 (유니코드 NFC 정규화)

**증상**: 친구 목록에서 닉네임/아이디를 정확히 입력해도 "존재하지 않는 아이디 또는 닉네임입니다"로 추가 실패.

**원인**: DB에는 한글이 **NFC(완성형)**로 저장되는데, iOS/macOS에서 한글을 입력하면 **NFD(조합형)**로 전송된다.
글자는 동일해 보여도 유니코드 코드포인트(바이트)가 달라 `User.findOne({ nickname })` 매칭이 실패했다.
(영문 아이디는 ASCII라 영향 없음 → "아이디는 되는데 닉네임만 안 됨"처럼 보이기도 함)

**수정**: 서버 입력 경계에서 신원/매칭 필드(`username`, `nickname`, `friendId`, `myNick` 등)를
`String.prototype.normalize('NFC')`로 통일. 기기(NFC/NFD)와 무관하게 일치하도록 함.
적용 핸들러: `register`, `login`, `friends`, `add-friend`, `dm-room`, `rooms`, `create-room`,
`join-room`, 소켓 `join_room` / `msg` / `read_msg` / `read_room`.

추가로 `add-friend`에 로그인 정보 누락 시 null 가드를 넣어 잘못된 세션에서 서버가 죽지 않도록 했다.
