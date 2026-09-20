import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { OrderService } from '../orders/order.service';
import { UseFilters } from '@nestjs/common';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { MailService } from '../mail/mail.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@UseFilters(HttpExceptionFilter)
export class ChatGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // In-memory map for socketId -> conversationId
  private socketToConversation = new Map<string, string>();
  // In-memory map for socketId -> userId (for presence)
  private socketToUser = new Map<string, string>();

  constructor(
    private readonly chatService: ChatService,
    private readonly knowledgeService: KnowledgeService,
    private readonly orderService: OrderService,
    private readonly mailService: MailService,
  ) {}

  @SubscribeMessage('admin_reply')
  async handleAdminReply(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content: string; adminId: string },
  ) {
    const { conversationId, content, adminId } = data;

    // 1. Persist admin message to DB
    const message = await this.chatService.saveMessage({
      conversation: { connect: { id: conversationId } },
      senderId: adminId,
      content,
      type: 'TEXT',
      embedding: [],
    });

    // 2. Broadcast to the user in the room
    this.server.to(conversationId).emit('new_message', message);

    return { status: 'sent', messageId: message.id };
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string },
  ) {
    const { conversationId, userId } = data;
    if (!conversationId || !userId) {
      throw new Error('conversationId and userId are required');
    }

    this.socketToConversation.set(client.id, conversationId);
    this.socketToUser.set(client.id, userId);
    await client.join(conversationId);

    // Broadcast presence: online
    this.server.to(conversationId).emit('user_presence', {
      userId,
      status: 'online',
    });

    return { event: 'joined', data: { conversationId } };
  }

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string },
  ) {
    const { conversationId, userId } = data;
    this.server.to(conversationId).emit('user_typing', {
      userId,
      typing: true,
    });
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; userId: string },
  ) {
    const { conversationId, userId } = data;
    this.server.to(conversationId).emit('user_typing', {
      userId,
      typing: false,
    });
  }

  handleDisconnect(client: Socket) {
    const conversationId = this.socketToConversation.get(client.id);
    const userId = this.socketToUser.get(client.id);

    if (conversationId && userId) {
      // Broadcast presence: offline
      this.server.to(conversationId).emit('user_presence', {
        userId,
        status: 'offline',
      });
    }

    this.socketToConversation.delete(client.id);
    this.socketToUser.delete(client.id);
  }

  @SubscribeMessage('faq_message')
  async handleFaqMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string },
  ) {
    try {
      const result = await this.knowledgeService.askQuestion(data.text);

      if (result.requiresHuman) {
        // Notify team via Email
        this.mailService.sendMail(
          'producelabsandco@gmail.com',
          '🚨 Human Help Needed in Chat',
          `A user is asking a question that requires human intervention:\n\nQuestion: ${data.text}\n\nThey are waiting for a response in the chat box.`,
        ).catch(err => console.error('Admin notification failed', err));
      }

      return { answer: result.answer };
    } catch (error) {
      console.error('FAQ Error:', error);
      return { answer: 'I am sorry, I am having trouble accessing my knowledge base right now.' };
    }
  }

  @SubscribeMessage('order_message')
  async handleOrderMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { text: string },
  ) {
    try {
      const response = `I've noted that: "${data.text}". Could you please provide more details about your project requirements?`;
      return { answer: response };
    } catch (error) {
      console.error('Order Error:', error);
      return { answer: 'Something went wrong with the order processing. Please try again.' };
    }
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
      conversation: { connect: { id: conversationId } },
      senderId,
      content,
      type,
      embedding: [], // Default empty embedding for now
    });

    // 2. Broadcast the original message
    this.server.to(conversationId).emit('new_message', message);

    // 3. AI FAQ Logic & Order Extraction
    if (type === 'TEXT') {
      try {
        // Signal AI processing started
        this.server.to(conversationId).emit('system_alert', {
          type: 'AI_PROCESSING_START',
          message: 'AI is thinking...',
        });

        // Order Extraction Logic
        const orderExtraction = await this.extractOrderDetails(content, senderId);
        if (orderExtraction) {
          this.server.to(conversationId).emit('new_message', {
            id: crypto.randomUUID(),
            conversationId,
            senderId: 'AI_ASSISTANT',
            content: `I've updated your order details. You're looking for: ${orderExtraction.items.map(i => `${i.quantity}x ${i.productId}`).join(', ')}. Total: $${orderExtraction.total}. Is this correct?`,
            type: 'TEXT',
            createdAt: new Date(),
          });
        }

        // AI FAQ Logic
        const result = await this.knowledgeService.askQuestion(content);

        if (result.requiresHuman) {
          this.mailService.sendMail(
            'producelabsandco@gmail.com',
            '🚨 Human Help Needed in Chat',
            `A user is asking a question that requires human intervention:\n\nMessage: ${content}\n\nThey are waiting for a response in the chat box.`,
          ).catch(err => console.error('Admin notification failed', err));

          // Emit real-time alert to all connected admins
          this.server.emit('admin_notification', {
            type: 'HUMAN_REQUIRED',
            conversationId,
            userId: senderId,
            message: content,
            timestamp: new Date(),
          });
        }

        const aiMessage = {
          id: crypto.randomUUID(),
          conversationId,
          senderId: 'AI_ASSISTANT',
          content: result.answer,
          type: 'TEXT',
          createdAt: new Date(),
        };

        this.server.to(conversationId).emit('new_message', aiMessage);

        this.server.to(conversationId).emit('system_alert', {
          type: 'AI_PROCESSING_END',
          message: 'AI processing complete.',
        });
      } catch (error) {
        console.error('AI Order/FAQ Error:', error);
        this.server.to(conversationId).emit('system_alert', {
          type: 'AI_ERROR',
          message: 'Something went wrong with the AI. Please try again.',
        });
      }
    }

    return { status: 'sent', messageId: message.id };
  }

  @SubscribeMessage('confirm_order')
  async handleConfirmOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ) {
    const { orderId } = data;
    try {
      const confirmedOrder = await this.orderService.confirmOrder(orderId);

      client.emit('order_confirmed', {
        orderId: confirmedOrder.id,
        status: confirmedOrder.status,
      });

      this.server.emit('admin_notification', {
        type: 'ORDER_CONFIRMED',
        orderId: confirmedOrder.id,
        message: `Order ${confirmedOrder.id} has been confirmed.`,
      });

      return { status: 'success', orderId: confirmedOrder.id };
    } catch (error) {
      console.error('Confirm Order Error:', error);
      throw error;
    }
  }

  private async extractOrderDetails(content: string, userId: string) {
    if (content.toLowerCase().includes('order') && (content.toLowerCase().includes('want') || content.toLowerCase().includes('need'))) {
      const mockDetails = {
        userId,
        items: [
          { productId: 'PROD-123', quantity: 1, price: 100.0 },
        ],
        total: 100.0,
      };
      await this.orderService.updateDraft(userId, mockDetails);
      return mockDetails;
    }
    return null;
  }
}
