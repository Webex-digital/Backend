import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { mkdir } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { getPrismaOptions } from './database-url';

async function ensureDatabaseSchema() {
  const prisma = new PrismaClient(getPrismaOptions());
  try {
    const tables = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const existing = new Set(tables.map(({ table_name }) => table_name));
    const required = ['User', 'Conversation', 'Message', 'Order', 'OrderItem', 'KnowledgeBase', 'ContactRequest', 'PreviewFile'];
    if (required.every((table) => existing.has(table))) return;

    const sql = await readFile('prisma/bootstrap.sql', 'utf8');
    for (const statement of sql.split(/;\s*\n/).map((value) => value.trim()).filter(Boolean)) {
      try {
        await prisma.$executeRawUnsafe(statement);
      } catch (error) {
        console.error('Schema bootstrap statement skipped:', error);
      }
    }
  } catch (error) {
    console.error('Schema bootstrap skipped:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function bootstrap() {
  await ensureDatabaseSchema();
  await mkdir('uploads/previews', { recursive: true });
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',').map((value) => value.trim()) || true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
}
void bootstrap();
