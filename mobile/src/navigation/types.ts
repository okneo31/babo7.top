import { NavigatorScreenParams } from '@react-navigation/native';

// Auth Stack
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  Chats: undefined;
  Calls: undefined;
  Settings: undefined;
};

// Chat Stack
export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: { conversationId: string; recipientName: string };
  NewChat: undefined;
  GroupChat: { conversationId: string };
};

// Call Stack
export type CallStackParamList = {
  CallHistory: undefined;
  VideoCall: { callId: string; recipientId: string; recipientName: string };
  IncomingCall: { callId: string; callerName: string; callType: 'audio' | 'video' };
};

// Settings Stack
export type SettingsStackParamList = {
  SettingsList: undefined;
  Profile: undefined;
  Security: undefined;
  Notifications: undefined;
  Privacy: undefined;
};

// Root Navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
  ChatRoom: { conversationId: string; recipientName: string };
  VideoCall: { callId: string; recipientId: string; recipientName: string };
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
