import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateMessageDto } from './dto/create-message.dto';
import { MarkAsReadDto } from './dto/mark-as-read.dto';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Send a message' })
  async create(@Request() req, @Body() createMessageDto: CreateMessageDto) {
    return this.messagesService.create(req.user.id, createMessageDto);
  }

  @Get(':conversationId')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  async findByConversation(
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: number,
    @Query('before') before?: string,
  ) {
    return this.messagesService.findByConversation(
      conversationId,
      limit,
      before,
    );
  }

  @Post('read')
  @ApiOperation({ summary: 'Mark messages as read' })
  async markAsRead(@Request() req, @Body() markAsReadDto: MarkAsReadDto) {
    return this.messagesService.markAsRead(
      markAsReadDto.messageIds,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a message' })
  async delete(@Request() req, @Param('id') id: string) {
    return this.messagesService.delete(id, req.user.id);
  }
}
