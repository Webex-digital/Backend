import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getPrismaOptions } from './database-url';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super(getPrismaOptions());
  }

  async onModuleInit() {
    await this.$connect();
  }
}
