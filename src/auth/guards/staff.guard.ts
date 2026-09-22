import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: { role?: string } }>();
    if (request.user?.role === 'ADMIN' || request.user?.role === 'STAFF') {
      return true;
    }
    throw new ForbiddenException('Staff access is required');
  }
}
