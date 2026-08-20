CREATE TYPE "public"."IncompleteFileStatus" AS ENUM('PENDING', 'PROCESSING', 'COMPLETE', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."OAuthProviderType" AS ENUM('DISCORD', 'GOOGLE', 'GITHUB', 'OIDC');--> statement-breakpoint
CREATE TYPE "public"."Role" AS ENUM('USER', 'ADMIN', 'SUPERADMIN');--> statement-breakpoint
CREATE TYPE "public"."UserFilesQuota" AS ENUM('BY_BYTES', 'BY_FILES');--> statement-breakpoint
CREATE TABLE "Export" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"path" text NOT NULL,
	"files" integer NOT NULL,
	"size" text NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "File" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"deletesAt" timestamp (3),
	"name" text NOT NULL,
	"originalName" text,
	"size" bigint NOT NULL,
	"type" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"maxViews" integer,
	"favorite" boolean DEFAULT false NOT NULL,
	"password" text,
	"anonymous" boolean DEFAULT false NOT NULL,
	"userId" text,
	"folderId" text
);
--> statement-breakpoint
CREATE TABLE "_FileToTag" (
	"A" text NOT NULL,
	"B" text NOT NULL,
	CONSTRAINT "_FileToTag_AB_pkey" PRIMARY KEY("A","B")
);
--> statement-breakpoint
CREATE TABLE "Folder" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"name" text NOT NULL,
	"public" boolean DEFAULT false NOT NULL,
	"allowUploads" boolean DEFAULT false NOT NULL,
	"parentId" text,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "IncompleteFile" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"status" "IncompleteFileStatus" NOT NULL,
	"chunksTotal" integer NOT NULL,
	"chunksComplete" integer NOT NULL,
	"metadata" jsonb NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Invite" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"expiresAt" timestamp (3),
	"code" text NOT NULL,
	"uses" integer DEFAULT 0 NOT NULL,
	"maxUses" integer,
	"inviterId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Metric" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"data" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "OAuthProvider" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"userId" text NOT NULL,
	"provider" "OAuthProviderType" NOT NULL,
	"username" text NOT NULL,
	"accessToken" text NOT NULL,
	"refreshToken" text,
	"oauthId" text
);
--> statement-breakpoint
CREATE TABLE "Tag" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"userId" text
);
--> statement-breakpoint
CREATE TABLE "Thumbnail" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"path" text NOT NULL,
	"fileId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Url" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"code" text NOT NULL,
	"vanity" text,
	"destination" text NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"maxViews" integer,
	"password" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"userId" text
);
--> statement-breakpoint
CREATE TABLE "UserPasskey" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"lastUsed" timestamp (3),
	"name" text NOT NULL,
	"reg" jsonb NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserQuota" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"filesQuota" "UserFilesQuota" NOT NULL,
	"maxBytes" text,
	"maxFiles" integer,
	"maxUrls" integer,
	"userId" text
);
--> statement-breakpoint
CREATE TABLE "UserSession" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"ua" text NOT NULL,
	"client" text NOT NULL,
	"device" text NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"username" text NOT NULL,
	"password" text,
	"avatar" text,
	"token" text NOT NULL,
	"role" "Role" DEFAULT 'USER' NOT NULL,
	"view" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"totpSecret" text
);
--> statement-breakpoint
CREATE TABLE "Zipline" (
	"id" text PRIMARY KEY NOT NULL,
	"createdAt" timestamp (3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp (3) NOT NULL,
	"firstSetup" boolean DEFAULT true NOT NULL,
	"coreReturnHttpsUrls" boolean DEFAULT false NOT NULL,
	"coreDefaultDomain" text,
	"coreTempDirectory" text NOT NULL,
	"coreTrustProxy" boolean DEFAULT false NOT NULL,
	"chunksEnabled" boolean DEFAULT true NOT NULL,
	"chunksMax" text DEFAULT '95mb' NOT NULL,
	"chunksSize" text DEFAULT '25mb' NOT NULL,
	"tasksDeleteInterval" text DEFAULT '30m' NOT NULL,
	"tasksClearInvitesInterval" text DEFAULT '30m' NOT NULL,
	"tasksMaxViewsInterval" text DEFAULT '30m' NOT NULL,
	"tasksThumbnailsInterval" text DEFAULT '30m' NOT NULL,
	"tasksMetricsInterval" text DEFAULT '30m' NOT NULL,
	"tasksCleanThumbnailsInterval" text DEFAULT '1d' NOT NULL,
	"filesRoute" text DEFAULT '/u' NOT NULL,
	"filesLength" integer DEFAULT 6 NOT NULL,
	"filesDefaultFormat" text DEFAULT 'random' NOT NULL,
	"filesDisabledTypes" text[] DEFAULT '{}',
	"filesDisabledTypesDefault" text,
	"filesDisabledExtensions" text[],
	"filesMaxFileSize" text DEFAULT '100mb' NOT NULL,
	"filesDefaultExpiration" text,
	"filesMaxExpiration" text,
	"filesAssumeMimetypes" boolean DEFAULT false NOT NULL,
	"filesDefaultDateFormat" text DEFAULT 'YYYY-MM-DD_HH:mm:ss' NOT NULL,
	"filesRemoveGpsMetadata" boolean DEFAULT false NOT NULL,
	"filesRandomWordsNumAdjectives" integer DEFAULT 2 NOT NULL,
	"filesRandomWordsSeparator" text DEFAULT '-' NOT NULL,
	"filesDefaultCompressionFormat" text DEFAULT 'jpg',
	"filesMaxFilesPerUpload" integer DEFAULT 1000 NOT NULL,
	"filesExtensionlessUrls" boolean DEFAULT false NOT NULL,
	"urlsRoute" text DEFAULT '/go' NOT NULL,
	"urlsLength" integer DEFAULT 6 NOT NULL,
	"featuresImageCompression" boolean DEFAULT true NOT NULL,
	"featuresRobotsTxt" boolean DEFAULT true NOT NULL,
	"featuresHealthcheck" boolean DEFAULT true NOT NULL,
	"featuresUserRegistration" boolean DEFAULT false NOT NULL,
	"featuresOauthRegistration" boolean DEFAULT false NOT NULL,
	"featuresDeleteOnMaxViews" boolean DEFAULT true NOT NULL,
	"featuresThumbnailsEnabled" boolean DEFAULT true NOT NULL,
	"featuresThumbnailsNumberThreads" integer DEFAULT 4 NOT NULL,
	"featuresThumbnailsFormat" text DEFAULT 'jpg' NOT NULL,
	"featuresThumbnailsInstantaneous" boolean DEFAULT false NOT NULL,
	"featuresMetricsEnabled" boolean DEFAULT true NOT NULL,
	"featuresMetricsAdminOnly" boolean DEFAULT false NOT NULL,
	"featuresMetricsShowUserSpecific" boolean DEFAULT true NOT NULL,
	"featuresVersionChecking" boolean DEFAULT true NOT NULL,
	"invitesEnabled" boolean DEFAULT true NOT NULL,
	"invitesLength" integer DEFAULT 6 NOT NULL,
	"websiteTitle" text DEFAULT 'Zipline' NOT NULL,
	"websiteTitleLogo" text,
	"websiteExternalLinks" jsonb DEFAULT '[{"name":"GitHub","url":"https://github.com/diced/zipline"},{"name":"Documentation","url":"https://zipline.diced.sh/"}]'::jsonb NOT NULL,
	"websiteLoginBackground" text,
	"websiteLoginBackgroundBlur" boolean DEFAULT true NOT NULL,
	"websiteDefaultAvatar" text,
	"websiteTos" text,
	"websiteThemeDefault" text DEFAULT 'system' NOT NULL,
	"websiteThemeDark" text DEFAULT 'builtin:dark_gray' NOT NULL,
	"websiteThemeLight" text DEFAULT 'builtin:light_gray' NOT NULL,
	"oauthBypassLocalLogin" boolean DEFAULT false NOT NULL,
	"oauthLoginOnly" boolean DEFAULT false NOT NULL,
	"oauthDiscordClientId" text,
	"oauthDiscordClientSecret" text,
	"oauthDiscordRedirectUri" text,
	"oauthDiscordAllowedIds" text[] DEFAULT '{}',
	"oauthDiscordDeniedIds" text[] DEFAULT '{}',
	"oauthGoogleClientId" text,
	"oauthGoogleClientSecret" text,
	"oauthGoogleRedirectUri" text,
	"oauthGithubClientId" text,
	"oauthGithubClientSecret" text,
	"oauthGithubRedirectUri" text,
	"oauthOidcClientId" text,
	"oauthOidcClientSecret" text,
	"oauthOidcAuthorizeUrl" text,
	"oauthOidcTokenUrl" text,
	"oauthOidcUserinfoUrl" text,
	"oauthOidcRedirectUri" text,
	"mfaTotpEnabled" boolean DEFAULT false NOT NULL,
	"mfaTotpIssuer" text DEFAULT 'Zipline' NOT NULL,
	"mfaPasskeysEnabled" boolean DEFAULT false NOT NULL,
	"mfaPasskeysRpID" text,
	"mfaPasskeysOrigin" text,
	"ratelimitEnabled" boolean DEFAULT true NOT NULL,
	"ratelimitMax" integer DEFAULT 10 NOT NULL,
	"ratelimitWindow" integer,
	"ratelimitAdminBypass" boolean DEFAULT true NOT NULL,
	"ratelimitAllowList" text[],
	"httpWebhookOnUpload" text,
	"httpWebhookOnShorten" text,
	"discordWebhookUrl" text,
	"discordUsername" text,
	"discordAvatarUrl" text,
	"discordOnUploadWebhookUrl" text,
	"discordOnUploadUsername" text,
	"discordOnUploadAvatarUrl" text,
	"discordOnUploadContent" text,
	"discordOnUploadEmbed" jsonb,
	"discordOnShortenWebhookUrl" text,
	"discordOnShortenUsername" text,
	"discordOnShortenAvatarUrl" text,
	"discordOnShortenContent" text,
	"discordOnShortenEmbed" jsonb,
	"pwaEnabled" boolean DEFAULT false NOT NULL,
	"pwaTitle" text DEFAULT 'Zipline' NOT NULL,
	"pwaShortName" text DEFAULT 'Zipline' NOT NULL,
	"pwaDescription" text DEFAULT 'Zipline' NOT NULL,
	"pwaThemeColor" text DEFAULT '#000000' NOT NULL,
	"pwaBackgroundColor" text DEFAULT '#000000' NOT NULL,
	"domains" text[] DEFAULT '{}'
);
--> statement-breakpoint
ALTER TABLE "Export" ADD CONSTRAINT "Export_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "File" ADD CONSTRAINT "File_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "public"."Folder"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_FileToTag" ADD CONSTRAINT "_FileToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."File"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "_FileToTag" ADD CONSTRAINT "_FileToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."Tag"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Folder"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "IncompleteFile" ADD CONSTRAINT "IncompleteFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "OAuthProvider" ADD CONSTRAINT "OAuthProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Thumbnail" ADD CONSTRAINT "Thumbnail_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "public"."File"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "Url" ADD CONSTRAINT "Url_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserPasskey" ADD CONSTRAINT "UserPasskey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserQuota" ADD CONSTRAINT "UserQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "File_name_idx" ON "File" USING btree ("name");--> statement-breakpoint
CREATE INDEX "File_userId_size_idx" ON "File" USING btree ("userId","size");--> statement-breakpoint
CREATE INDEX "File_folderId_createdAt_idx" ON "File" USING btree ("folderId","createdAt");--> statement-breakpoint
CREATE INDEX "_FileToTag_B_index" ON "_FileToTag" USING btree ("B");--> statement-breakpoint
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "OAuthProvider_provider_oauthId_key" ON "OAuthProvider" USING btree ("provider","oauthId");--> statement-breakpoint
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "Thumbnail_fileId_key" ON "Thumbnail" USING btree ("fileId");--> statement-breakpoint
CREATE UNIQUE INDEX "Url_code_vanity_key" ON "Url" USING btree ("code","vanity");--> statement-breakpoint
CREATE UNIQUE INDEX "UserQuota_userId_key" ON "UserQuota" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "User_username_key" ON "User" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "User_token_key" ON "User" USING btree ("token");