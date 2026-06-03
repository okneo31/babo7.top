import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MessageType } from '@babotalk/shared';
import type { FileMeta, ReplyRef } from '@babotalk/shared';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ collection: 'messages', timestamps: { createdAt: true, updatedAt: false } })
export class Message {
  @Prop({ required: true, index: true })
  roomId: string;

  @Prop({ required: true })
  user: string; // nickname

  @Prop({ default: '' })
  text: string;

  @Prop({ default: MessageType.TEXT })
  type: MessageType;

  @Prop({ type: Object, default: null })
  file: FileMeta | null;

  @Prop({ type: [String], default: [] })
  readBy: string[];

  @Prop({ default: false })
  isEdited: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Object, default: null })
  replyTo: ReplyRef | null; // #3

  @Prop({ type: [String], default: [] })
  mentions: string[]; // #3 nickname[]

  // #4 반응: emoji -> nickname[]. Mongoose Map으로 동적 키 저장.
  @Prop({ type: Map, of: [String], default: {} })
  reactions: Map<string, string[]>;

  // #9 사라지는 메시지: TTL 인덱스(expireAfterSeconds:0) → expireAt 시각에 자동 삭제.
  @Prop({ type: Date, default: null, index: { expireAfterSeconds: 0 } })
  expireAt: Date | null;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
