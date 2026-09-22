-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "title" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "senderType" TEXT NOT NULL DEFAULT 'USER';
ALTER TABLE "Message" ALTER COLUMN "embedding" DROP NOT NULL;

-- AlterTable
ALTER TABLE "KnowledgeBase" ALTER COLUMN "embedding" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PreviewFile" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreviewFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreviewFile_storageName_key" ON "PreviewFile"("storageName");

-- AddForeignKey
ALTER TABLE "PreviewFile" ADD CONSTRAINT "PreviewFile_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
