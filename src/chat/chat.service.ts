import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AskChatDto } from './dto/ask-chat.dto';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async ask(data: AskChatDto) {
    const question = data.question.trim();
    const terms = question.split(/\s+/).filter((term) => term.length > 3).slice(0, 5);
    const article = terms.length
      ? await this.prisma.knowledgeBase.findFirst({
          where: {
            OR: terms.flatMap((term) => [
              { title: { contains: term, mode: 'insensitive' } },
              { content: { contains: term, mode: 'insensitive' } },
            ]),
          },
          orderBy: { updatedAt: 'desc' },
        })
      : null;

    return {
      mode: 'ai',
      answer:
        article?.content ||
        'I can help with services, project timelines, and next steps. For a tailored answer, you can talk directly with our team.',
      source: article ? { id: article.id, title: article.title } : null,
      canEscalate: true,
    };
  }

  async getActiveConversations() {
    return this.prisma.conversation.findMany({
      where: { status: 'OPEN' },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMessagesByConversation(conversationId: string) {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateConversationStatus(conversationId: string, status: string) {
    const normalized = status.trim().toUpperCase();
    if (!['OPEN', 'RESOLVED'].includes(normalized)) {
      throw new BadRequestException('Status must be OPEN or RESOLVED');
    }
    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { status: normalized },
    });
  }
}
