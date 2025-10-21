import { IsString, IsArray, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ enum: ['direct', 'group'] })
  @IsEnum(['direct', 'group'])
  type: 'direct' | 'group';

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  participantIds: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  groupName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  groupAvatar?: string;
}
