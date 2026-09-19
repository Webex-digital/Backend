import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
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

  constructor(
    private readonly chatService: ChatService,
    private readonly knowledgeService: KnowledgeService,
  ) {}

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

    // 1. Persist to DB first
    const message = await this.chatService.saveMessage({
      conversationId,
      senderId,
      content,
      type,
      embedding: [], // Default empty embedding for now
    });

    // 2. Broadcast the original message
    this.server.to(conversationId).emit('new_message', message);

    // 3. AI FAQ Logic: If it looks like a question and sender is anonymous (or just always for FAQ)
    // For this task, we check if it's an FAQ-style request.
    // In a real app, we might have a specific 'ask_faq' event or a trigger word.
    // Here we'll just attempt to get an AI answer for every message if it's a text message.
    if (type === 'TEXT') {
      try {
        const aiAnswer = await this.knowledgeService.askQuestion(content);
        const aiMessage = {
          id: crypto.randomUUID(),
          conversationId,
          senderId: 'AI_ASSISTANT',
          content: aiAnswer,
          type: 'TEXT',
          createdAt: new Date(),
        };

        // Broadcast AI response to the room
        this.server.to(conversationId).emit('new_message', aiMessage);
      } catch (error) {
        console.error('AI FAQ Error:', error);
        // We don't broadcast the error to the user to keep the UX clean
      }
    }

    return { status: 'sent', messageId: message.id };
  }
}
