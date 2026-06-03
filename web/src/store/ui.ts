// UI 스토어 (zustand). 현재 방, 모바일 사이드바 토글, 답장 컴포저 상태 등.

import { create } from 'zustand';
import type { Room, ReplyRef } from '@babotalk/shared';

export type SidebarTab = 'rooms' | 'friends';

interface UiState {
  tab: SidebarTab;
  setTab: (tab: SidebarTab) => void;

  // 현재 선택된 방
  currentRoom: Room | null;
  setCurrentRoom: (room: Room | null) => void;

  // 모바일: 채팅 화면 표시 여부 (true면 사이드바 숨김)
  mobileChatOpen: boolean;
  openMobileChat: () => void;
  closeMobileChat: () => void;

  // 답장 대상 (#3)
  replyTarget: ReplyRef | null;
  setReplyTarget: (r: ReplyRef | null) => void;

  // 사라지는 메시지 만료초 (#9), 0 = 끔
  expireSeconds: number;
  setExpireSeconds: (s: number) => void;
}

export const useUi = create<UiState>((set) => ({
  tab: 'rooms',
  setTab: (tab) => set({ tab }),

  currentRoom: null,
  setCurrentRoom: (room) => set({ currentRoom: room, replyTarget: null }),

  mobileChatOpen: false,
  openMobileChat: () => set({ mobileChatOpen: true }),
  closeMobileChat: () => set({ mobileChatOpen: false }),

  replyTarget: null,
  setReplyTarget: (replyTarget) => set({ replyTarget }),

  expireSeconds: 0,
  setExpireSeconds: (expireSeconds) => set({ expireSeconds }),
}));
