import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { mkdir, stat, unlink } from 'fs/promises';
import { extname, isAbsolute, join, resolve } from 'path';
import type { Readable } from 'stream';
import type { FileMeta } from '@babotalk/shared';

// #8 보안 업로드/서빙 · #6 음성.
// 핵심: 공개 디렉터리에 그대로 노출하지 않고, 디스크에는 fileId를 인코딩한
// 안전한 랜덤 파일명으로 저장한다. 서빙은 HMAC 서명 토큰(+만료) 검증을 통과해야만 허용.
//
// 파일명 규칙: `<fileId>.<ext>` — id 자체를 디스크 파일명에 인코딩하므로
// 별도 메타 저장소가 필요 없다(요구사항: 파일명 자체에 id 사용 권장).
//
// 하위호환 메모: legacy 업로드 파일(`/uploads/...`)은 신규 토큰 방식과 무관하게
// 계속 접근 가능해야 한다. 그 정적 서빙은 main.ts(부트스트랩)에서 처리한다고 가정하며,
// 본 서비스/컨트롤러는 신규 업로드에만 토큰 게이트를 적용한다.

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly uploadDir: string;
  private readonly tokenSecret: string;
  private readonly maxBytes: number;
  private ensured = false;

  constructor(private readonly config: ConfigService) {
    const dir = this.config.get<string>('upload.dir') ?? './uploads';
    this.uploadDir = isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
    // config가 FILE_TOKEN_SECRET을 필수로 검증하므로 하드코딩 기본값 없음.
    this.tokenSecret = this.config.get<string>('upload.tokenSecret')!;
    const maxMb = this.config.get<number>('upload.maxMb') ?? 200;
    this.maxBytes = maxMb * 1024 * 1024;
  }

  /** 업로드 디렉터리 보장(최초 1회). */
  private async ensureDir(): Promise<void> {
    if (this.ensured) return;
    await mkdir(this.uploadDir, { recursive: true });
    this.ensured = true;
  }

  /** 파일명에서 확장자만 안전하게 추출(경로 구분자/제어문자 제거). */
  private safeExt(name: string): string {
    const ext = extname(name || '').toLowerCase();
    // .jpg, .webm 등만 통과. 이상 입력은 .bin 처리.
    return /^\.[a-z0-9]{1,12}$/.test(ext) ? ext : '.bin';
  }

  /** fileId → 디스크 절대 경로. 경로 탈출(../) 방지. */
  private resolvePath(fileId: string, ext: string): string {
    const full = join(this.uploadDir, `${fileId}${ext}`);
    const normalized = resolve(full);
    if (!normalized.startsWith(resolve(this.uploadDir))) {
      throw new ForbiddenException('잘못된 경로');
    }
    return normalized;
  }

  /** HMAC 서명 토큰 생성: base64url(exp).base64url(hmac(fileId.exp)). */
  private signToken(fileId: string, expMs: number): string {
    const expB64 = Buffer.from(String(expMs)).toString('base64url');
    const mac = createHmac('sha256', this.tokenSecret)
      .update(`${fileId}.${expMs}`)
      .digest('base64url');
    return `${expB64}.${mac}`;
  }

  /** 토큰 검증: 형식/만료/HMAC. 실패 시 false. */
  verifyToken(fileId: string, token: string | undefined): boolean {
    if (!token) return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [expB64, mac] = parts;
    let expMs: number;
    try {
      expMs = parseInt(Buffer.from(expB64, 'base64url').toString('utf8'), 10);
    } catch {
      return false;
    }
    if (!Number.isFinite(expMs) || Date.now() > expMs) return false;

    const expected = createHmac('sha256', this.tokenSecret)
      .update(`${fileId}.${expMs}`)
      .digest('base64url');
    const a = Buffer.from(mac);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  /**
   * POST /files/upload — req(rawBody 스트림)을 디스크로 스트리밍 저장.
   * 메모리에 전체 적재하지 않고 req.pipe(writeStream)로 흘려보낸다.
   * 반환: 토큰이 포함된 FileMeta.
   */
  async saveStream(
    req: Readable,
    opts: {
      name: string;
      mime: string;
      type?: string;
      duration?: number;
      contentLength?: number;
    },
  ): Promise<FileMeta> {
    await this.ensureDir();

    if (opts.contentLength && opts.contentLength > this.maxBytes) {
      throw new PayloadTooLargeException('파일이 너무 큽니다');
    }

    const fileId = randomBytes(16).toString('hex');
    const ext = this.safeExt(opts.name);
    const destPath = this.resolvePath(fileId, ext);

    const size = await new Promise<number>((resolvePromise, reject) => {
      let written = 0;
      let aborted = false;
      const ws = createWriteStream(destPath);

      const fail = (err: Error) => {
        if (aborted) return;
        aborted = true;
        ws.destroy();
        // 부분 저장 파일 정리(실패는 무시).
        unlink(destPath).catch(() => undefined);
        reject(err);
      };

      req.on('data', (chunk: Buffer) => {
        written += chunk.length;
        if (written > this.maxBytes) {
          fail(new PayloadTooLargeException('파일이 너무 큽니다'));
        }
      });
      req.on('error', (err: Error) => fail(err));
      ws.on('error', (err: Error) => fail(err));
      ws.on('finish', () => {
        if (!aborted) resolvePromise(written);
      });

      req.pipe(ws);
    });

    const expMs = Date.now() + TOKEN_TTL_MS;
    const token = this.signToken(`${fileId}${ext}`, expMs);

    const meta: FileMeta = {
      // 전역 'api' prefix에서 제외된 경로(/files/...). 디스크 파일명(id+ext)을 그대로 식별자로 사용.
      url: `/files/${fileId}${ext}?token=${token}`,
      name: opts.name,
      type: opts.type || opts.mime || 'application/octet-stream',
      size,
    };
    if (typeof opts.duration === 'number' && Number.isFinite(opts.duration)) {
      meta.duration = opts.duration; // #6 음성/영상 길이(초)
    }
    return meta;
  }

  /**
   * GET /files/:id — 토큰 검증 후 디스크 파일 핸들 반환.
   * id 는 디스크 파일명(예: `<hex>.webm`). 가드 없음(토큰이 인증을 대신).
   */
  async openForServe(
    id: string,
    token: string | undefined,
  ): Promise<{ stream: Readable; size: number; mime: string }> {
    // id 형식 검증: <32hex>.<ext> 만 허용(경로 탈출/임의 파일 접근 차단).
    if (!/^[a-f0-9]{32}\.[a-z0-9]{1,12}$/.test(id)) {
      throw new ForbiddenException('잘못된 파일 식별자');
    }
    if (!this.verifyToken(id, token)) {
      throw new ForbiddenException('유효하지 않은 토큰');
    }

    const ext = this.safeExt(id);
    const fileId = id.slice(0, id.length - ext.length);
    const fullPath = this.resolvePath(fileId, ext);

    let info: { size: number };
    try {
      const s = await stat(fullPath);
      if (!s.isFile()) throw new Error('not a file');
      info = { size: s.size };
    } catch {
      throw new NotFoundException('파일을 찾을 수 없습니다');
    }

    return {
      stream: createReadStream(fullPath),
      size: info.size,
      mime: this.mimeForExt(ext),
    };
  }

  /** 확장자 → 적절한 Content-Type 추정(서빙용). */
  private mimeForExt(ext: string): string {
    const map: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.ogg': 'audio/ogg',
      '.wav': 'audio/wav',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain; charset=utf-8',
    };
    return map[ext] ?? 'application/octet-stream';
  }

  /** 잘못된 업로드 요청 검증 헬퍼(컨트롤러에서 호출). */
  requireName(name: unknown): string {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new BadRequestException('파일 이름(name)이 필요합니다');
    }
    return name;
  }
}
