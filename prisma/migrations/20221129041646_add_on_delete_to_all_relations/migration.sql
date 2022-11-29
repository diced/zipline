-- DropForeignKey
ALTER TABLE "InvisibleImage" DROP CONSTRAINT "InvisibleImage_imageId_fkey";

-- DropForeignKey
ALTER TABLE "InvisibleUrl" DROP CONSTRAINT "InvisibleUrl_urlId_fkey";

-- DropForeignKey
ALTER TABLE "Invite" DROP CONSTRAINT "Invite_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Url" DROP CONSTRAINT "Url_userId_fkey";

-- AlterTable
ALTER TABLE "Url" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "InvisibleImage" ADD CONSTRAINT "InvisibleImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Url" ADD CONSTRAINT "Url_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvisibleUrl" ADD CONSTRAINT "InvisibleUrl_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "Url"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
