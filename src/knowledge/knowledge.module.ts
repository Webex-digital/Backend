import { Module } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { VectorStore } from './vector.store';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [KnowledgeService, VectorStore],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
