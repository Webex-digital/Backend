import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async createRequest(data: CreateContactDto) {
    const request = await this.prisma.contactRequest.create({
      data: {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        projectDetails: data.projectDetails.trim(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        projectDetails: true,
        status: true,
        createdAt: true,
      },
    });

    try {
      await this.mailService.sendProposal({
        name: request.name,
        email: request.email,
        details: request.projectDetails,
      });
      return { ...request, emailSent: true };
    } catch (error) {
      this.logger.error('Contact request saved, but notification email failed', error);
      return { ...request, emailSent: false };
    }
  }
}
