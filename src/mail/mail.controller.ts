import { Controller, Post, Body } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('contact')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  async sendProposal(@Body() body: { name: string; email: string; details: string }) {
    try {
      await this.mailService.sendProposal(body);
      return { success: true, message: 'Proposal sent successfully!' };
    } catch (error) {
      console.error('Email Error:', error);
      throw new Error('Failed to send email. Please check server configuration.');
    }
  }
}
