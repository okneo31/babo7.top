import {
  Inject,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import type { RedisClientType } from 'redis';
import * as bcrypt from 'bcrypt';
import { nfc } from '@babotalk/shared';
import type { AuthResult, ApiResult, LoginDto, RegisterDto } from '@babotalk/shared';
import type { JwtPayload } from '@babotalk/shared';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { REDIS } from '../../common/redis.module';
import { UsersService } from '../users/users.service';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @Inject(REDIS) private readonly redis: RedisClientType,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly users: UsersService,
  ) {}

  // 부팅 시 관리자 계정을 env(ADMIN_PW) 기준으로 동기화한다.
  // - 비밀번호는 bcrypt 해시로만 저장(평문 저장 금지).
  // - env의 비번이 바뀌면 해시를 갱신 → 비번 변경이 재기동으로 반영됨.
  async onModuleInit(): Promise<void> {
    const adminId = this.config.get<string>('adminId')!;
    const adminPw = this.config.get<string>('adminPassword')!;
    const existing = await this.userModel.findOne({ username: adminId }).exec();
    if (!existing) {
      await this.userModel.create({
        username: adminId,
        password: await bcrypt.hash(adminPw, BCRYPT_ROUNDS),
        nickname: '관리자',
        isAdmin: true,
        friends: [],
      });
      return;
    }
    const samePw = await bcrypt.compare(adminPw, existing.password);
    if (!samePw || !existing.isAdmin) {
      existing.password = await bcrypt.hash(adminPw, BCRYPT_ROUNDS);
      existing.isAdmin = true;
      await existing.save();
    }
  }

  private sign(payload: JwtPayload): string {
    return this.jwt.sign(payload);
  }

  // POST /api/auth/register
  async register(dto: RegisterDto): Promise<ApiResult> {
    const username = nfc(dto.username);
    const nickname = nfc(dto.nickname);
    const inviteCode = dto.inviteCode;
    const password = dto.password;

    if (username.toLowerCase() === 'admin') {
      return { success: false, message: '관리자 ID 불가' };
    }

    // 마스터 초대코드는 env에 설정됐을 때만 유효(비어 있으면 백도어 없음).
    const masterInvite = this.config.get<string>('masterInvite') ?? '';
    const isMaster = masterInvite !== '' && inviteCode === masterInvite;
    const inviteValid = isMaster || (await this.redis.get(`invite:${inviteCode}`)) !== null;
    if (!inviteValid) {
      return { success: false, message: '초대코드 오류' };
    }

    const dup = await this.userModel.findOne({ username }).exec();
    if (dup) {
      return { success: false, message: '중복 ID' };
    }

    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.userModel.create({
      username,
      password: hashed,
      nickname,
      friends: [],
    });

    // master 초대코드가 아니면 일회용 초대코드 소모.
    if (!isMaster) {
      await this.redis.del(`invite:${inviteCode}`);
    }

    return { success: true };
  }

  // POST /api/auth/login — 관리자 포함 모든 계정이 DB의 bcrypt 해시로 검증된다(평문 비교 없음).
  async login(dto: LoginDto): Promise<AuthResult> {
    const username = nfc(dto.username);
    const password = dto.password;

    const user = await this.userModel.findOne({ username }).exec();
    if (!user) throw new UnauthorizedException('아이디 없음');
    if (user.isBanned) throw new UnauthorizedException('차단된 계정입니다');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('비밀번호 틀림');

    const payload: JwtPayload = {
      sub: String(user._id),
      username: user.username,
      nickname: user.nickname,
      isAdmin: !!user.isAdmin,
    };
    return { token: this.sign(payload), user: this.users.toPublicUser(user) };
  }

  // POST /api/auth/invite — 6자리 코드 생성, 24h 유효.
  async createInvite(): Promise<{ code: string }> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await this.redis.set(`invite:${code}`, 'valid', { EX: 86400 });
    return { code };
  }
}
