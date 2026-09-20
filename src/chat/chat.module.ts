import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { OrderModule } from '../orders/order.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [KnowledgeModule, OrderModule, MailModule],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
