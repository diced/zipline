UPDATE "Zipline"
SET
	"filesDisabledTypes" = COALESCE("filesDisabledTypes", '{}'::text[]),
	"filesDisabledExtensions" = COALESCE("filesDisabledExtensions", '{}'::text[]),
	"oauthDiscordAllowedIds" = COALESCE("oauthDiscordAllowedIds", '{}'::text[]),
	"oauthDiscordDeniedIds" = COALESCE("oauthDiscordDeniedIds", '{}'::text[]),
	"ratelimitAllowList" = COALESCE("ratelimitAllowList", '{}'::text[]),
	"domains" = COALESCE("domains", '{}'::text[])
WHERE
	"filesDisabledTypes" IS NULL
	OR "filesDisabledExtensions" IS NULL
	OR "oauthDiscordAllowedIds" IS NULL
	OR "oauthDiscordDeniedIds" IS NULL
	OR "ratelimitAllowList" IS NULL
	OR "domains" IS NULL;--> statement-breakpoint
ALTER TABLE "Zipline" ALTER COLUMN "filesDisabledTypes" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "Zipline" ALTER COLUMN "filesDisabledExtensions" SET DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "Zipline" ALTER COLUMN "filesDisabledExtensions" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "Zipline" ALTER COLUMN "oauthDiscordAllowedIds" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "Zipline" ALTER COLUMN "oauthDiscordDeniedIds" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "Zipline" ALTER COLUMN "ratelimitAllowList" SET DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "Zipline" ALTER COLUMN "ratelimitAllowList" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "Zipline" ALTER COLUMN "domains" SET NOT NULL;
