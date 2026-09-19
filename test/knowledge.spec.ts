import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeService } from '../src/knowledge/knowledge.service';
import { VectorStore } from '../src/knowledge/vector.store';
import { PrismaService } from '../src/prisma.service';
import { PrismaModule } from '../src/prisma.module';

describe('KnowledgeService RAG', () => {
  let service: KnowledgeService;
  let vectorStore: VectorStore;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule],
      providers: [KnowledgeService, VectorStore, PrismaService],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);
    vectorStore = module.get<VectorStore>(VectorStore);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should ingest and retrieve knowledge (RAG flow)', async () => {
    const testTitle = 'Pricing Info';
    const testContent = 'Our premium pricing is $500 per month for enterprise customers.';

    // 1. Ingest knowledge
    await service.ingestKnowledge(testTitle, testContent);

    // 2. Ask a question related to the ingested knowledge
    const question = 'How much does the premium pricing cost?';
    const answer = await service.askQuestion(question);

    expect(answer).toContain('$500');
    expect(answer).toBeDefined();
  }, 30000);

  afterAll(async () => {
    await prisma.$executeRaw`DELETE FROM "KnowledgeBase"`;
  });
});
