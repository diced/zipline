-- AlterTable
ALTER TABLE "User" ADD COLUMN     "oauth" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "oauthProvider" TEXT,
ALTER COLUMN "password" DROP NOT NULL;
