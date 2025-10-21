import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkAsReadDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  messageIds: string[];
}
