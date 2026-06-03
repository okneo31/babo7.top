import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { PushSubscription } from '@babotalk/shared';

export type UserDocument = HydratedDocument<User>;

// 기존 'users' 컬렉션과 호환. 신규 필드는 옵셔널.
@Schema({ collection: 'users', timestamps: { createdAt: true, updatedAt: false } })
export class User {
  @Prop({ required: true, unique: true })
  username: string; // 로그인 ID

  @Prop({ required: true })
  password: string; // bcrypt

  @Prop({ required: true })
  nickname: string; // 표시명 (NFC 정규화 저장)

  @Prop({ default: false })
  isAdmin: boolean;

  @Prop({ type: [String], default: [] })
  friends: string[]; // username[]

  @Prop({ default: '' })
  avatarUrl: string; // #7

  @Prop({ default: '' })
  statusMessage: string; // #7

  @Prop({ type: Array, default: [] })
  pushSubscriptions: PushSubscription[]; // #1

  @Prop({ default: false })
  isBanned: boolean; // #10
}

export const UserSchema = SchemaFactory.createForClass(User);
