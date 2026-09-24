import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AskChatDto } from './dto/ask-chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('ask')
  @HttpCode(HttpStatus.OK)
  ask(@Body() body: AskChatDto) {
    return this.chatService.ask(body);
  }

  @Get('visitor/:sessionId/messages')
  getVisitorMessages(@Param('sessionId') sessionId: string) {
    return this.chatService.getVisitorMessages(sessionId);
  }
}
