ALTER TABLE "Export"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone USING "updatedAt" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "File"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone USING "updatedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "deletesAt" SET DATA TYPE timestamp(3) with time zone USING "deletesAt" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "Folder"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone USING "updatedAt" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "IncompleteFile"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone USING "updatedAt" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "Invite"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone USING "updatedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "expiresAt" SET DATA TYPE timestamp(3) with time zone USING "expiresAt" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "Metric"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone USING "updatedAt" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "OAuthProvider"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone USING "updatedAt" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "Tag"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone USING "updatedAt" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "Thumbnail"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone USING "updatedAt" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "Url"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone USING "updatedAt" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "UserPasskey"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone USING "updatedAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "lastUsed" SET DATA TYPE timestamp(3) with time zone USING "lastUsed" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "UserQuota"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone USING "updatedAt" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "UserSession"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "User"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone USING "updatedAt" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "Zipline"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "createdAt" SET DATA TYPE timestamp(3) with time zone USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DATA TYPE timestamp(3) with time zone USING "updatedAt" AT TIME ZONE 'UTC';
