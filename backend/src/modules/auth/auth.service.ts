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
import type {
  AuthResult,
  ApiResult,
  LoginDto,
  PublicUser,
  RegisterDto,
} from '@babotalk/shared';
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

  // 부팅 시 admin 유저가 없으면 생성(legacy 호환).
  async onModuleInit(): Promise<void> {
    const adminId = this.config.get<string>('admin.id') ?? 'admin';
    const adminPw = this.config.get<string>('admin.pw') ?? 'babo1234';
    const exists = await this.userModel.findOne({ username: adminId }).exec();
    if (!exists) {
      const hashed = await bcrypt.hash(adminPw, BCRYPT_ROUNDS);
      await this.userModel.create({
        username: adminId,
        password: hashed,
        nickname: '관리자',
        isAdmin: true,
        friends: [],
      });
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

    const masterInvite = this.config.get<string>('masterInvite') ?? 'MASTER_KEY';
    const isMaster = inviteCode === masterInvite;
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

  // POST /api/auth/login
  async login(dto: LoginDto): Promise<AuthResult> {
    const username = nfc(dto.username);
    const password = dto.password;

    const adminId = this.config.get<string>('admin.id') ?? 'admin';
    const adminPw = this.config.get<string>('admin.pw') ?? 'babo1234';

    // config 관리자 계정 일치 시 관리자 JWT 발급.
    if (username === adminId && password === adminPw) {
      const payload: JwtPayload = {
        sub: 'admin',
        username: 'admin',
        nickname: '관리자',
        isAdmin: true,
      };
      const adminUser: PublicUser = {
        username: 'admin',
        nickname: '관리자',
        isAdmin: true,
      };
      return { token: this.sign(payload), user: adminUser };
    }

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
