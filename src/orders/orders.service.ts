import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private isStaff(user: AuthenticatedUser) {
    return user.role === 'ADMIN' || user.role === 'STAFF';
  }

  async list(user: AuthenticatedUser) {
    return this.prisma.order.findMany({
      where: this.isStaff(user) ? undefined : { userId: user.id },
      include: { items: true, user: { select: { id: true, email: true, fullName: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(user: AuthenticatedUser, data: CreateOrderDto) {
    const total = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return this.prisma.order.create({
      data: {
        userId: user.id,
        total,
        items: { create: data.items },
      },
      include: { items: true },
    });
  }

  async updateStatus(user: AuthenticatedUser, id: string, data: UpdateOrderStatusDto) {
    if (!this.isStaff(user)) throw new ForbiddenException('Staff access is required');
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    return this.prisma.order.update({ where: { id }, data: { status: data.status }, include: { items: true } });
  }
}
