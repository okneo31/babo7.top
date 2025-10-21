// User Types
export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  publicKey: string;
  identityKey: string;
  createdAt: string;
  lastSeen?: string;
  isOnline: boolean;
}

// Message Types
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  encryptedContent: string; // E2EE encrypted message
  messageType: 'text' | 'image' | 'video' | 'file' | 'audio';
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isDeleted?: boolean;
  expiresAt?: string; // For disappearing messages
}

// Decrypted Message (local only)
export interface DecryptedMessage extends Omit<Message, 'encryptedContent'> {
  content: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileUrl?: string;
    thumbnailUrl?: string;
  };
}

// Conversation Types
export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participants: string[]; // User IDs
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  // Group specific
  groupName?: string;
  groupAvatar?: string;
  adminIds?: string[];
}

// Encryption Keys
export interface KeyBundle {
  identityKey: string;
  signedPreKey: {
    keyId: number;
    publicKey: string;
    signature: string;
  };
  oneTimePreKeys: {
    keyId: number;
    publicKey: string;
  }[];
}

// WebRTC Call Types
export interface Call {
  id: string;
  callerId: string;
  recipientId: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'ongoing' | 'ended' | 'missed' | 'declined';
  startedAt?: string;
  endedAt?: string;
  duration?: number;
}

// Authentication
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Redux Store Types
export interface RootState {
  auth: AuthState;
  conversations: {
    list: Conversation[];
    loading: boolean;
  };
  messages: {
    [conversationId: string]: DecryptedMessage[];
  };
  users: {
    [userId: string]: User;
  };
  calls: {
    activeCall: Call | null;
    callHistory: Call[];
  };
}
