-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ratelimited" BOOLEAN NOT NULL DEFAULT false;

-- RenameIndex
ALTER INDEX "InvisibleImage_imageId_unique" RENAME TO "InvisibleImage_imageId_key";

-- RenameIndex
ALTER INDEX "InvisibleUrl_urlId_unique" RENAME TO "InvisibleUrl_urlId_key";

-- RenameIndex
ALTER INDEX "Theme_userId_unique" RENAME TO "Theme_userId_key";
