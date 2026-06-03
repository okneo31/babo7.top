import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type {
  ApiResult,
  AuthResult,
  LoginDto,
  RegisterDto,
} from '@babotalk/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<ApiResult> {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthResult> {
    return this.auth.login(dto);
  }

  @Post('invite')
  @UseGuards(JwtAuthGuard)
  createInvite(): Promise<{ code: string }> {
    return this.auth.createInvite();
  }
}
