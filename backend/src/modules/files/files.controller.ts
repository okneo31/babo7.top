import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { UploadResult } from '@babotalk/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { FilesService } from './files.service';

// @Controller('files') — main.ts의 전역 'api' prefix에서 `files/(.*)`가 제외되어
// 최종 경로는 `/files/...`. 업로드는 인증 필요(JwtAuthGuard), 서빙은 토큰 게이트.
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  /**
   * POST /files/upload?name=...&type=...&duration=...
   * body는 raw 바이너리 스트림(req). rawBody 적재 금지 — req를 그대로 디스크로 흘려보낸다.
   */
  @Post('upload')
  @UseGuards(JwtAuthGuard)
  async upload(
    @Req() req: Request,
    @Query('name') name: string,
    @Query('type') type?: string,
    @Query('duration') duration?: string,
  ): Promise<UploadResult> {
    try {
      const safeName = this.files.requireName(name);
      const mime = req.headers['content-type'] || 'application/octet-stream';
      const lenHeader = req.headers['content-length'];
      const contentLength = lenHeader ? parseInt(lenHeader, 10) : undefined;
      const durationNum =
        duration !== undefined && duration !== '' ? Number(duration) : undefined;

      const file = await this.files.saveStream(req, {
        name: safeName,
        mime,
        type,
        duration: durationNum,
        contentLength,
      });
      return { success: true, file };
    } catch (err) {
      const message = err instanceof Error ? err.message : '업로드 실패';
      return { success: false, message };
    }
  }

  /**
   * GET /files/:id?token=...
   * 가드 없음 — HMAC + 만료 토큰이 인증을 대신한다. 검증 실패 시 403.
   */
  @Get(':id')
  async serve(
    @Param('id') id: string,
    @Query('token') token: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    // 토큰/식별자 검증과 파일 존재 확인은 서비스가 단일 책임으로 수행(실패 시 403/404 throw).
    const { stream, size, mime } = await this.files.openForServe(id, token);
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', size);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).end();
      else res.end();
    });
    stream.pipe(res);
  }
}
