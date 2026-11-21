CREATE TABLE "ApiKey" (
	"id" text,
	"createdAt" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) with time zone NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"secretHash" text NOT NULL,
	"scopes" text[] NOT NULL,
	"expiresAt" timestamp(3) with time zone,
	"lastUsedAt" timestamp(3) with time zone,
	"revokedAt" timestamp(3) with time zone,
	"userId" text NOT NULL,
	CONSTRAINT "api_key_pkey" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_prefix_key" ON "ApiKey" ("prefix");--> statement-breakpoint
CREATE UNIQUE INDEX "api_key_secret_hash_key" ON "ApiKey" ("secretHash");--> statement-breakpoint
CREATE INDEX "api_key_user_id_created_at_idx" ON "ApiKey" ("userId","createdAt");--> statement-breakpoint
ALTER TABLE "ApiKey" ADD CONSTRAINT "api_key_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;