import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ChatModule],
  controllers: [AdminController],
})
export class AdminModule {}
