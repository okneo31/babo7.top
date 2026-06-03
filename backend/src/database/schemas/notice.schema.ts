import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NoticeDocument = HydratedDocument<Notice>;

@Schema({ collection: 'notices', timestamps: { createdAt: true, updatedAt: false } })
export class Notice {
  @Prop({ required: true })
  text: string;
}

export const NoticeSchema = SchemaFactory.createForClass(Notice);
