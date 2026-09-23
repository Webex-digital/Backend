import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage,
  WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ConversationsService } from '../conversations/conversations.service';
import { ChatService } from './chat.service';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import type { CreateMessageDto } from '../conversations/dto/conversation.dto';

@Injectable()
@WebSocketGateway({ namespace: '/chat', cors: { origin: true, credentials: true } })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly conversationsService: ConversationsService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(socket: Socket) {
    const token = this.extractToken(socket);
    if (!token) {
      const sessionId = String(socket.handshake.auth?.sessionId || '').trim();
      if (!sessionId) return socket.disconnect();
      socket.data.visitorSessionId = sessionId;
      const conversation = await this.chatService.getVisitorConversation(sessionId);
      if (conversation) await socket.join(`conversation:${conversation.id}`);
      return;
    }
    try {
      const payload = this.jwtService.verify<{ sub: string; email: string; role: string }>(token);
      socket.data.user = { id: payload.sub, email: payload.email, fullName: null, role: payload.role } satisfies AuthenticatedUser;
    } catch {
      socket.disconnect();
    }
  }

  @SubscribeMessage('conversation:join')
  async joinConversation(@ConnectedSocket() socket: Socket, @MessageBody() body: { conversationId: string }) {
    if (socket.data.visitorSessionId) {
      const conversation = await this.chatService.getVisitorConversation(socket.data.visitorSessionId);
      if (!conversation || conversation.id !== body.conversationId) return;
    }
    return socket.join(`conversation:${body.conversationId}`);
  }

  @SubscribeMessage('message:send')
  async sendMessage(@ConnectedSocket() socket: Socket, @MessageBody() body: { conversationId: string; message: CreateMessageDto }) {
    const user = socket.data.user as AuthenticatedUser;
    if (!user) return;
    const message = await this.conversationsService.addMessage(user, body.conversationId, body.message);
    this.server.to(`conversation:${body.conversationId}`).emit('message:new', message);
    return message;
  }

  private extractToken(socket: Socket) {
    const authToken = socket.handshake.auth?.token;
    const header = socket.handshake.headers.authorization;
    return authToken || (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
  }
}
