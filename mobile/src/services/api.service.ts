/**
 * API Service - HTTP requests to backend
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { User, Message, Conversation, KeyBundle } from '@types/index';

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.API_URL || 'http://localhost:3000',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      config => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      error => Promise.reject(error),
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          // Token expired - handle logout
          this.handleUnauthorized();
        }
        return Promise.reject(error);
      },
    );
  }

  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = null;
  }

  private handleUnauthorized(): void {
    // TODO: Trigger logout action
    console.log('Unauthorized - token expired');
  }

  // Authentication
  async register(username: string, password: string): Promise<{ user: User; token: string }> {
    const response = await this.client.post('/auth/register', {
      username,
      password,
    });
    return response.data;
  }

  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const response = await this.client.post('/auth/login', {
      username,
      password,
    });
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
    this.clearToken();
  }

  // User Management
  async getProfile(): Promise<User> {
    const response = await this.client.get('/users/me');
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await this.client.patch('/users/me', data);
    return response.data;
  }

  async searchUsers(query: string): Promise<User[]> {
    const response = await this.client.get('/users/search', {
      params: { q: query },
    });
    return response.data;
  }

  // Key Management
  async uploadKeyBundle(keyBundle: KeyBundle): Promise<void> {
    await this.client.post('/keys/bundle', keyBundle);
  }

  async getKeyBundle(userId: string): Promise<KeyBundle> {
    const response = await this.client.get(`/keys/bundle/${userId}`);
    return response.data;
  }

  // Conversations
  async getConversations(): Promise<Conversation[]> {
    const response = await this.client.get('/conversations');
    return response.data;
  }

  async createConversation(participantIds: string[]): Promise<Conversation> {
    const response = await this.client.post('/conversations', {
      participantIds,
    });
    return response.data;
  }

  async getConversation(id: string): Promise<Conversation> {
    const response = await this.client.get(`/conversations/${id}`);
    return response.data;
  }

  // Messages
  async getMessages(conversationId: string, limit = 50, before?: string): Promise<Message[]> {
    const response = await this.client.get(`/messages/${conversationId}`, {
      params: { limit, before },
    });
    return response.data;
  }

  async sendMessage(conversationId: string, encryptedContent: string, messageType: string): Promise<Message> {
    const response = await this.client.post('/messages', {
      conversationId,
      encryptedContent,
      messageType,
    });
    return response.data;
  }

  async markAsRead(messageIds: string[]): Promise<void> {
    await this.client.post('/messages/read', { messageIds });
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.client.delete(`/messages/${messageId}`);
  }

  // File Upload
  async uploadFile(file: any): Promise<{ url: string; thumbnailUrl?: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
}

export default new ApiService();
