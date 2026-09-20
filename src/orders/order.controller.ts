import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { OrderService, type OrderDetails } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('update')
  async updateOrder(@Body() details: OrderDetails) {
    return this.orderService.updateDraft(details.userId, details);
  }

  @Get('active/:userId')
  async getActiveOrder(@Param('userId') userId: string) {
    return this.orderService.getActiveOrder(userId);
  }
}
