import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ContactModule } from './contact/contact.module';
import { ChatModule } from './chat/chat.module';
import { ConversationsModule } from './conversations/conversations.module';
import { OrdersModule } from './orders/orders.module';
import { FilesModule } from './files/files.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [PrismaModule, AuthModule, ContactModule, ConversationsModule, ChatModule, OrdersModule, FilesModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
