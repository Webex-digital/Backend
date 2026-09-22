import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Response } from 'express';
import { PrismaService } from '../prisma.service';
import { AuthenticatedUser } from '../auth/current-user.decorator';

@Injectable()
export class FilesService {
  private readonly uploadDir = join(process.cwd(), 'uploads', 'previews');

  constructor(private readonly prisma: PrismaService) {}

  async savePreview(user: AuthenticatedUser, conversationId: string, file: { originalname: string; filename: string; mimetype: string; size: number }) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.userId !== user.id && !['ADMIN', 'STAFF'].includes(user.role)) {
      throw new ForbiddenException('You cannot upload to this conversation');
    }
    await mkdir(this.uploadDir, { recursive: true });
    const stored = await this.prisma.previewFile.create({
      data: {
        conversationId,
        uploadedById: user.id,
        originalName: file.originalname,
        storageName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
      },
    });
    return stored;
  }

  async sendPreview(user: AuthenticatedUser, id: string, response: Response) {
    const file = await this.prisma.previewFile.findUnique({
      where: { id },
      include: { conversation: true },
    });
    if (!file) throw new NotFoundException('Preview not found');
    if (file.conversation.userId !== user.id && !['ADMIN', 'STAFF'].includes(user.role)) {
      throw new ForbiddenException('You cannot access this preview');
    }
    response.download(join(this.uploadDir, file.storageName), file.originalName);
  }

  async removeFile(storageName: string) {
    await unlink(join(this.uploadDir, storageName)).catch(() => undefined);
  }

  static createStorageName(originalName: string) {
    const extension = originalName.includes('.') ? `.${originalName.split('.').pop()}` : '';
    return `${randomUUID()}${extension}`;
  }
}
