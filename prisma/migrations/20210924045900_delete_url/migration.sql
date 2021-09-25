/*
  Warnings:

  - You are about to drop the `InvisibleUrl` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Url` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Image" DROP CONSTRAINT "Image_userId_fkey";

-- DropForeignKey
ALTER TABLE "InvisibleImage" DROP CONSTRAINT "InvisibleImage_imageId_fkey";

-- DropForeignKey
ALTER TABLE "InvisibleUrl" DROP CONSTRAINT "InvisibleUrl_id_fkey";

-- DropForeignKey
ALTER TABLE "Theme" DROP CONSTRAINT "Theme_userId_fkey";

-- DropForeignKey
ALTER TABLE "Url" DROP CONSTRAINT "Url_userId_fkey";

-- DropTable
DROP TABLE "InvisibleUrl";

-- DropTable
DROP TABLE "Url";

-- AddForeignKey
ALTER TABLE "Theme" ADD CONSTRAINT "Theme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvisibleImage" ADD CONSTRAINT "InvisibleImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "InvisibleImage.invis_unique" RENAME TO "InvisibleImage_invis_key";
