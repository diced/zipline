/*
  Warnings:

  - A unique constraint covering the columns `[imageId]` on the table `InvisibleImage` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `imageId` to the `InvisibleImage` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "InvisibleImage" DROP CONSTRAINT "InvisibleImage_id_fkey";

-- DropIndex
DROP INDEX "InvisibleImage_id_unique";

-- AlterTable
CREATE SEQUENCE "invisibleimage_id_seq";
ALTER TABLE "InvisibleImage" ADD COLUMN     "imageId" INTEGER NOT NULL,
ALTER COLUMN "id" SET DEFAULT nextval('invisibleimage_id_seq'),
ADD PRIMARY KEY ("id");
ALTER SEQUENCE "invisibleimage_id_seq" OWNED BY "InvisibleImage"."id";

-- CreateIndex
CREATE UNIQUE INDEX "InvisibleImage_imageId_unique" ON "InvisibleImage"("imageId");

-- AddForeignKey
ALTER TABLE "InvisibleImage" ADD FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
