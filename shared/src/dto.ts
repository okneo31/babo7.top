// REST 요청/응답 DTO 계약. 컨트롤러와 프런트 api 클라이언트가 공유한다.

import type { Friend, Message, Notice, PublicUser, Room, FileMeta, PushSubscription } from './models';

// ---- auth ----
export interface RegisterDto { inviteCode: string; username: string; password: string; nickname: string; }
export interface LoginDto { username: string; password: string; }
export interface AuthResult { token: string; user: PublicUser; }

// ---- users / 프로필 #7 ----
export interface UpdateProfileDto { nickname?: string; statusMessage?: string; avatarUrl?: string; }
export interface MeResult { user: PublicUser; }

// ---- friends ----
export interface AddFriendDto { friendId: string; } // username 또는 nickname
export interface DmRoomDto { friendNick: string; }
export interface DmRoomResult { roomId: string; roomName: string; }
export type FriendsResult = Friend[];

// ---- rooms ----
export interface CreateRoomDto {
  name: string;
  type: Room['type'];
  customId?: string;
  invitees?: string[]; // nickname[]
}
export interface CreateRoomResult { roomId: string; }
export interface JoinRoomDto { roomId: string; }
export interface JoinRoomResult { name: string; owner: string; }
export type RoomsResult = Room[];

// ---- messages ----
export interface SearchMessagesDto { roomId: string; keyword: string; }
export type MessagesResult = Message[];

// ---- files #6 #8 ----
export interface UploadResult { success: boolean; file?: FileMeta; message?: string; }

// ---- webrtc ICE ----
export interface IceServer { urls: string; username?: string; credential?: string; }
export interface IceConfigResult { iceServers: IceServer[]; }

// ---- push #1 ----
export interface VapidKeyResult { publicKey: string; }
export interface SubscribeDto { subscription: PushSubscription; }

// ---- admin #10 ----
export interface AdminStatsResult { userCount: number; totalRooms: number; onlineCount: number; }
export interface BroadcastDto { message: string; }
export interface AdminResetDto { confirm: 'CONFIRM_NUKE'; }
export interface AdminUserRow { username: string; nickname: string; isAdmin: boolean; createdAt: string; }
export interface AdminBanDto { username: string; }

// ---- 공통 응답 래퍼 ----
export interface Ok<T = unknown> { success: true; data?: T; message?: string; }
export interface Err { success: false; message: string; }
export type ApiResult<T = unknown> = Ok<T> | Err;

export type { Notice };
