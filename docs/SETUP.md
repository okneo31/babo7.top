# Babo7 Messenger 설치 가이드

## 목차
1. [필수 요구사항](#필수-요구사항)
2. [Supabase 설정](#supabase-설정)
3. [백엔드 서버 설정](#백엔드-서버-설정)
4. [모바일 앱 설정](#모바일-앱-설정)
5. [개발 환경 실행](#개발-환경-실행)
6. [배포](#배포)

## 필수 요구사항

### 개발 도구
- **Node.js**: 18.0.0 이상
- **npm** 또는 **yarn**
- **Git**

### 모바일 개발
- **React Native CLI**: `npm install -g react-native-cli`
- **iOS 개발** (macOS만 가능):
  - Xcode 14+ (App Store에서 설치)
  - CocoaPods: `sudo gem install cocoapods`
- **Android 개발**:
  - Android Studio
  - JDK 11 이상
  - Android SDK (API Level 31+)

### 계정
- **Supabase 계정** (무료): https://supabase.com

## Supabase 설정

### 1. 프로젝트 생성

1. [Supabase](https://supabase.com) 접속 후 로그인
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - **Name**: `babo7-messenger`
   - **Database Password**: 강력한 비밀번호 생성 (안전하게 보관!)
   - **Region**: 한국과 가까운 리전 선택 (예: `ap-northeast-2` Seoul)
4. "Create new project" 클릭 (약 2분 소요)

### 2. 데이터베이스 스키마 적용

1. Supabase 대시보드 → **SQL Editor** 메뉴
2. "New query" 클릭
3. `docs/DATABASE_SCHEMA.sql` 파일 내용 복사 & 붙여넣기
4. **Run** 버튼 클릭하여 실행
5. 성공 메시지 확인

### 3. API 키 복사

1. Supabase 대시보드 → **Settings** → **API**
2. 다음 정보 복사:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: 클라이언트에서 사용
   - **service_role key**: 백엔드 서버에서만 사용 (절대 공개 금지!)

### 4. Storage 설정 (파일 업로드용)

1. Supabase 대시보드 → **Storage**
2. "Create a new bucket" 클릭
3. 버킷 생성:
   - **Name**: `messages-media`
   - **Public**: false (비공개)
4. "Create bucket" 클릭

### 5. RLS (Row Level Security) 정책 확인

SQL 스키마에 이미 포함되어 있지만, 확인:

```sql
-- Supabase 대시보드 → Authentication → Policies에서 확인
-- 또는 SQL Editor에서:

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

## 백엔드 서버 설정

### 1. 저장소 클론

```bash
git clone https://github.com/okneo31/babo7.top.git
cd babo7.top
```

### 2. 백엔드 의존성 설치

```bash
cd backend
npm install
```

### 3. 환경 변수 설정

```bash
# .env.example 파일을 .env로 복사
cp .env.example .env

# .env 파일 편집
nano .env  # 또는 선호하는 에디터 사용
```

`.env` 파일 내용:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Supabase (위에서 복사한 정보 입력)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# JWT (랜덤 문자열 생성: openssl rand -base64 64)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Redis (로컬 개발 시)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:19000
```

### 4. Redis 설치 및 실행 (선택 사항, 캐싱용)

**macOS (Homebrew):**
```bash
brew install redis
brew services start redis
```

**Windows (WSL 또는 Docker 권장):**
```bash
docker run -d -p 6379:6379 redis:alpine
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
```

### 5. 서버 실행 테스트

```bash
npm run start:dev
```

성공 시 출력:
```
🚀 Server running on http://localhost:3000
📚 API Docs available at http://localhost:3000/api/docs
```

브라우저에서 http://localhost:3000/api/docs 접속 → Swagger API 문서 확인

## 모바일 앱 설정

### 1. 의존성 설치

```bash
cd ../mobile
npm install
```

### 2. iOS 의존성 설치 (macOS만)

```bash
cd ios
pod install
cd ..
```

### 3. 환경 변수 설정

```bash
cp .env.example .env
nano .env
```

`.env` 파일:

```env
# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Backend API
API_URL=http://localhost:3000
WS_URL=ws://localhost:3000

# WebRTC
STUN_SERVER=stun:stun.l.google.com:19302

# App Configuration
APP_NAME=Babo7
APP_VERSION=0.1.0
```

### 4. Android 설정

#### 4.1 Android SDK 경로 설정

`mobile/android/local.properties` 파일 생성:

```properties
sdk.dir=/Users/YourUsername/Library/Android/sdk  # macOS
# sdk.dir=C\:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk  # Windows
```

#### 4.2 권한 설정 확인

`mobile/android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

### 5. iOS 설정 (macOS만)

#### 5.1 권한 설정

`mobile/ios/babo7/Info.plist` 편집:

```xml
<key>NSCameraUsageDescription</key>
<string>영상통화를 위해 카메라 접근이 필요합니다</string>
<key>NSMicrophoneUsageDescription</key>
<string>음성/영상 통화를 위해 마이크 접근이 필요합니다</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>사진을 전송하기 위해 앨범 접근이 필요합니다</string>
<key>NSFaceIDUsageDescription</key>
<string>앱 보안을 위해 Face ID 사용이 필요합니다</string>
```

## 개발 환경 실행

### 전체 시스템 한 번에 실행

프로젝트 루트 디렉토리에서:

```bash
npm install  # 루트 package.json 의존성 설치
npm run dev  # 백엔드 + 모바일 동시 실행
```

### 개별 실행

#### 백엔드 서버
```bash
cd backend
npm run start:dev
```

#### React Native Metro 번들러
```bash
cd mobile
npm start
```

#### Android 앱 실행
```bash
# 터미널 1: Metro 번들러
cd mobile
npm start

# 터미널 2: Android 앱 빌드 & 실행
cd mobile
npm run android
```

**주의**: Android 에뮬레이터 또는 실제 디바이스가 연결되어 있어야 합니다.

```bash
# 디바이스 확인
adb devices
```

#### iOS 앱 실행 (macOS만)
```bash
# 터미널 1: Metro 번들러
cd mobile
npm start

# 터미널 2: iOS 앱 빌드 & 실행
cd mobile
npm run ios
```

또는 Xcode에서:
```bash
open mobile/ios/babo7.xcworkspace
```
→ 시뮬레이터 선택 → Run (⌘ + R)

## 문제 해결

### React Native 빌드 에러

**Android:**
```bash
cd mobile/android
./gradlew clean
cd ..
npm run android
```

**iOS:**
```bash
cd mobile/ios
pod deintegrate
pod install
cd ..
npm run ios
```

### Metro 캐시 초기화
```bash
cd mobile
npm start -- --reset-cache
```

### 포트 충돌 (8081 already in use)
```bash
# 프로세스 종료 (macOS/Linux)
lsof -ti:8081 | xargs kill -9

# Windows
netstat -ano | findstr :8081
taskkill /PID <PID번호> /F
```

### Supabase 연결 에러
- `.env` 파일의 `SUPABASE_URL` 및 `SUPABASE_ANON_KEY` 확인
- Supabase 프로젝트가 활성화되어 있는지 확인
- 방화벽/네트워크 설정 확인

## 테스트

### 백엔드 테스트
```bash
cd backend
npm run test
```

### 모바일 앱 테스트
```bash
cd mobile
npm run test
```

### E2E 테스트 (추후 구현)
```bash
npm run test:e2e
```

## 배포

### 백엔드 배포 (예: Heroku, Railway, Render)

**Railway 예시:**
```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 초기화
cd backend
railway init

# 환경 변수 설정
railway variables set SUPABASE_URL=your-url
railway variables set SUPABASE_SERVICE_KEY=your-key
# ... 기타 환경 변수

# 배포
railway up
```

### 모바일 앱 배포

#### Android (Google Play Store)

1. **서명 키 생성:**
```bash
cd mobile/android/app
keytool -genkeypair -v -storetype PKCS12 -keystore babo7-release.keystore -alias babo7-key -keyalg RSA -keysize 2048 -validity 10000
```

2. **gradle.properties 설정:**
```properties
MYAPP_RELEASE_STORE_FILE=babo7-release.keystore
MYAPP_RELEASE_KEY_ALIAS=babo7-key
MYAPP_RELEASE_STORE_PASSWORD=your-password
MYAPP_RELEASE_KEY_PASSWORD=your-password
```

3. **릴리즈 빌드:**
```bash
cd mobile/android
./gradlew bundleRelease
```

4. AAB 파일 생성: `android/app/build/outputs/bundle/release/app-release.aab`
5. Google Play Console에 업로드

#### iOS (App Store)

1. **Xcode 프로젝트 열기:**
```bash
open mobile/ios/babo7.xcworkspace
```

2. **서명 설정:**
   - Project → Signing & Capabilities
   - Team 선택
   - Bundle Identifier 설정 (고유해야 함)

3. **Archive 생성:**
   - Product → Archive
   - Distribute App → App Store Connect

4. App Store Connect에서 앱 제출

## 다음 단계

- [보안 아키텍처 문서](./SECURITY.md) 읽기
- [API 문서](http://localhost:3000/api/docs) 확인
- E2EE 구현 완료하기
- WebRTC 영상통화 테스트
- 푸시 알림 설정
- UI/UX 디자인 개선

## 지원

문제가 발생하면:
- GitHub Issues: https://github.com/okneo31/babo7.top/issues
- 문서 확인: `docs/` 폴더
- 로그 확인: 백엔드 서버 터미널 출력

---

**마지막 업데이트**: 2025-10-21
