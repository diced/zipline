-- CreateEnum
CREATE TYPE "ImageFormat" AS ENUM ('UUID', 'DATE', 'RANDOM');

-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "format" "ImageFormat" NOT NULL DEFAULT E'RANDOM';
