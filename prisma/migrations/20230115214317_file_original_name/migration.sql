-- AlterTable
ALTER TABLE "File" ADD COLUMN     "originalName" TEXT;

-- RenameForeignKey
ALTER TABLE "File" RENAME CONSTRAINT "Image_userId_fkey" TO "File_userId_fkey";

-- RenameIndex
ALTER INDEX "InvisibleImage_invis_key" RENAME TO "InvisibleFile_invis_key";
