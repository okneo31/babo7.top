/**
 * WebSocket Service - Real-time communication
 */

import { io, Socket } from 'socket.io-client';
import { Message } from '@types/index';

type EventCallback = (...args: any[]) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    const wsUrl = process.env.WS_URL || 'ws://localhost:3000';

    this.socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`Reconnection attempt ${attempt}`);
      this.reconnectAttempts = attempt;
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Max reconnection attempts reached');
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Event Listeners
  on(event: string, callback: EventCallback): void {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: EventCallback): void {
    this.socket?.off(event, callback);
  }

  // Emit Events
  emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }

  // Specific message events
  onNewMessage(callback: (message: Message) => void): void {
    this.on('message:new', callback);
  }

  onMessageDelivered(callback: (messageId: string) => void): void {
    this.on('message:delivered', callback);
  }

  onMessageRead(callback: (messageId: string) => void): void {
    this.on('message:read', callback);
  }

  onTyping(callback: (data: { userId: string; conversationId: string }) => void): void {
    this.on('user:typing', callback);
  }

  onUserOnline(callback: (userId: string) => void): void {
    this.on('user:online', callback);
  }

  onUserOffline(callback: (userId: string) => void): void {
    this.on('user:offline', callback);
  }

  // Emit typing indicator
  emitTyping(conversationId: string): void {
    this.emit('typing:start', { conversationId });
  }

  emitStopTyping(conversationId: string): void {
    this.emit('typing:stop', { conversationId });
  }

  // Call signaling
  onIncomingCall(callback: (data: any) => void): void {
    this.on('call:incoming', callback);
  }

  emitCallOffer(recipientId: string, offer: RTCSessionDescriptionInit): void {
    this.emit('call:offer', { recipientId, offer });
  }

  emitCallAnswer(callId: string, answer: RTCSessionDescriptionInit): void {
    this.emit('call:answer', { callId, answer });
  }

  emitIceCandidate(recipientId: string, candidate: RTCIceCandidateInit): void {
    this.emit('call:ice-candidate', { recipientId, candidate });
  }

  emitEndCall(callId: string): void {
    this.emit('call:end', { callId });
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export default new WebSocketService();
