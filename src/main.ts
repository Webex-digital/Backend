import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

async function bootstrap() {
  execFileSync('npx', ['prisma', 'db', 'push', '--skip-generate'], { stdio: 'inherit' });
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
