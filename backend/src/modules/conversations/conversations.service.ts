import { Injectable, NotFoundException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { CreateConversationDto } from './dto/create-conversation.dto';

@Injectable()
export class ConversationsService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_KEY'),
    );
  }

  async create(userId: string, createConversationDto: CreateConversationDto) {
    const { participantIds, type, groupName, groupAvatar } = createConversationDto;

    // For direct conversations, check if one already exists
    if (type === 'direct' && participantIds.length === 1) {
      const existing = await this.findDirectConversation(userId, participantIds[0]);
      if (existing) return existing;
    }

    // Create conversation
    const { data: conversation, error: convError } = await this.supabase
      .from('conversations')
      .insert([
        {
          type,
          group_name: groupName,
          group_avatar: groupAvatar,
          created_by: userId,
        },
      ])
      .select()
      .single();

    if (convError) throw convError;

    // Add participants (including creator)
    const allParticipants = [...participantIds, userId];
    const { error: participantsError } = await this.supabase
      .from('conversation_participants')
      .insert(
        allParticipants.map((id) => ({
          conversation_id: conversation.id,
          user_id: id,
          role: id === userId ? 'admin' : 'member',
        })),
      );

    if (participantsError) throw participantsError;

    return this.findOne(conversation.id, userId);
  }

  async findAll(userId: string) {
    const { data, error } = await this.supabase
      .from('user_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findOne(id: string, userId: string) {
    // Check if user is participant
    const { data: participant } = await this.supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', id)
      .eq('user_id', userId)
      .is('left_at', null)
      .single();

    if (!participant) {
      throw new NotFoundException('Conversation not found');
    }

    // Get conversation details
    const { data: conversation, error } = await this.supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    // Get participants
    const { data: participants } = await this.supabase
      .from('conversation_participants')
      .select(`
        user_id,
        role,
        joined_at,
        users:user_id (
          id,
          username,
          display_name,
          avatar,
          is_online,
          last_seen
        )
      `)
      .eq('conversation_id', id)
      .is('left_at', null);

    return {
      ...conversation,
      participants: participants?.map((p) => ({
        ...p.users,
        role: p.role,
        joined_at: p.joined_at,
      })),
    };
  }

  async addParticipants(conversationId: string, userId: string, participantIds: string[]) {
    // Check if user is admin
    const { data: userParticipant } = await this.supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!userParticipant || userParticipant.role !== 'admin') {
      throw new Error('Only admins can add participants');
    }

    const { error } = await this.supabase
      .from('conversation_participants')
      .insert(
        participantIds.map((id) => ({
          conversation_id: conversationId,
          user_id: id,
          role: 'member',
        })),
      );

    if (error) throw error;
  }

  async leaveConversation(conversationId: string, userId: string) {
    const { error } = await this.supabase
      .from('conversation_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  private async findDirectConversation(userId1: string, userId2: string) {
    const { data } = await this.supabase
      .from('conversations')
      .select(`
        *,
        conversation_participants!inner(user_id)
      `)
      .eq('type', 'direct')
      .or(`user_id.eq.${userId1},user_id.eq.${userId2}`, {
        foreignTable: 'conversation_participants',
      });

    // Find conversation where both users are participants
    const directConv = data?.find((conv: any) => {
      const participants = conv.conversation_participants.map((p: any) => p.user_id);
      return participants.includes(userId1) && participants.includes(userId2) && participants.length === 2;
    });

    return directConv;
  }
}
