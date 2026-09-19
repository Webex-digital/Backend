import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { OrderModule } from './orders/order.module';

@Module({
  imports: [PrismaModule, AuthModule, ChatModule, OrderModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
