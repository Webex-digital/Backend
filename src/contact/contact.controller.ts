import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ContactService } from './contact.service';
import type { ContactRequestDto } from './contact.service';

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async sendContact(@Body() dto: ContactRequestDto) {
    await this.contactService.handleContactRequest(dto);
    return {
      success: true,
      message: 'Your message has been sent successfully.',
    };
  }
}
