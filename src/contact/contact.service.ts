import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(data: CreateContactDto) {
    return this.prisma.contactRequest.create({
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
  }
}
