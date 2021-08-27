-- AlterTable
ALTER TABLE "User" ADD COLUMN     "systemTheme" TEXT NOT NULL DEFAULT E'dark_blue';

-- CreateTable
CREATE TABLE "Theme" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "primary" TEXT NOT NULL,
    "secondary" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "warning" TEXT NOT NULL,
    "info" TEXT NOT NULL,
    "border" TEXT NOT NULL,
    "mainBackground" TEXT NOT NULL,
    "paperBackground" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Theme_userId_unique" ON "Theme"("userId");

-- AddForeignKey
ALTER TABLE "Theme" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
