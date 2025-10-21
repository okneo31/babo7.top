import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // userId -> socketId

  async handleConnection(client: Socket) {
    try {
      // TODO: Validate JWT from client.handshake.auth.token
      const userId = client.handshake.auth?.userId;

      if (userId) {
        this.connectedUsers.set(userId, client.id);

        // Broadcast user online status
        this.server.emit('user:online', { userId });

        console.log(`User ${userId} connected (${client.id})`);
      }
    } catch (error) {
      console.error('Connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const userId = client.handshake.auth?.userId;

      if (userId) {
        this.connectedUsers.delete(userId);

        // Broadcast user offline status
        this.server.emit('user:offline', { userId });

        console.log(`User ${userId} disconnected`);
      }
    } catch (error) {
      console.error('Disconnection error:', error);
    }
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ) {
    const { recipientId, encryptedContent, conversationId } = data;

    // Forward message to recipient if online
    const recipientSocketId = this.connectedUsers.get(recipientId);
    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit('message:new', {
        ...data,
        senderId: client.handshake.auth?.userId,
      });
    }

    // Emit delivery confirmation
    client.emit('message:delivered', { messageId: data.messageId });
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @MessageBody() data: { conversationId: string; recipientId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const recipientSocketId = this.connectedUsers.get(data.recipientId);
    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit('user:typing', {
        userId: client.handshake.auth?.userId,
        conversationId: data.conversationId,
      });
    }
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @MessageBody() data: { conversationId: string; recipientId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const recipientSocketId = this.connectedUsers.get(data.recipientId);
    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit('user:stop-typing', {
        userId: client.handshake.auth?.userId,
        conversationId: data.conversationId,
      });
    }
  }

  @SubscribeMessage('call:offer')
  handleCallOffer(
    @MessageBody() data: { recipientId: string; offer: any },
    @ConnectedSocket() client: Socket,
  ) {
    const recipientSocketId = this.connectedUsers.get(data.recipientId);
    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit('call:incoming', {
        callerId: client.handshake.auth?.userId,
        offer: data.offer,
      });
    }
  }

  @SubscribeMessage('call:answer')
  handleCallAnswer(
    @MessageBody() data: { callerId: string; answer: any },
    @ConnectedSocket() client: Socket,
  ) {
    const callerSocketId = this.connectedUsers.get(data.callerId);
    if (callerSocketId) {
      this.server.to(callerSocketId).emit('call:answer', {
        answer: data.answer,
      });
    }
  }

  @SubscribeMessage('call:ice-candidate')
  handleIceCandidate(
    @MessageBody() data: { recipientId: string; candidate: any },
    @ConnectedSocket() client: Socket,
  ) {
    const recipientSocketId = this.connectedUsers.get(data.recipientId);
    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit('call:ice-candidate', {
        candidate: data.candidate,
      });
    }
  }

  @SubscribeMessage('call:end')
  handleEndCall(
    @MessageBody() data: { recipientId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const recipientSocketId = this.connectedUsers.get(data.recipientId);
    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit('call:ended', {
        userId: client.handshake.auth?.userId,
      });
    }
  }

  // Helper method to check if user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }
}
