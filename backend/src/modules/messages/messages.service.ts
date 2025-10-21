import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { CreateMessageDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_KEY'),
    );
  }

  async create(userId: string, createMessageDto: CreateMessageDto) {
    const { data, error } = await this.supabase
      .from('messages')
      .insert([
        {
          conversation_id: createMessageDto.conversationId,
          sender_id: userId,
          encrypted_content: createMessageDto.encryptedContent,
          encryption_header: createMessageDto.encryptionHeader,
          message_type: createMessageDto.messageType,
          file_url: createMessageDto.fileUrl,
          file_size: createMessageDto.fileSize,
          thumbnail_url: createMessageDto.thumbnailUrl,
          expires_at: createMessageDto.expiresAt,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Create message recipients for delivery tracking
    const { data: participants } = await this.supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', createMessageDto.conversationId)
      .neq('user_id', userId)
      .is('left_at', null);

    if (participants && participants.length > 0) {
      await this.supabase.from('message_recipients').insert(
        participants.map((p) => ({
          message_id: data.id,
          user_id: p.user_id,
        })),
      );
    }

    return data;
  }

  async findByConversation(
    conversationId: string,
    limit = 50,
    before?: string,
  ) {
    let query = this.supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.reverse(); // Return in chronological order
  }

  async markAsDelivered(messageId: string, userId: string) {
    const { error } = await this.supabase
      .from('message_recipients')
      .update({ delivered_at: new Date().toISOString() })
      .eq('message_id', messageId)
      .eq('user_id', userId);

    if (error) throw error;

    // Update message status if all recipients have received
    await this.updateMessageStatus(messageId);
  }

  async markAsRead(messageIds: string[], userId: string) {
    const { error } = await this.supabase
      .from('message_recipients')
      .update({ read_at: new Date().toISOString() })
      .in('message_id', messageIds)
      .eq('user_id', userId);

    if (error) throw error;

    // Update message status for each message
    for (const messageId of messageIds) {
      await this.updateMessageStatus(messageId);
    }

    // Reset unread count
    const { data: messages } = await this.supabase
      .from('messages')
      .select('conversation_id')
      .in('id', messageIds)
      .limit(1)
      .single();

    if (messages) {
      await this.supabase
        .from('conversation_participants')
        .update({ unread_count: 0 })
        .eq('conversation_id', messages.conversation_id)
        .eq('user_id', userId);
    }
  }

  async delete(messageId: string, userId: string) {
    // Soft delete - just mark as deleted
    const { error } = await this.supabase
      .from('messages')
      .update({
        is_deleted: true,
        encrypted_content: '',
        encryption_header: {},
      })
      .eq('id', messageId)
      .eq('sender_id', userId);

    if (error) throw error;
  }

  private async updateMessageStatus(messageId: string) {
    // Check if all recipients have read the message
    const { data: recipients } = await this.supabase
      .from('message_recipients')
      .select('delivered_at, read_at')
      .eq('message_id', messageId);

    if (!recipients || recipients.length === 0) return;

    const allDelivered = recipients.every((r) => r.delivered_at);
    const allRead = recipients.every((r) => r.read_at);

    let status = 'sent';
    if (allRead) {
      status = 'read';
    } else if (allDelivered) {
      status = 'delivered';
    }

    await this.supabase
      .from('messages')
      .update({ status })
      .eq('id', messageId);
  }
}
