import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { AdminModule } from './admin/admin.module';
import { OrderModule } from './orders/order.module';
import { MailModule } from './mail/mail.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [PrismaModule, AuthModule, ChatModule, AdminModule, OrderModule, MailModule, ContactModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
