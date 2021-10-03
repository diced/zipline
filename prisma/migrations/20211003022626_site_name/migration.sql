-- AlterTable
ALTER TABLE "User" ADD COLUMN     "embedSiteName" TEXT DEFAULT E'{image.file} • {user.name}';
