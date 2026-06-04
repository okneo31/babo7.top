// 인증 스토어 (zustand). token + user, login/register/logout, localStorage 영속.
// 모든 신원 입력은 nfc() 적용 후 전송.

import { create } from 'zustand';
import { nfc } from '@babotalk/shared';
import type { PublicUser, RegisterDto, LoginDto } from '@babotalk/shared';
import { api, setToken } from '@/api/client';
import { connectSocket, disconnectSocket } from '@/socket/socket';

const LS_TOKEN = 'bt_token';
const LS_USER = 'bt_user';

function loadInitial(): { token: string | null; user: PublicUser | null } {
  try {
    const token = localStorage.getItem(LS_TOKEN);
    const rawUser = localStorage.getItem(LS_USER);
    const user = rawUser ? (JSON.parse(rawUser) as PublicUser) : null;
    // 토큰과 '유효한' user가 둘 다 있어야 로그인 상태로 본다.
    // (token만 있고 user가 손상/누락이면 authed=true로 렌더하다 user.* 접근에서 크래시 → 빈화면)
    if (token && user && typeof user.username === 'string' && typeof user.nickname === 'string') {
      setToken(token);
      return { token, user };
    }
  } catch {
    /* 손상된 저장값 → 아래에서 초기화 */
  }
  try {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER);
  } catch {
    /* noop */
  }
  setToken(null);
  return { token: null, user: null };
}

interface AuthState {
  token: string | null;
  user: PublicUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (inviteCode: string, username: string, password: string, nickname: string) => Promise<void>;
  logout: () => void;
  setUser: (user: PublicUser) => void;
  /** 부팅 시 소켓 연결 + 프로필 동기화. */
  hydrate: () => void;
}

const initial = loadInitial();

function persist(token: string | null, user: PublicUser | null): void {
  if (token) localStorage.setItem(LS_TOKEN, token);
  else localStorage.removeItem(LS_TOKEN);
  if (user) localStorage.setItem(LS_USER, JSON.stringify(user));
  else localStorage.removeItem(LS_USER);
}

export const useAuth = create<AuthState>((set, get) => ({
  token: initial.token,
  user: initial.user,
  loading: false,

  login: async (username, password) => {
    set({ loading: true });
    try {
      const dto: LoginDto = { username: nfc(username.trim()), password };
      const res = await api.login(dto);
      setToken(res.token);
      persist(res.token, res.user);
      connectSocket(res.token);
      set({ token: res.token, user: res.user, loading: false });
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  register: async (inviteCode, username, password, nickname) => {
    set({ loading: true });
    try {
      const dto: RegisterDto = {
        inviteCode: inviteCode.trim(),
        username: nfc(username.trim()),
        password,
        nickname: nfc(nickname.trim()),
      };
      const res = await api.register(dto);
      set({ loading: false });
      if (res && res.success === false) throw new Error(res.message || '가입 실패');
    } catch (e) {
      set({ loading: false });
      throw e;
    }
  },

  logout: () => {
    disconnectSocket();
    setToken(null);
    persist(null, null);
    // 앱 잠금 외 다른 캐시는 유지(즐겨찾기 등). 핵심 자격만 제거.
    set({ token: null, user: null });
  },

  setUser: (user) => {
    persist(get().token, user);
    set({ user });
  },

  hydrate: () => {
    const { token } = get();
    if (token) {
      setToken(token);
      connectSocket(token);
      // 백그라운드 프로필 동기화 (실패해도 무시)
      api
        .me()
        .then((r) => {
          // 응답 모양이 예상과 다르면(예: {user} 누락) 기존 user를 지우지 않는다.
          if (r && r.user && typeof r.user.username === 'string') {
            persist(get().token, r.user);
            set({ user: r.user });
          }
        })
        .catch(() => {
          /* 토큰 만료 시 그대로 둠 — 401 응답이 오면 화면에서 재로그인 유도 */
        });
    }
  },
}));
