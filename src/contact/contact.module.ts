import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
