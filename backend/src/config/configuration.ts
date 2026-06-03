// 중앙 설정. env가 없으면 legacy 호환 기본값을 쓴다(#10 하위호환).
export default () => ({
  port: parseInt(process.env.PORT || '80', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://mongo:27017/babotalk',
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379',
  jwt: {
    secret: process.env.JWT_SECRET || 'babo_secret_key_v1_final',
    expiresIn: process.env.JWT_EXPIRES || '7d',
  },
  admin: {
    id: process.env.ADMIN_ID || 'admin',
    pw: process.env.ADMIN_PW || 'babo1234',
  },
  masterInvite: process.env.MASTER_INVITE || 'MASTER_KEY',
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    tokenSecret: process.env.FILE_TOKEN_SECRET || 'change_me_file_secret',
    maxMb: parseInt(process.env.MAX_UPLOAD_MB || '200', 10),
  },
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@babo7.top',
  },
  corsOrigins: (process.env.CORS_ORIGINS || 'https://babo7.top,http://localhost:5173').split(','),
});
