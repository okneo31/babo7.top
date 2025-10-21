# Babo7 Secure Messenger

보안 중심의 모바일 메신저 애플리케이션 (영상통화 지원)

## 🔒 핵심 보안 기능

- **End-to-End 암호화 (E2EE)**: Signal Protocol 기반
- **완전 순방향 비밀성 (Perfect Forward Secrecy)**
- **안전한 키 교환**: X3DH (Extended Triple Diffie-Hellman)
- **메시지 자동 삭제** (선택 사항)
- **스크린샷 방지**
- **생체 인증 지원**

## 🚀 주요 기능

- 1:1 채팅 (E2EE)
- 그룹 채팅 (E2EE)
- 영상/음성 통화 (WebRTC + DTLS-SRTP)
- 파일 전송 (암호화)
- 읽음 확인
- 온라인 상태 표시
- 푸시 알림

## 🛠 기술 스택

### 모바일 (React Native)
- React Native
- TypeScript
- Redux Toolkit (상태 관리)
- React Navigation (라우팅)
- WebRTC (영상통화)
- react-native-fast-crypto (암호화)

### 백엔드 (Node.js)
- NestJS
- TypeScript
- Socket.io (실시간 통신)
- WebRTC Signaling Server
- JWT 인증

### 데이터베이스 & 인프라
- Supabase (PostgreSQL + 실시간 구독)
- Redis (세션 & 캐싱)
- S3 호환 스토리지 (파일 저장)

## 📁 프로젝트 구조

```
babo7.top/
├── mobile/               # React Native 앱
│   ├── src/
│   │   ├── components/  # UI 컴포넌트
│   │   ├── screens/     # 화면
│   │   ├── services/    # API, 암호화 서비스
│   │   ├── store/       # Redux 상태 관리
│   │   ├── navigation/  # 라우팅
│   │   └── utils/       # 유틸리티
│   └── package.json
│
├── backend/             # NestJS 서버
│   ├── src/
│   │   ├── auth/       # 인증 모듈
│   │   ├── chat/       # 채팅 모듈
│   │   ├── users/      # 사용자 관리
│   │   ├── webrtc/     # 영상통화 시그널링
│   │   └── gateway/    # WebSocket 게이트웨이
│   └── package.json
│
├── docs/               # 문서
│   ├── SECURITY.md     # 보안 아키텍처
│   ├── API.md          # API 문서
│   └── SETUP.md        # 설치 가이드
│
└── README.md
```

## 🔐 보안 아키텍처

### Signal Protocol 구현
- **Identity Key**: 장기 공개/개인 키 쌍
- **Signed Prekey**: 주기적으로 갱신되는 서명된 키
- **One-time Prekeys**: 일회성 키 번들
- **Double Ratchet Algorithm**: 메시지 암호화

### 데이터 보호
- 클라이언트 측 메시지 암호화
- 서버는 암호화된 데이터만 저장/전달
- 키는 클라이언트에만 저장 (서버 접근 불가)

## 🚦 시작하기

### 필수 요구사항
- Node.js 18+
- React Native CLI
- Android Studio / Xcode
- Supabase 계정

### 설치
```bash
# 저장소 클론
git clone https://github.com/okneo31/babo7.top.git
cd babo7.top

# 백엔드 설치
cd backend
npm install

# 모바일 앱 설치
cd ../mobile
npm install
cd ios && pod install && cd ..
```

### 환경 변수 설정
각 프로젝트에 `.env` 파일 생성 필요 (예제는 `.env.example` 참고)

## 📝 개발 상태

- [x] 프로젝트 초기 설정
- [ ] 백엔드 서버 구축
- [ ] 모바일 앱 UI/UX
- [ ] E2EE 구현
- [ ] WebRTC 영상통화
- [ ] 배포 설정

## 📄 라이선스

MIT License

## 👥 기여자

- [@okneo31](https://github.com/okneo31)

---

**⚠️ 주의**: 이 프로젝트는 개발 중입니다. 프로덕션 환경에서 사용하기 전에 보안 감사를 받으세요.
