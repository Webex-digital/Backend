import { Controller, Get, Query, Param } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('history/:id')
  async getChatHistory(
    @Param('id') conversationId: string,
    @Query('limit') limitStr: string,
    @Query('cursor') cursor?: string,
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : 20;
    return this.chatService.getMessagesByConversation(conversationId, limit, cursor);
  }
}
