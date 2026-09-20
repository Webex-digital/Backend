import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderStateMachine } from './order.state-machine';
import { MailModule } from '../mail/mail.module';

@Module({
  controllers: [OrderController],
  providers: [OrderService, OrderStateMachine],
  imports: [MailModule],
  exports: [OrderService],
})
export class OrderModule {}
