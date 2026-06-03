// 파일 업로드 (#6 음성 포함, #8 토큰 게이트 URL). 바디=raw 파일.

import type { UploadResult, FileMeta } from '@babotalk/shared';
import { getToken } from './client';

export interface UploadOptions {
  /** 음성/영상 길이(초) — #6 */
  duration?: number;
  /** MIME override (예: 'audio/webm') */
  type?: string;
}

/**
 * POST /files/upload?name=&type=&duration= (바디=파일 raw, 인증헤더 필요)
 * → { success, file:{ url, name, type, size, duration } }
 */
export async function uploadFile(file: Blob, name: string, opts: UploadOptions = {}): Promise<FileMeta> {
  const mime = opts.type || file.type || 'application/octet-stream';
  const params = new URLSearchParams();
  params.set('name', name);
  params.set('type', mime);
  if (opts.duration != null) params.set('duration', String(Math.round(opts.duration)));

  const headers: Record<string, string> = { 'Content-Type': mime };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/files/upload?${params.toString()}`, {
    method: 'POST',
    headers,
    body: file,
  });

  if (!res.ok) {
    if (res.status === 413) throw new Error('서버망의 용량 제한에 걸려 차단되었습니다.');
    throw new Error(`업로드 실패 (코드: ${res.status})`);
  }
  const data = (await res.json()) as UploadResult;
  if (!data.success || !data.file) {
    throw new Error(data.message || '업로드가 거부되었습니다.');
  }
  return data.file;
}
