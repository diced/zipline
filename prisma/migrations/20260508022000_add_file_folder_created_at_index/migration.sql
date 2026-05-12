-- CreateIndex
CREATE INDEX "File_folderId_createdAt_idx" ON "public"."File"("folderId", "createdAt");

-- CreateIndex
CREATE INDEX "File_name_idx" ON "public"."File"("name");
