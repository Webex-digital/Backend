import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class VectorStore {
  constructor(private readonly prisma: PrismaService) {}

  async saveEmbedding(title: string, content: string, embedding: number[]): Promise<void> {
    // pgvector requires vector type, we cast the array to string representation '[0.1, 0.2, ...]'
    const vectorString = `[${embedding.join(',')}]`;

    await this.prisma.$executeRaw`
      INSERT INTO "KnowledgeBase" (id, title, content, embedding, "updatedAt")
      VALUES (gen_random_uuid(), ${title}, ${content}, ${vectorString}::vector, NOW())
    `;
  }

  async searchSimilar(queryEmbedding: number[], limit = 5): Promise<{ content: string; score: number }[]> {
    const vectorString = `[${queryEmbedding.join(',')}]`;

    // Using cosine distance operator <=>
    // Distance = 1 - Cosine Similarity. Lower distance = higher similarity.
    const results = await this.prisma.$queryRaw<any[]>`
      SELECT content, 1 - (embedding <=> ${vectorString}::vector) as similarity
      FROM "KnowledgeBase"
      ORDER BY embedding <=> ${vectorString}::vector
      LIMIT ${limit}
    `;

    return results.map((r: any) => ({
      content: r.content,
      score: r.similarity,
    }));
  }
}
