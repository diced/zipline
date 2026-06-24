import { prisma } from '@/lib/db';
import { tmpdir } from 'os';
import { join } from 'path';

export const DATABASE_TO_PROP = {
  coreReturnHttpsUrls: 'core.returnHttpsUrls',
  coreDefaultDomain: 'core.defaultDomain',
  coreTempDirectory: 'core.tempDirectory',
  coreTrustProxy: 'core.trustProxy',

  chunksMax: 'chunks.max',
  chunksSize: 'chunks.size',
  chunksEnabled: 'chunks.enabled',

  tasksDeleteInterval: 'tasks.deleteInterval',
  tasksClearInvitesInterval: 'tasks.clearInvitesInterval',
  tasksMaxViewsInterval: 'tasks.maxViewsInterval',
  tasksThumbnailsInterval: 'tasks.thumbnailsInterval',
  tasksMetricsInterval: 'tasks.metricsInterval',
  tasksCleanThumbnailsInterval: 'tasks.cleanThumbnailsInterval',

  filesRoute: 'files.route',
  filesLength: 'files.length',
  filesDefaultFormat: 'files.defaultFormat',
  filesDisabledTypes: 'files.disabledTypes',
  filesDisabledTypesDefault: 'files.disabledTypesDefault',
  filesDisabledExtensions: 'files.disabledExtensions',
  filesMaxFileSize: 'files.maxFileSize',
  filesDefaultExpiration: 'files.defaultExpiration',
  filesMaxExpiration: 'files.maxExpiration',
  filesAssumeMimetypes: 'files.assumeMimetypes',
  filesDefaultDateFormat: 'files.defaultDateFormat',
  filesRemoveGpsMetadata: 'files.removeGpsMetadata',
  filesRandomWordsNumAdjectives: 'files.randomWordsNumAdjectives',
  filesRandomWordsSeparator: 'files.randomWordsSeparator',
  filesDefaultCompressionFormat: 'files.defaultCompressionFormat',
  filesMaxFilesPerUpload: 'files.maxFilesPerUpload',
  filesExtensionlessUrls: 'files.extensionlessUrls',

  urlsRoute: 'urls.route',
  urlsLength: 'urls.length',

  featuresImageCompression: 'features.imageCompression',
  featuresRobotsTxt: 'features.robotsTxt',
  featuresHealthcheck: 'features.healthcheck',
  featuresUserRegistration: 'features.userRegistration',
  featuresOauthRegistration: 'features.oauthRegistration',
  featuresDeleteOnMaxViews: 'features.deleteOnMaxViews',

  featuresThumbnailsEnabled: 'features.thumbnails.enabled',
  featuresThumbnailsNumberThreads: 'features.thumbnails.num_threads',
  featuresThumbnailsFormat: 'features.thumbnails.format',
  featuresThumbnailsInstantaneous: 'features.thumbnails.instantaneous',

  featuresMetricsEnabled: 'features.metrics.enabled',
  featuresMetricsAdminOnly: 'features.metrics.adminOnly',
  featuresMetricsShowUserSpecific: 'features.metrics.showUserSpecific',

  featuresVersionChecking: 'features.versionChecking',
  featuresVersionAPI: 'features.versionAPI',

  invitesEnabled: 'invites.enabled',
  invitesLength: 'invites.length',

  websiteTitle: 'website.title',
  websiteTitleLogo: 'website.titleLogo',
  websiteExternalLinks: 'website.externalLinks',
  websiteLoginBackground: 'website.loginBackground',
  websiteLoginBackgroundBlur: 'website.loginBackgroundBlur',
  websiteDefaultAvatar: 'website.defaultAvatar',
  websiteTos: 'website.tos',

  domains: 'domains',

  websiteThemeDefault: 'website.theme.default',
  websiteThemeDark: 'website.theme.dark',
  websiteThemeLight: 'website.theme.light',

  oauthBypassLocalLogin: 'oauth.bypassLocalLogin',
  oauthLoginOnly: 'oauth.loginOnly',

  oauthDiscordClientId: 'oauth.discord.clientId',
  oauthDiscordClientSecret: 'oauth.discord.clientSecret',
  oauthDiscordRedirectUri: 'oauth.discord.redirectUri',
  oauthDiscordAllowedIds: 'oauth.discord.allowedIds',
  oauthDiscordDeniedIds: 'oauth.discord.deniedIds',

  oauthGoogleClientId: 'oauth.google.clientId',
  oauthGoogleClientSecret: 'oauth.google.clientSecret',
  oauthGoogleRedirectUri: 'oauth.google.redirectUri',

  oauthGithubClientId: 'oauth.github.clientId',
  oauthGithubClientSecret: 'oauth.github.clientSecret',
  oauthGithubRedirectUri: 'oauth.github.redirectUri',

  oauthOidcClientId: 'oauth.oidc.clientId',
  oauthOidcClientSecret: 'oauth.oidc.clientSecret',
  oauthOidcAuthorizeUrl: 'oauth.oidc.authorizeUrl',
  oauthOidcUserinfoUrl: 'oauth.oidc.userinfoUrl',
  oauthOidcTokenUrl: 'oauth.oidc.tokenUrl',
  oauthOidcRedirectUri: 'oauth.oidc.redirectUri',

  mfaTotpEnabled: 'mfa.totp.enabled',
  mfaTotpIssuer: 'mfa.totp.issuer',
  mfaPasskeysEnabled: 'mfa.passkeys.enabled',
  mfaPasskeysRpID: 'mfa.passkeys.rpID',
  mfaPasskeysOrigin: 'mfa.passkeys.origin',

  ratelimitEnabled: 'ratelimit.enabled',
  ratelimitMax: 'ratelimit.max',
  ratelimitWindow: 'ratelimit.window',
  ratelimitAdminBypass: 'ratelimit.adminBypass',
  ratelimitAllowList: 'ratelimit.allowList',

  httpWebhookOnUpload: 'httpWebhook.onUpload',
  httpWebhookOnShorten: 'httpWebhook.onShorten',

  discordWebhookUrl: 'discord.webhookUrl',
  discordUsername: 'discord.username',
  discordAvatarUrl: 'discord.avatarUrl',

  discordOnUploadWebhookUrl: 'discord.onUpload.webhookUrl',
  discordOnUploadUsername: 'discord.onUpload.username',
  discordOnUploadAvatarUrl: 'discord.onUpload.avatarUrl',
  discordOnUploadContent: 'discord.onUpload.content',
  discordOnUploadEmbed: 'discord.onUpload.embed',

  discordOnShortenWebhookUrl: 'discord.onShorten.webhookUrl',
  discordOnShortenUsername: 'discord.onShorten.username',
  discordOnShortenAvatarUrl: 'discord.onShorten.avatarUrl',
  discordOnShortenContent: 'discord.onShorten.content',
  discordOnShortenEmbed: 'discord.onShorten.embed',

  pwaEnabled: 'pwa.enabled',
  pwaTitle: 'pwa.title',
  pwaShortName: 'pwa.shortName',
  pwaDescription: 'pwa.description',
  pwaThemeColor: 'pwa.themeColor',
  pwaBackgroundColor: 'pwa.backgroundColor',
};

export type DatabaseToPropKey = keyof typeof DATABASE_TO_PROP;

export async function readDatabaseSettings() {
  let ziplineTable = await prisma.zipline.findFirst({
    omit: {
      createdAt: true,
      updatedAt: true,
      id: true,
      firstSetup: true,
    },
  });

  if (!ziplineTable) {
    ziplineTable = await prisma.zipline.create({
      data: {
        coreTempDirectory: join(tmpdir(), 'zipline'),
      },
      omit: {
        createdAt: true,
        updatedAt: true,
        id: true,
        firstSetup: true,
      },
    });
  }

  return ziplineTable;
}
