import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RoomType } from '@babotalk/shared';

export type RoomDocument = HydratedDocument<Room>;

@Schema({ collection: 'rooms', timestamps: { createdAt: true, updatedAt: false } })
export class Room {
  @Prop({ required: true, unique: true })
  roomId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: RoomType.PUBLIC })
  type: RoomType;

  @Prop({ required: true })
  owner: string; // nickname

  @Prop({ type: [String], default: [] })
  members: string[]; // nickname[]
}

export const RoomSchema = SchemaFactory.createForClass(Room);
