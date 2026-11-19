ALTER TABLE "File" ADD COLUMN "previousNames" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
CREATE INDEX "file_previous_names_idx" ON "File" USING gin ("previousNames");