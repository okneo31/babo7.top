import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { AddParticipantsDto } from './dto/add-participants.dto';

@ApiTags('Conversations')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new conversation' })
  async create(@Request() req, @Body() createConversationDto: CreateConversationDto) {
    return this.conversationsService.create(req.user.id, createConversationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user conversations' })
  async findAll(@Request() req) {
    return this.conversationsService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get conversation details' })
  async findOne(@Request() req, @Param('id') id: string) {
    return this.conversationsService.findOne(id, req.user.id);
  }

  @Post(':id/participants')
  @ApiOperation({ summary: 'Add participants to group conversation' })
  async addParticipants(
    @Request() req,
    @Param('id') id: string,
    @Body() addParticipantsDto: AddParticipantsDto,
  ) {
    return this.conversationsService.addParticipants(
      id,
      req.user.id,
      addParticipantsDto.participantIds,
    );
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave a conversation' })
  async leave(@Request() req, @Param('id') id: string) {
    return this.conversationsService.leaveConversation(id, req.user.id);
  }
}
