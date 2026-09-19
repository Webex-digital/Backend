import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { OrderStateMachine } from './order.state-machine';

@Module({
  controllers: [OrderController],
  providers: [OrderService, OrderStateMachine],
  exports: [OrderService],
})
export class OrderModule {}
