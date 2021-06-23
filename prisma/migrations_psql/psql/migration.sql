-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "administrator" BOOLEAN NOT NULL DEFAULT false,
    "embedTitle" TEXT,
    "embedColor" TEXT NOT NULL DEFAULT E'#2f3136',

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" SERIAL NOT NULL,
    "file" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL DEFAULT E'image/png',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "views" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvisibleImage" (
    "id" INTEGER NOT NULL,
    "invis" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Url" (
    "id" SERIAL NOT NULL,
    "to" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "views" INTEGER NOT NULL DEFAULT 0,
    "userId" INTEGER NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvisibleImage.invis_unique" ON "InvisibleImage"("invis");

-- CreateIndex
CREATE UNIQUE INDEX "InvisibleImage_id_unique" ON "InvisibleImage"("id");

-- AddForeignKey
ALTER TABLE "Image" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvisibleImage" ADD FOREIGN KEY ("id") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Url" ADD FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
