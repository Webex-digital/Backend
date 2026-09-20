import { Injectable, Logger } from '@nestjs/common';
import { MailService } from '../mail/mail.service';

export interface ContactRequestDto {
  name: string;
  email: string;
  projectDetails: string;
}

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly mailService: MailService) {}

  async handleContactRequest(dto: ContactRequestDto): Promise<void> {
    const { name, email, projectDetails } = dto;
    const adminEmail = process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL || 'producelabsandco@gmail.com';

    const subject = `New Contact Form Submission from ${name}`;
    const text = `You have a new contact request:
Name: ${name}
Email: ${email}
Project Details: ${projectDetails}`;

    const html = `
      <h3>New Contact Form Submission</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Project Details:</strong></p>
      <p>${projectDetails.replace(/\n/g, '<br>')}</p>
    `;

    await this.mailService.sendMail(adminEmail, subject, text, html);
    this.logger.log(`Contact request from ${email} processed and email sent to ${adminEmail}`);
  }
}
