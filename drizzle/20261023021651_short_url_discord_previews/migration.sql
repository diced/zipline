ALTER TABLE "Url" ADD COLUMN "discordPreviewMode" text DEFAULT 'destination' NOT NULL;--> statement-breakpoint
ALTER TABLE "Url" ADD COLUMN "discordComponentEmbed" jsonb;