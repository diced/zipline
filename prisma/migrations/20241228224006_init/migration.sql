-- CreateEnum
CREATE TYPE "UserFilesQuota" AS ENUM ('BY_BYTES', 'BY_FILES');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "OAuthProviderType" AS ENUM ('DISCORD', 'GOOGLE', 'GITHUB', 'OIDC');

-- CreateEnum
CREATE TYPE "IncompleteFileStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETE', 'FAILED');

-- CreateTable
CREATE TABLE "Zipline" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstSetup" BOOLEAN NOT NULL DEFAULT true,
    "coreReturnHttpsUrls" BOOLEAN NOT NULL DEFAULT false,
    "coreDefaultDomain" TEXT,
    "coreTempDirectory" TEXT NOT NULL,
    "chunksEnabled" BOOLEAN NOT NULL DEFAULT true,
    "chunksMax" INTEGER NOT NULL DEFAULT 99614720,
    "chunksSize" INTEGER NOT NULL DEFAULT 26214400,
    "tasksDeleteInterval" INTEGER NOT NULL DEFAULT 1800000,
    "tasksClearInvitesInterval" INTEGER NOT NULL DEFAULT 1800000,
    "tasksMaxViewsInterval" INTEGER NOT NULL DEFAULT 1800000,
    "tasksThumbnailsInterval" INTEGER NOT NULL DEFAULT 1800000,
    "tasksMetricsInterval" INTEGER NOT NULL DEFAULT 1800000,
    "filesRoute" TEXT NOT NULL DEFAULT '/u',
    "filesLength" INTEGER NOT NULL DEFAULT 6,
    "filesDefaultFormat" TEXT NOT NULL DEFAULT 'random',
    "filesDisabledExtensions" TEXT[],
    "filesMaxFileSize" INTEGER NOT NULL DEFAULT 104857600,
    "filesDefaultExpiration" INTEGER,
    "filesAssumeMimetypes" BOOLEAN NOT NULL DEFAULT false,
    "filesDefaultDateFormat" TEXT NOT NULL DEFAULT 'YYYY-MM-DD_HH:mm:ss',
    "filesRemoveGpsMetadata" BOOLEAN NOT NULL DEFAULT false,
    "urlsRoute" TEXT NOT NULL DEFAULT '/go',
    "urlsLength" INTEGER NOT NULL DEFAULT 6,
    "featuresImageCompression" BOOLEAN NOT NULL DEFAULT true,
    "featuresRobotsTxt" BOOLEAN NOT NULL DEFAULT true,
    "featuresHealthcheck" BOOLEAN NOT NULL DEFAULT true,
    "featuresUserRegistration" BOOLEAN NOT NULL DEFAULT false,
    "featuresOauthRegistration" BOOLEAN NOT NULL DEFAULT false,
    "featuresDeleteOnMaxViews" BOOLEAN NOT NULL DEFAULT true,
    "featuresThumbnailsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "featuresThumbnailsNumberThreads" INTEGER NOT NULL DEFAULT 4,
    "featuresMetricsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "featuresMetricsAdminOnly" BOOLEAN NOT NULL DEFAULT false,
    "featuresMetricsShowUserSpecific" BOOLEAN NOT NULL DEFAULT true,
    "invitesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "invitesLength" INTEGER NOT NULL DEFAULT 6,
    "websiteTitle" TEXT NOT NULL DEFAULT 'Zipline',
    "websiteTitleLogo" TEXT,
    "websiteExternalLinks" JSONB NOT NULL DEFAULT '[{ "name": "GitHub", "url": "https://github.com/diced/zipline"}, { "name": "Documentation", "url": "https://zipline.diced.sh/"}]',
    "websiteLoginBackground" TEXT,
    "websiteDefaultAvatar" TEXT,
    "websiteTos" TEXT,
    "websiteThemeDefault" TEXT NOT NULL DEFAULT 'system',
    "websiteThemeDark" TEXT NOT NULL DEFAULT 'builtin:dark_gray',
    "websiteThemeLight" TEXT NOT NULL DEFAULT 'builtin:light_gray',
    "oauthBypassLocalLogin" BOOLEAN NOT NULL DEFAULT false,
    "oauthLoginOnly" BOOLEAN NOT NULL DEFAULT false,
    "oauthDiscordClientId" TEXT,
    "oauthDiscordClientSecret" TEXT,
    "oauthDiscordRedirectUri" TEXT,
    "oauthGoogleClientId" TEXT,
    "oauthGoogleClientSecret" TEXT,
    "oauthGoogleRedirectUri" TEXT,
    "oauthGithubClientId" TEXT,
    "oauthGithubClientSecret" TEXT,
    "oauthGithubRedirectUri" TEXT,
    "oauthOidcClientId" TEXT,
    "oauthOidcClientSecret" TEXT,
    "oauthOidcAuthorizeUrl" TEXT,
    "oauthOidcTokenUrl" TEXT,
    "oauthOidcUserinfoUrl" TEXT,
    "oauthOidcRedirectUri" TEXT,
    "mfaTotpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaTotpIssuer" TEXT NOT NULL DEFAULT 'Zipline',
    "mfaPasskeys" BOOLEAN NOT NULL DEFAULT false,
    "ratelimitEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ratelimitMax" INTEGER NOT NULL DEFAULT 10,
    "ratelimitWindow" INTEGER,
    "ratelimitAdminBypass" BOOLEAN NOT NULL DEFAULT true,
    "ratelimitAllowList" TEXT[],
    "httpWebhookOnUpload" TEXT,
    "httpWebhookOnShorten" TEXT,
    "discordWebhookUrl" TEXT,
    "discordUsername" TEXT,
    "discordAvatarUrl" TEXT,
    "discordOnUploadWebhookUrl" TEXT,
    "discordOnUploadUsername" TEXT,
    "discordOnUploadAvatarUrl" TEXT,
    "discordOnUploadContent" TEXT,
    "discordOnUploadEmbed" JSONB,
    "discordOnShortenWebhookUrl" TEXT,
    "discordOnShortenUsername" TEXT,
    "discordOnShortenAvatarUrl" TEXT,
    "discordOnShortenContent" TEXT,
    "discordOnShortenEmbed" JSONB,
    "pwaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pwaTitle" TEXT NOT NULL DEFAULT 'Zipline',
    "pwaShortName" TEXT NOT NULL DEFAULT 'Zipline',
    "pwaDescription" TEXT NOT NULL DEFAULT 'Zipline',
    "pwaThemeColor" TEXT NOT NULL DEFAULT '#000000',
    "pwaBackgroundColor" TEXT NOT NULL DEFAULT '#000000',

    CONSTRAINT "Zipline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "avatar" TEXT,
    "token" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "view" JSONB NOT NULL DEFAULT '{}',
    "totpSecret" TEXT,
    "sessions" TEXT[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Export" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "path" TEXT NOT NULL,
    "files" INTEGER NOT NULL,
    "size" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Export_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQuota" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "filesQuota" "UserFilesQuota" NOT NULL,
    "maxBytes" TEXT,
    "maxFiles" INTEGER,
    "maxUrls" INTEGER,
    "userId" TEXT,

    CONSTRAINT "UserQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPasskey" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsed" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "reg" JSONB NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserPasskey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthProvider" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "OAuthProviderType" NOT NULL,
    "username" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "oauthId" TEXT,

    CONSTRAINT "OAuthProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletesAt" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "originalName" TEXT,
    "size" BIGINT NOT NULL,
    "type" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "maxViews" INTEGER,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "userId" TEXT,
    "folderId" TEXT,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thumbnail" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "path" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,

    CONSTRAINT "Thumbnail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "public" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncompleteFile" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "IncompleteFileStatus" NOT NULL,
    "chunksTotal" INTEGER NOT NULL,
    "chunksComplete" INTEGER NOT NULL,
    "metadata" JSONB NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "IncompleteFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Url" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "vanity" TEXT,
    "destination" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "maxViews" INTEGER,
    "password" TEXT,
    "userId" TEXT,

    CONSTRAINT "Url_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "code" TEXT NOT NULL,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FileToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_FileToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_token_key" ON "User"("token");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuota_userId_key" ON "UserQuota"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthProvider_provider_oauthId_key" ON "OAuthProvider"("provider", "oauthId");

-- CreateIndex
CREATE UNIQUE INDEX "Thumbnail_fileId_key" ON "Thumbnail"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Url_code_vanity_key" ON "Url"("code", "vanity");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_code_key" ON "Invite"("code");

-- CreateIndex
CREATE INDEX "_FileToTag_B_index" ON "_FileToTag"("B");

-- AddForeignKey
ALTER TABLE "Export" ADD CONSTRAINT "Export_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuota" ADD CONSTRAINT "UserQuota_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPasskey" ADD CONSTRAINT "UserPasskey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthProvider" ADD CONSTRAINT "OAuthProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thumbnail" ADD CONSTRAINT "Thumbnail_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncompleteFile" ADD CONSTRAINT "IncompleteFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Url" ADD CONSTRAINT "Url_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FileToTag" ADD CONSTRAINT "_FileToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FileToTag" ADD CONSTRAINT "_FileToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
