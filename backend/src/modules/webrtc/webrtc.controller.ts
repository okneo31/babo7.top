import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebrtcService } from './webrtc.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('WebRTC')
@Controller('webrtc')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebrtcController {
  constructor(private readonly webrtcService: WebrtcService) {}

  @Post('call')
  @ApiOperation({ summary: 'Initiate a call' })
  async createCall(
    @Request() req,
    @Body() body: { recipientId: string; callType: 'audio' | 'video'; conversationId?: string },
  ) {
    return this.webrtcService.createCall(
      req.user.id,
      body.recipientId,
      body.callType,
      body.conversationId,
    );
  }

  @Post('call/:id/answer')
  @ApiOperation({ summary: 'Answer a call' })
  async answerCall(@Request() req, @Param('id') id: string) {
    return this.webrtcService.answerCall(id, req.user.id);
  }

  @Post('call/:id/end')
  @ApiOperation({ summary: 'End a call' })
  async endCall(@Request() req, @Param('id') id: string) {
    return this.webrtcService.endCall(id, req.user.id);
  }

  @Post('call/:id/decline')
  @ApiOperation({ summary: 'Decline a call' })
  async declineCall(@Request() req, @Param('id') id: string) {
    return this.webrtcService.declineCall(id, req.user.id);
  }

  @Get('call-history')
  @ApiOperation({ summary: 'Get call history' })
  async getCallHistory(@Request() req, @Body() body: { limit?: number }) {
    return this.webrtcService.getCallHistory(req.user.id, body.limit);
  }

  @Get('turn-credentials')
  @ApiOperation({ summary: 'Get TURN server credentials' })
  async getTurnCredentials() {
    return this.webrtcService.getTurnCredentials();
  }
}
