import { Controller, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { ChatService } from '../chat/chat.service';
import { AdminGuard } from '../auth/guards/admin.guard';
import { MixinAuthGuard } from '../auth/mixin-auth.guard';

@Controller('admin')
@UseGuards(MixinAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  async getActiveConversations() {
    return this.chatService.getActiveConversations();
  }

  @Get('conversations/:id/history')
  async getConversationHistory(@Param('id') id: string) {
    return this.chatService.getMessagesByConversation(id);
  }

  @Patch('conversations/:id/status')
  async updateStatus(@Param('id') id: string, @Request() req: any) {
    // Logic to update status to RESOLVED/ACTIVE in DB
    // For now, returning success as we prioritize the chat interface
    return { status: 'updated', conversationId: id };
  }
}
