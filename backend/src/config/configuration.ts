// 중앙 설정. 시크릿은 하드코딩하지 않고 env에서만 읽으며, 없으면 부팅을 막는다.
// (운영 안전: 약한 기본 시크릿으로 조용히 뜨는 것을 방지)

function required(key: string): string {
  const v = process.env[key];
  if (!v || !v.trim()) {
    throw new Error(
      `[config] 필수 환경변수 ${key} 가 비어 있습니다. backend/.env 에 설정하세요. ` +
        `(시크릿은 소스에 하드코딩하지 않습니다)`,
    );
  }
  return v.trim();
}

export default () => ({
  // 운영 파라미터(비밀 아님): 기본값 허용
  port: parseInt(process.env.PORT || '80', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://mongo:27017/babotalk',
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379',
  adminId: process.env.ADMIN_ID || 'admin', // 관리자 로그인 ID(비밀 아님)
  // 마스터 초대코드: env에 있을 때만 활성. 비어 있으면 백도어 없음.
  masterInvite: (process.env.MASTER_INVITE || '').trim(),

  // 시크릿(필수): 없으면 throw
  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES || '7d',
  },
  // 관리자 비밀번호는 env로만 주입 → 부팅 시 bcrypt 해시로 DB 동기화(평문 저장 안 함)
  adminPassword: required('ADMIN_PW'),

  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    tokenSecret: required('FILE_TOKEN_SECRET'),
    maxMb: parseInt(process.env.MAX_UPLOAD_MB || '200', 10),
  },
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@babo7.top',
  },
  corsOrigins: (process.env.CORS_ORIGINS || 'https://babo7.top,http://localhost:5173').split(','),

  // WebRTC ICE — 코드에 자격 하드코딩 금지. env로만 주입하고 런타임에 클라이언트에 내려준다.
  stun: process.env.STUN_URL || 'stun:stun.l.google.com:19302',
  turn: {
    url: process.env.TURN_URL || '', // 예: turn:babo7.top:3478
    // use-auth-secret 모드(권장): 시간제한 HMAC 자격을 서버가 생성. 코드/번들에 비밀 없음.
    secret: process.env.TURN_SECRET || '',
    ttlSec: parseInt(process.env.TURN_TTL || '86400', 10),
    // 정적 자격 모드(레거시 coturn 호환): secret이 없을 때 사용.
    username: process.env.TURN_USERNAME || '',
    password: process.env.TURN_PASSWORD || '',
  },
});
