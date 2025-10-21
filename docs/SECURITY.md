# 보안 아키텍처 문서

## 개요

Babo7 메신저는 Signal Protocol을 기반으로 한 End-to-End 암호화(E2EE)를 구현하여 최고 수준의 보안을 제공합니다.

## 핵심 보안 원칙

### 1. End-to-End 암호화 (E2EE)
- 모든 메시지는 송신자의 디바이스에서 암호화되어 수신자의 디바이스에서만 복호화됩니다
- 서버는 암호화된 데이터만 전달하며, 키에 접근할 수 없습니다
- 중간자 공격(MITM)으로부터 보호됩니다

### 2. 완전 순방향 비밀성 (Perfect Forward Secrecy)
- 각 메시지마다 고유한 암호화 키를 사용합니다
- 과거 통신 내용은 현재 키가 노출되어도 안전합니다
- Double Ratchet 알고리즘을 통해 지속적인 키 갱신을 수행합니다

### 3. 부인 방지 불가능성 (Deniability)
- 메시지 인증은 제공하되, 제3자에게 증명할 수 없도록 설계됩니다
- 법적 분쟁 시 사용자 보호를 강화합니다

## Signal Protocol 구현

### 키 계층 구조

```
Identity Key (장기)
    │
    ├─ Signed Prekey (중기, 주기적 갱신)
    │      │
    │      └─ Signature (Identity Key로 서명)
    │
    └─ One-time Prekeys (단기, 일회용)
           └─ 100개 번들로 생성/업로드
```

### 1. 키 종류

#### Identity Key Pair (IK)
- **용도**: 사용자의 장기 식별 키
- **알고리즘**: Curve25519
- **생명주기**: 계정 생성 시 한 번 생성, 영구 보관
- **저장 위치**: 클라이언트 (Keychain/Keystore)
- **서버 업로드**: Public Key만 업로드

#### Signed Prekey (SPK)
- **용도**: 중기 키, 세션 초기화에 사용
- **알고리즘**: Curve25519
- **생명주기**: 7일마다 자동 갱신
- **서명**: Identity Key로 서명하여 진위성 보장
- **저장 위치**: 클라이언트 + 서버(Public Key)

#### One-time Prekeys (OPK)
- **용도**: 일회용 키, 세션 초기화 시 소모
- **알고리즘**: Curve25519
- **생명주기**: 사용 후 즉시 삭제
- **개수**: 100개 번들로 생성
- **재생성**: 50개 이하로 감소 시 자동 재생성

### 2. X3DH 키 합의 (Extended Triple Diffie-Hellman)

새로운 대화 시작 시 수행되는 키 합의 프로토콜:

```
Alice (송신자)                                  Bob (수신자)
─────────────────────────────────────────────────────────────
IKa, EKa                                        IKb, SPKb, OPKb
                                                (서버에 등록)

1. 서버에서 Bob의 키 번들 다운로드
   ← GET /keys/bundle/bob

2. 4개의 DH 연산 수행:
   DH1 = DH(IKa, SPKb)
   DH2 = DH(EKa, IKb)
   DH3 = DH(EKa, SPKb)
   DH4 = DH(EKa, OPKb)  # OPK 있는 경우

3. 공유 비밀키 생성:
   SK = KDF(DH1 || DH2 || DH3 || DH4)

4. 초기 메시지 암호화 및 전송
   → POST /messages
```

**보안 속성:**
- **상호 인증**: Alice와 Bob 모두의 Identity Key 사용
- **순방향 비밀성**: Ephemeral Key(EK) 사용으로 달성
- **재생 공격 방지**: One-time Prekey는 한 번만 사용

### 3. Double Ratchet 알고리즘

세션이 설정된 후 메시지 교환 시 사용:

```
[송신]
1. DH Ratchet: 새로운 Ephemeral Key 생성
2. 체인 키 갱신: Chain Key → Message Key
3. 메시지 암호화: AES-256-CBC + HMAC-SHA256
4. 다음 Chain Key 생성

[수신]
1. DH Ratchet: 상대방의 새 Public Key로 갱신
2. 체인 키 동기화
3. Message Key 유도
4. 메시지 복호화 및 MAC 검증
```

**Ratchet 종류:**
- **Symmetric-key Ratchet**: 체인 키를 지속적으로 갱신
- **DH Ratchet**: 메시지 왕복 시 DH 키 교환 수행

**순방향 비밀성 보장:**
- 사용된 Message Key는 즉시 삭제
- 과거 메시지는 현재 키로 복호화 불가능

### 4. 메시지 암호화 형식

```json
{
  "version": 1,
  "senderId": "user_id",
  "recipientId": "recipient_id",
  "ciphertext": "base64_encoded_encrypted_data",
  "header": {
    "senderEphemeralKey": "base64_public_key",
    "previousChainLength": 10,
    "messageNumber": 5
  },
  "mac": "hmac_sha256_signature"
}
```

**암호화 과정:**
1. 평문 → AES-256-CBC 암호화
2. IV(Initialization Vector) 생성 (랜덤)
3. HMAC-SHA256로 메시지 인증 코드 생성
4. 헤더 + Ciphertext + MAC 조합

**복호화 과정:**
1. MAC 검증 (무결성 확인)
2. AES-256-CBC 복호화
3. 패딩 제거
4. 평문 반환

## 그룹 채팅 보안

### Sender Keys Protocol

1:1 채팅과 달리 그룹 채팅은 효율성을 위해 Sender Keys 사용:

```
Alice의 Sender Key
    │
    ├─ Group Message Key 1 → Bob, Charlie, David
    ├─ Group Message Key 2 → Bob, Charlie, David
    └─ Group Message Key 3 → Bob, Charlie, David

각 참가자는 Alice의 Sender Key로 메시지 복호화
```

**작동 방식:**
1. 그룹 참가자 추가 시: 모든 참가자와 개별 E2EE 세션 수행
2. Alice가 Sender Key 생성 및 암호화하여 각 참가자에게 전송
3. 그룹 메시지 전송 시: Sender Key로 한 번만 암호화
4. 참가자 제거 시: 새로운 Sender Key 생성 및 재배포

**보안 고려사항:**
- 참가자 추가/제거 시 키 재생성 필수
- 이전 참가자는 탈퇴 후 메시지 접근 불가

## 영상통화 보안 (WebRTC)

### DTLS-SRTP 암호화

```
WebRTC Connection
    │
    ├─ Signaling (Socket.io)
    │      └─ SDP Offer/Answer 교환 (E2EE)
    │
    ├─ DTLS Handshake
    │      └─ 인증서 교환 및 검증
    │
    └─ SRTP (Secure RTP)
           └─ 미디어 스트림 암호화
```

**보안 흐름:**
1. **Signaling 암호화**: WebSocket을 통한 SDP도 E2EE 적용
2. **DTLS Handshake**: TLS 1.2+ 기반 인증 및 키 교환
3. **Fingerprint 검증**: SDP의 인증서 지문을 대역 외 검증
4. **SRTP 암호화**: AES-128 기반 미디어 암호화

**TURN 서버 보안:**
- TLS를 통한 TURN 연결
- 인증 자격 증명은 JWT 기반 임시 토큰 사용
- IP 주소 노출 최소화

## 키 관리

### 키 생성
```typescript
// Identity Key 생성 (앱 설치 시 1회)
const identityKeyPair = await generateKeyPair();
await secureStore.set('identity_key', identityKeyPair);

// Signed Prekey 생성 (7일마다 자동)
const signedPreKey = await generateKeyPair();
const signature = await sign(signedPreKey.publicKey, identityKeyPair.privateKey);
await uploadSignedPreKey(signedPreKey.publicKey, signature);

// One-time Prekeys 생성 (50개 이하 시 자동)
const oneTimeKeys = await generateKeyPairs(100);
await uploadOneTimePreKeys(oneTimeKeys.map(k => k.publicKey));
```

### 키 저장
- **iOS**: Keychain (Secure Enclave)
- **Android**: Android Keystore System
- **암호화**: 디바이스 하드웨어 기반 암호화
- **백업 제외**: 클라우드 백업에서 키 제외

### 키 순환
```typescript
// 7일마다 자동 실행
async function rotateSignedPreKey() {
  const newSignedPreKey = await generateKeyPair();
  const signature = await sign(newSignedPreKey.publicKey, identityKey.privateKey);

  await uploadSignedPreKey(newSignedPreKey.publicKey, signature);

  // 이전 키는 30일간 유지 (진행 중인 세션 지원)
  setTimeout(() => deleteOldSignedPreKey(), 30 * 24 * 60 * 60 * 1000);
}
```

## 서버 보안

### 최소 권한 원칙
서버는 다음 정보만 저장/접근:
- 사용자 메타데이터 (ID, username, 프로필 사진)
- 암호화된 메시지 (복호화 불가능)
- Public Keys (Identity, Signed Prekey, One-time Prekeys)
- 메시지 전달 상태

서버가 **절대 접근할 수 없는 것:**
- Private Keys
- 복호화된 메시지 내용
- 암호화 키

### 데이터베이스 암호화
```sql
-- Supabase RLS (Row Level Security) 정책
CREATE POLICY "Users can only read own messages"
ON messages FOR SELECT
USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

CREATE POLICY "Users can only insert own messages"
ON messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);
```

### 메시지 보관 정책
- **암호화된 메시지**: 전달 후 30일간 보관 (미전달 메시지 대비)
- **읽은 메시지**: 선택적 자동 삭제 (사용자 설정)
- **미디어 파일**: 암호화 저장, 90일 후 자동 삭제

## 클라이언트 보안

### 로컬 데이터베이스 암호화
```typescript
// SQLCipher 사용 (SQLite 암호화)
const db = await SQLite.openDatabase({
  name: 'babo7.db',
  key: userDerivedKey, // PBKDF2로 생성
  encryption: 'aes-256-gcm'
});
```

### 메모리 보안
- 복호화된 메시지는 UI 렌더링 후 즉시 메모리에서 제거
- 민감한 데이터는 `SecureString` 타입 사용
- 백그라운드 진입 시 화면 블러 처리

### 생체 인증
```typescript
// Face ID / Touch ID / 지문 인식
const isAuthenticated = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Babo7 잠금 해제',
  fallbackLabel: 'PIN 입력',
  disableDeviceFallback: false,
});
```

### 스크린샷 방지
```typescript
// Android
<activity android:windowFlags="FLAG_SECURE" />

// iOS
NotificationCenter.default.addObserver(
  forName: UIApplication.userDidTakeScreenshotNotification,
  using: { _ in showWarning() }
)
```

## 공격 벡터 및 대응

### 1. 중간자 공격 (MITM)
**위협**: 네트워크 레벨에서 통신 가로채기
**대응**:
- TLS 1.3 사용 (Certificate Pinning)
- E2EE로 서버도 내용 확인 불가
- Public Key Fingerprint 대역 외 검증 (QR 코드)

### 2. 서버 침해
**위협**: 서버가 해킹당할 경우
**대응**:
- 서버는 암호화된 데이터만 보유
- Private Key는 클라이언트에만 존재
- 메시지 내용 복호화 불가능

### 3. 디바이스 분실/도난
**위협**: 물리적 디바이스 접근
**대응**:
- 생체 인증 필수
- 하드웨어 기반 키 저장 (Secure Enclave)
- 원격 로그아웃 및 키 무효화

### 4. 악성 코드/멀웨어
**위협**: 클라이언트 디바이스 감염
**대응**:
- 앱 코드 난독화
- 루팅/탈옥 디바이스 감지
- 런타임 무결성 검사

### 5. 재생 공격 (Replay Attack)
**위협**: 이전 메시지 재전송
**대응**:
- 메시지마다 고유 번호(Message Number)
- 중복 메시지 자동 거부
- 타임스탬프 검증

### 6. 키 노출
**위협**: Private Key 유출
**대응**:
- Perfect Forward Secrecy로 과거 메시지 보호
- 즉각적인 키 순환
- 타협 알림 및 새 세션 재설정

## 보안 감사 체크리스트

### 출시 전 필수 검토 사항
- [ ] 모든 통신 TLS 1.3 이상 사용
- [ ] Certificate Pinning 구현
- [ ] E2EE 암호화 정상 작동 검증
- [ ] 키 저장소 보안 테스트
- [ ] 메모리 누수 및 민감 데이터 잔존 확인
- [ ] 생체 인증 정상 작동
- [ ] 스크린샷 방지 기능 테스트
- [ ] 침투 테스트 (Penetration Testing)
- [ ] 코드 보안 감사 (Security Audit)
- [ ] OWASP Mobile Top 10 준수
- [ ] 개인정보 처리방침 및 약관 검토
- [ ] GDPR/개인정보보호법 준수

## 보안 업데이트 정책

### 취약점 대응
1. **발견 시**: 24시간 내 패치 개발
2. **긴급 업데이트**: 48시간 내 배포
3. **사용자 알림**: 푸시 알림 및 강제 업데이트

### 정기 보안 리뷰
- **월간**: 의존성 보안 업데이트
- **분기별**: 코드 보안 감사
- **연간**: 외부 보안 전문가 감사

## 참고 자료

- [Signal Protocol Specifications](https://signal.org/docs/)
- [The Double Ratchet Algorithm](https://signal.org/docs/specifications/doubleratchet/)
- [X3DH Key Agreement Protocol](https://signal.org/docs/specifications/x3dh/)
- [WebRTC Security Architecture](https://www.w3.org/TR/webrtc-security/)
- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)

---

**마지막 업데이트**: 2025-10-21
**문서 버전**: 1.0
