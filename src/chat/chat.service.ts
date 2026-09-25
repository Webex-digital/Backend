import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AskChatDto } from './dto/ask-chat.dto';
import { KnowledgeService } from '../knowledge/knowledge.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly knowledge: KnowledgeService,
  ) {}

  async ask(data: AskChatDto) {
    const question = data.question.trim();
    const isGreeting = /^(hi|hello|hey|hii|howdy|greetings|namaste|good morning|good afternoon|good evening|good day)\b/i.test(question);
    const visitor = await this.getOrCreateVisitor(data);
    const conversation = await this.prisma.conversation.upsert({
      where: { id: visitor.conversationId || '' },
      create: { userId: visitor.userId, title: 'Website chat' },
      update: { status: 'OPEN', updatedAt: new Date() },
    });

    const recentStaffMessage = await this.prisma.message.findFirst({
      where: { conversationId: conversation.id, senderType: 'STAFF' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    const recentAiMessage = await this.prisma.message.findFirst({
      where: { conversationId: conversation.id, senderType: 'AI' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    const humanTakeover = Boolean(recentStaffMessage && (!recentAiMessage || recentStaffMessage.createdAt > recentAiMessage.createdAt));

    await this.prisma.message.create({
      data: { conversationId: conversation.id, senderId: visitor.userId, senderType: 'USER', content: question, embedding: [] },
    });

    if (humanTakeover && !isGreeting) {
      return {
        mode: 'team',
        answer: 'Your message has been sent to our team. A WEBEX specialist will reply here shortly.',
        canEscalate: false,
        conversationId: conversation.id,
      };
    }

    const faqAnswer = this.knowledge.answerFaq(question);
    const terms = question.split(/\s+/).filter((term) => term.length > 3).slice(0, 5);
    const article = terms.length
      ? await this.prisma.knowledgeBase.findFirst({
          where: { OR: terms.flatMap((term) => [
            { title: { contains: term, mode: 'insensitive' } },
            { content: { contains: term, mode: 'insensitive' } },
          ]) },
          orderBy: { updatedAt: 'desc' },
        })
      : null;
    const answer = faqAnswer || article?.content || 'I can help with services, project timelines, and next steps. For a tailored answer, you can talk directly with our team.';

    await this.prisma.message.create({
      data: { conversationId: conversation.id, senderId: visitor.userId, senderType: 'AI', content: answer, embedding: [] },
    });

    return {
      mode: 'ai',
      answer,
      source: faqAnswer ? { id: 'professional-faq', title: 'WEBEX Professional FAQ' } : article ? { id: article.id, title: article.title } : null,
      canEscalate: true,
      conversationId: conversation.id,
    };
  }

  private async getOrCreateVisitor(data: AskChatDto) {
    const sessionId = data.sessionId?.trim() || 'anonymous';
    const email = data.email?.trim().toLowerCase() || `guest-${sessionId}@guest.webex.local`;
    const user = await this.prisma.user.upsert({
      where: { email },
      create: { email, fullName: data.name?.trim() || 'Website visitor' },
      update: data.name?.trim() ? { fullName: data.name.trim() } : {},
    });
    const existing = await this.prisma.conversation.findFirst({
      where: { userId: user.id, status: 'OPEN' },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
    return { userId: user.id, conversationId: existing?.id };
  }

  async getVisitorConversation(sessionId: string) {
    const email = `guest-${sessionId.trim()}@guest.webex.local`;
    return this.prisma.conversation.findFirst({
      where: { user: { email }, status: 'OPEN' },
      orderBy: { updatedAt: 'desc' },
      select: { id: true },
    });
  }

  async getVisitorMessages(sessionId: string) {
    const conversation = await this.getVisitorConversation(sessionId);
    if (!conversation) return [];
    return this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, senderType: true, content: true, createdAt: true },
    });
  }

  async getActiveConversations() {
    return this.prisma.conversation.findMany({
      where: { status: 'OPEN' },
      include: { user: { select: { id: true, email: true, fullName: true } }, messages: { orderBy: { createdAt: 'desc' }, take: 50 } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getMessagesByConversation(conversationId: string) {
    return this.prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' } });
  }

  async updateConversationStatus(conversationId: string, status: string) {
    const normalized = status.trim().toUpperCase();
    if (!['OPEN', 'RESOLVED'].includes(normalized)) throw new BadRequestException('Status must be OPEN or RESOLVED');
    return this.prisma.conversation.update({ where: { id: conversationId }, data: { status: normalized } });
  }
}
