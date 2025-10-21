import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WebrtcService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL'),
      this.configService.get<string>('SUPABASE_SERVICE_KEY'),
    );
  }

  async createCall(
    callerId: string,
    recipientId: string,
    callType: 'audio' | 'video',
    conversationId?: string,
  ) {
    const { data, error } = await this.supabase
      .from('calls')
      .insert([
        {
          caller_id: callerId,
          conversation_id: conversationId,
          call_type: callType,
          status: 'ringing',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    // Add recipient as participant
    await this.supabase.from('call_participants').insert([
      { call_id: data.id, user_id: callerId },
      { call_id: data.id, user_id: recipientId },
    ]);

    return data;
  }

  async answerCall(callId: string, userId: string) {
    // Update participant's joined_at
    await this.supabase
      .from('call_participants')
      .update({ joined_at: new Date().toISOString() })
      .eq('call_id', callId)
      .eq('user_id', userId);

    // Update call status to ongoing
    const { data, error } = await this.supabase
      .from('calls')
      .update({
        status: 'ongoing',
        started_at: new Date().toISOString(),
      })
      .eq('id', callId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async endCall(callId: string, userId: string) {
    const now = new Date().toISOString();

    // Update participant's left_at
    await this.supabase
      .from('call_participants')
      .update({ left_at: now })
      .eq('call_id', callId)
      .eq('user_id', userId);

    // Get call details to calculate duration
    const { data: call } = await this.supabase
      .from('calls')
      .select('started_at, status')
      .eq('id', callId)
      .single();

    let duration = null;
    if (call?.started_at) {
      duration = Math.floor(
        (new Date(now).getTime() - new Date(call.started_at).getTime()) / 1000,
      );
    }

    // Update call status
    const { data, error } = await this.supabase
      .from('calls')
      .update({
        status: 'ended',
        ended_at: now,
        duration,
      })
      .eq('id', callId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async declineCall(callId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('calls')
      .update({
        status: 'declined',
        ended_at: new Date().toISOString(),
      })
      .eq('id', callId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCallHistory(userId: string, limit = 50) {
    const { data, error } = await this.supabase
      .from('calls')
      .select(`
        *,
        call_participants!inner(user_id)
      `)
      .eq('call_participants.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async getTurnCredentials() {
    // Generate temporary TURN credentials (valid for 24 hours)
    const username = `${Date.now()}:babo7user`;
    const password = this.configService.get<string>('TURN_PASSWORD') || 'temp-password';

    return {
      urls: [
        'stun:stun.l.google.com:19302',
        this.configService.get<string>('TURN_SERVER_URL') || 'turn:turn.example.com:3478',
      ],
      username,
      credential: password,
    };
  }
}
