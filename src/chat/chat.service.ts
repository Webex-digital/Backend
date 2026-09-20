import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';
import { OrderService } from '../orders/order.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private orderService: OrderService,
  ) {}

  async saveMessage(data: Prisma.MessageCreateInput) {
    return this.prisma.message.create({
      data,
    });
  }

  async getLastConversation(userId: string) {
    return this.prisma.conversation.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getActiveConversations() {
    return this.prisma.conversation.findMany({
      where: {
        ...({
          status: { not: 'RESOLVED' },
        } as any),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: { email: true, fullName: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async getMessagesByConversation(conversationId: string, limit: number = 20, cursor?: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        id: cursor ? { lt: cursor } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      messages: messages.reverse(),
      nextCursor: messages.length === limit ? messages[0].id : null,
    };
  }
}
