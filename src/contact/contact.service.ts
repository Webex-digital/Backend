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

    void this.mailService.sendProposal({
      name: request.name,
      email: request.email,
      details: request.projectDetails,
    }).then(() => {
      this.logger.log(`Proposal notification sent for contact request ${request.id}`);
    }).catch((error) => {
      this.logger.error(`Contact request ${request.id} saved, but notification email failed`, error);
    });

    return { ...request, emailQueued: true };
  }
}
