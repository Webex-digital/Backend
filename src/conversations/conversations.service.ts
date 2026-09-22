import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateConversationDto, CreateMessageDto } from './dto/conversation.dto';
import { AuthenticatedUser } from '../auth/current-user.decorator';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  private isStaff(user: AuthenticatedUser) {
    return user.role === 'ADMIN' || user.role === 'STAFF';
  }

  async create(user: AuthenticatedUser, data: CreateConversationDto) {
    return this.prisma.conversation.create({
      data: { userId: user.id, title: data.title?.trim() || 'New project conversation' },
      select: { id: true, title: true, status: true, createdAt: true, updatedAt: true },
    });
  }

  async list(user: AuthenticatedUser) {
    return this.prisma.conversation.findMany({
      where: this.isStaff(user) ? undefined : { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async get(user: AuthenticatedUser, id: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        messages: { orderBy: { createdAt: 'asc' } },
        files: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (!this.isStaff(user) && conversation.userId !== user.id) {
      throw new ForbiddenException('You cannot access this conversation');
    }
    return conversation;
  }

  async addMessage(user: AuthenticatedUser, id: string, data: CreateMessageDto) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (!this.isStaff(user) && conversation.userId !== user.id) {
      throw new ForbiddenException('You cannot message this conversation');
    }
    const message = await this.prisma.message.create({
      data: {
        conversationId: id,
        senderId: user.id,
        senderType: this.isStaff(user) ? 'STAFF' : 'USER',
        content: data.content.trim(),
        embedding: [],
      },
    });
    await this.prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
    return message;
  }
}
