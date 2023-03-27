-- AlterEnum
ALTER TYPE "ImageFormat" RENAME TO "FileNameFormat";

-- AlterTable
ALTER TABLE "Image" RENAME TO "File";

-- AlterTable
ALTER TABLE "InvisibleImage" RENAME TO "InvisibleFile";

-- AlterTable
ALTER TABLE "InvisibleFile" RENAME COLUMN "imageId" TO "fileId";

-- AlterForeignKey
ALTER TABLE "InvisibleFile" RENAME CONSTRAINT "InvisibleImage_imageId_fkey" TO "InvisibleFile_fileId_fkey";
ALTER INDEX "InvisibleImage_imageId_key" RENAME TO "InvisibleFile_fileId_key";

-- AlterForeignKey
ALTER TABLE "InvisibleFile" RENAME CONSTRAINT "InvisibleImage_pkey" TO "InvisibleFile_pkey";
ALTER TABLE "File" RENAME CONSTRAINT "Image_pkey" TO "File_pkey";