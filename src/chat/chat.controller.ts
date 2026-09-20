import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { MixinAuthGuard } from '../auth/mixin-auth.guard.js';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @UseGuards(MixinAuthGuard)
  @Get('session')
  async getSession(@Request() req: any) {
    const userId = req.user.id;
    const conversation = await this.chatService.getLastConversation(userId);

    if (!conversation) {
      return { conversationId: null };
    }

    return { conversationId: conversation.id };
  }

  @UseGuards(MixinAuthGuard)
  @Get('history/:conversationId')
  async getHistory(@Param('conversationId') conversationId: string) {
    return this.chatService.getMessagesByConversation(conversationId);
  }
}
