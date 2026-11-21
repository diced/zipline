CREATE TABLE "FileRequest" (
	"id" text,
	"createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) with time zone NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"password" text,
	"expiresAt" timestamp(3) with time zone,
	"maxFiles" integer,
	"maxBytes" bigint,
	"allowedTypes" text[] DEFAULT '{}'::text[] NOT NULL,
	"folderId" text,
	"userId" text NOT NULL,
	CONSTRAINT "file_request_pkey" PRIMARY KEY("id")
);
--> statement-breakpoint
ALTER TABLE "File" ADD COLUMN "fileRequestId" text;--> statement-breakpoint
CREATE INDEX "file_request_user_id_created_at_idx" ON "FileRequest" ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "file_request_folder_id_idx" ON "FileRequest" ("folderId");--> statement-breakpoint
CREATE INDEX "file_file_request_id_created_at_idx" ON "File" ("fileRequestId","createdAt");--> statement-breakpoint
ALTER TABLE "FileRequest" ADD CONSTRAINT "file_request_folder_id_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "FileRequest" ADD CONSTRAINT "file_request_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;--> statement-breakpoint
ALTER TABLE "File" ADD CONSTRAINT "file_file_request_id_fkey" FOREIGN KEY ("fileRequestId") REFERENCES "FileRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;