import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ChatModule } from '../chat/chat.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ChatModule, AuthModule],
  controllers: [AdminController],
})
export class AdminModule {}
