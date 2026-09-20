import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { MixinAuthGuard } from '../mixin-auth.guard';

@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('You do not have administrative privileges to access this resource.');
    }

    return true;
  }
}
