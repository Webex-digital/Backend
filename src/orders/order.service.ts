import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrderState, OrderStateMachine } from './order.state-machine';
import { Prisma } from '@prisma/client';

export interface OrderDetails {
  userId: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  total: number;
}

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private stateMachine: OrderStateMachine,
  ) {}

  async updateDraft(userId: string, details: OrderDetails) {
    // First, find an existing order that is not CONFIRMED
    const existingOrder = await this.prisma.order.findFirst({
      where: {
        userId,
        status: { not: 'CONFIRMED' },
      },
      include: { items: true },
    });

    if (existingOrder) {
      // Update items: simplest is to replace them
      await this.prisma.orderItem.deleteMany({
        where: { orderId: existingOrder.id },
      });

      await this.prisma.orderItem.createMany({
        data: details.items.map(item => ({
          ...item,
          orderId: existingOrder.id,
        })),
      });

      await this.prisma.order.update({
        where: { id: existingOrder.id },
        data: {
          total: details.total,
          status: OrderState.GATHERING_INFO,
        },
      });

      return this.prisma.order.findUnique({
        where: { id: existingOrder.id },
        include: { items: true },
      });
    }

    // Create new order
    const order = await this.prisma.order.create({
      data: {
        userId,
        total: details.total,
        status: OrderState.GATHERING_INFO,
        items: {
          create: details.items,
        },
      },
      include: { items: true },
    });

    return order;
  }

  async transitionState(orderId: string, event: 'VALIDATE' | 'CONFIRM' | 'EDIT') {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const currentState = order.status as OrderState;
    const nextState = this.stateMachine.getNextState(currentState, event);

    if (!this.stateMachine.isValidTransition(currentState, nextState)) {
      throw new BadRequestException(`Invalid transition from ${currentState} to ${nextState}`);
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: nextState },
    });
  }

  async confirmOrder(orderId: string) {
    return this.transitionState(orderId, 'CONFIRM');
  }

  async getActiveOrder(userId: string) {
    return this.prisma.order.findFirst({
      where: {
        userId,
        status: { not: 'CONFIRMED' },
      },
      include: { items: true },
    });
  }
}
