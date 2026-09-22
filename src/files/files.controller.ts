import { Controller, Get, Param, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { FilesService } from './files.service';

@Controller('conversations/:conversationId/files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/previews',
        filename: (_request, file, callback) => callback(null, FilesService.createStorageName(file.originalname)),
      }),
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (_request, file, callback) => {
        const allowed = ['image/', 'application/pdf'].some((prefix) => file.mimetype.startsWith(prefix));
        callback(allowed ? null : new Error('Only images and PDF files are allowed'), allowed);
      },
    }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('conversationId') conversationId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.filesService.savePreview(user, conversationId, file);
  }

  @Get(':id')
  download(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Res() response: Response,
  ) {
    return this.filesService.sendPreview(user, id, response);
  }
}
