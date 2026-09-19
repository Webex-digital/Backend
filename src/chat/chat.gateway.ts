import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { UseFilters } from '@nestjs/common';
import { GlobalExceptionFilter } from '../filters/global-exception.filter';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@UseFilters(GlobalExceptionFilter)
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  // In-memory map for socketId -> conversationId
  private socketToConversation = new Map<string, string>();

  constructor(private readonly chatService: ChatService) {}

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const { conversationId } = data;
    if (!conversationId) {
      throw new Error('conversationId is required');
    }

    this.socketToConversation.set(client.id, conversationId);
    await client.join(conversationId);

    return { event: 'joined', data: { conversationId } };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      conversationId: string;
      senderId: string;
      content: string;
      type: string;
    },
  ) {
    const { conversationId, senderId, content, type } = data;

    // Persist to DB first
    const message = await this.chatService.saveMessage({
      conversationId,
      senderId,
      content,
      type,
      embedding: [], // Default empty embedding for now
    });

    // Broadcast to the room
    this.server.to(conversationId).emit('new_message', message);

    return { status: 'sent', messageId: message.id };
  }
}
