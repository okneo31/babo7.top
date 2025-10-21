import { IsString, IsNotEmpty, IsOptional, IsObject, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @ApiProperty({ description: 'E2EE encrypted message content' })
  @IsString()
  @IsNotEmpty()
  encryptedContent: string;

  @ApiProperty({ description: 'Signal protocol encryption metadata' })
  @IsObject()
  @IsNotEmpty()
  encryptionHeader: object;

  @ApiProperty({ enum: ['text', 'image', 'video', 'audio', 'file'] })
  @IsString()
  @IsNotEmpty()
  messageType: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  fileUrl?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  expiresAt?: string;
}
