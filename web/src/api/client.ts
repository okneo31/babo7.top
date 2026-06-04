// fetch 래퍼. 토큰 자동 첨부 + shared DTO 타입. 모든 REST 호출은 여기로 통한다.

import type {
  AuthResult,
  RegisterDto,
  LoginDto,
  MeResult,
  UpdateProfileDto,
  FriendsResult,
  AddFriendDto,
  DmRoomDto,
  DmRoomResult,
  RoomsResult,
  CreateRoomDto,
  CreateRoomResult,
  JoinRoomDto,
  JoinRoomResult,
  MessagesResult,
  SearchMessagesDto,
  IceConfigResult,
  VapidKeyResult,
  SubscribeDto,
  AdminStatsResult,
  BroadcastDto,
  AdminResetDto,
  AdminUserRow,
  AdminBanDto,
} from '@babotalk/shared';

let authToken: string | null = null;

/** 소켓/파일 업로드 등에서 현재 토큰을 읽기 위한 게터. */
export function getToken(): string | null {
  return authToken;
}

/** auth 스토어가 로그인/로그아웃 시 호출. */
export function setToken(token: string | null): void {
  authToken = token;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : null) || `요청 실패 (코드: ${res.status})`;
    throw new ApiError(msg, res.status);
  }
  return data as T;
}

const post = <T>(path: string, body?: unknown): Promise<T> =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
const get = <T>(path: string): Promise<T> => request<T>(path, { method: 'GET' });
const patch = <T>(path: string, body?: unknown): Promise<T> =>
  request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  // ---- auth ----
  register: (dto: RegisterDto) => post<{ success?: boolean; message?: string }>('/api/auth/register', dto),
  login: (dto: LoginDto) => post<AuthResult>('/api/auth/login', dto),
  invite: () => post<{ code: string }>('/api/auth/invite'),

  // ---- users #7 ----
  me: () => get<MeResult>('/api/users/me'),
  updateProfile: (dto: UpdateProfileDto) => patch<MeResult>('/api/users/me', dto),

  // ---- friends ----
  friends: () => get<FriendsResult>('/api/friends'),
  addFriend: (dto: AddFriendDto) => post<{ success?: boolean; message?: string }>('/api/friends', dto),
  dmRoom: (dto: DmRoomDto) => post<DmRoomResult>('/api/friends/dm', dto),

  // ---- rooms ----
  rooms: () => get<RoomsResult>('/api/rooms'),
  createRoom: (dto: CreateRoomDto) => post<CreateRoomResult>('/api/rooms', dto),
  joinRoom: (dto: JoinRoomDto) => post<JoinRoomResult>('/api/rooms/join', dto),

  // ---- messages ----
  messages: (roomId: string) => get<MessagesResult>(`/api/messages/${encodeURIComponent(roomId)}`),
  searchMessages: (dto: SearchMessagesDto) => post<MessagesResult>('/api/messages/search', dto),

  // ---- webrtc ICE ----
  ice: () => get<IceConfigResult>('/api/webrtc/ice'),

  // ---- push #1 ----
  vapidKey: () => get<VapidKeyResult>('/api/push/vapid-key'),
  subscribePush: (dto: SubscribeDto) => post<{ success?: boolean }>('/api/push/subscribe', dto),

  // ---- admin #10 ----
  adminStats: () => post<AdminStatsResult>('/api/admin/stats'),
  adminBroadcast: (dto: BroadcastDto) => post<{ success?: boolean }>('/api/admin/broadcast', dto),
  adminReset: (dto: AdminResetDto) => post<{ success?: boolean }>('/api/admin/reset', dto),
  adminUsers: () => post<AdminUserRow[]>('/api/admin/users'),
  adminBan: (dto: AdminBanDto) => post<{ success?: boolean }>('/api/admin/ban', dto),
};
