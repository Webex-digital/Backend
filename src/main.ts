import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { mkdir } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
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

async function ensureAdminAccount() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  if (password.length < 10) {
    console.error('ADMIN_PASSWORD must contain at least 10 characters; admin bootstrap skipped.');
    return;
  }

  const prisma = new PrismaClient(getPrismaOptions());
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.upsert({
      where: { email },
      create: { email, password: passwordHash, fullName: process.env.ADMIN_NAME || 'WEBEX Admin', role: 'ADMIN' },
      update: { password: passwordHash, role: 'ADMIN', fullName: process.env.ADMIN_NAME || 'WEBEX Admin' },
    });
    console.log(`Admin account ready for ${email}`);
  } catch (error) {
    console.error('Admin bootstrap skipped:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function bootstrap() {
  await ensureDatabaseSchema();
  await ensureAdminAccount();
  await mkdir('uploads/previews', { recursive: true });
  const app = await NestFactory.create(AppModule);
  const configuredOrigins = (process.env.FRONTEND_URL || process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const allowedOrigins = Array.from(
    new Set([
      'https://webex-digital.vercel.app',
      'https://frontend-indol-seven-90.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5500',
      ...configuredOrigins,
    ]),
  );

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);

      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1');

      if (isAllowed) {
        return callback(null, true);
      }

      return callback(null, true);
    },
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
