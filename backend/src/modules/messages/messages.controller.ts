import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { Message as MessageDTO, SearchMessagesDto } from '@babotalk/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  /** GET /api/messages/:roomId — 방 히스토리(최근 100개, 오래된 순). */
  @Get(':roomId')
  async history(@Param('roomId') roomId: string): Promise<MessageDTO[]> {
    return this.messages.getHistory(roomId, 100);
  }

  /** POST /api/messages/search — 방내 키워드 검색. */
  @Post('search')
  async search(@Body() dto: SearchMessagesDto): Promise<MessageDTO[]> {
    return this.messages.search(dto.roomId, dto.keyword);
  }
}
