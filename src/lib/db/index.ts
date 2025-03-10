import { log } from '@/lib/logger';
import { Prisma, PrismaClient } from '@prisma/client';
import { userViewSchema } from './models/user';
import { metricDataSchema } from './models/metric';
import { metadataSchema } from './models/incompleteFile';
import { replaceDatabaseValueWithEnv } from '../config/read';

const building = !!process.env.ZIPLINE_BUILD;

let prisma: ExtendedPrismaClient;

declare global {
  // eslint-disable-next-line no-var
  var __db__: ExtendedPrismaClient;
}

if (!global.__db__) {
  if (!building) global.__db__ = getClient();
}

// eslint-disable-next-line prefer-const
prisma = global.__db__;

type ExtendedPrismaClient = ReturnType<typeof getClient>;

function parseDbLog(env: string): Prisma.LogLevel[] {
  if (env === 'true') return ['query'];

  return env
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v) as unknown as Prisma.LogLevel[];
}

function getClient() {
  const logger = log('db');

  logger.info('connecting to database ' + process.env.DATABASE_URL);

  const client = new PrismaClient({
    log: process.env.ZIPLINE_DB_LOG ? parseDbLog(process.env.ZIPLINE_DB_LOG) : undefined,
  }).$extends({
    result: {
      file: {
        size: {
          needs: { size: true },
          compute({ size }: { size: bigint }) {
            return Number(size);
          },
        },
      },
      user: {
        view: {
          needs: { view: true },
          compute({ view }: { view: Prisma.JsonValue }) {
            return userViewSchema.parse(view);
          },
        },
      },
      metric: {
        data: {
          needs: { data: true },
          compute({ data }: { data: Prisma.JsonValue }) {
            return metricDataSchema.parse(data);
          },
        },
      },
      incompleteFile: {
        metadata: {
          needs: { metadata: true },
          compute({ metadata }: { metadata: Prisma.JsonValue }) {
            return metadataSchema.parse(metadata);
          },
        },
      },
      // coreReturnHttpsUrls: 'core.returnHttpsUrls',
      // coreDefaultDomain: 'core.defaultDomain',
      // coreTempDirectory: 'core.tempDirectory',

      // chunksMax: 'chunks.max',
      // chunksSize: 'chunks.size',
      // chunksEnabled: 'chunks.enabled',

      // tasksDeleteInterval: 'tasks.deleteInterval',
      // tasksClearInvitesInterval: 'tasks.clearInvitesInterval',
      // tasksMaxViewsInterval: 'tasks.maxViewsInterval',
      // tasksThumbnailsInterval: 'tasks.thumbnailsInterval',
      // tasksMetricsInterval: 'tasks.metricsInterval',

      // filesRoute: 'files.route',
      // filesLength: 'files.length',
      // filesDefaultFormat: 'files.defaultFormat',
      // filesDisabledExtensions: 'files.disabledExtensions',
      // filesMaxFileSize: 'files.maxFileSize',
      // filesDefaultExpiration: 'files.defaultExpiration',
      // filesAssumeMimetypes: 'files.assumeMimetypes',
      // filesDefaultDateFormat: 'files.defaultDateFormat',
      // filesRemoveGpsMetadata: 'files.removeGpsMetadata',
      // filesRandomWordsNumAdjectives: 'files.randomWordsNumAdjectives',
      // filesRandomWordsSeparator: 'files.randomWordsSeparator',

      // urlsRoute: 'urls.route',
      // urlsLength: 'urls.length',

      // featuresImageCompression: 'features.imageCompression',
      // featuresRobotsTxt: 'features.robotsTxt',
      // featuresHealthcheck: 'features.healthcheck',
      // featuresUserRegistration: 'features.userRegistration',
      // featuresOauthRegistration: 'features.oauthRegistration',
      // featuresDeleteOnMaxViews: 'features.deleteOnMaxViews',

      // featuresThumbnailsEnabled: 'features.thumbnails.enabled',
      // featuresThumbnailsNumberThreads: 'features.thumbnails.num_threads',

      // featuresMetricsEnabled: 'features.metrics.enabled',
      // featuresMetricsAdminOnly: 'features.metrics.adminOnly',
      // featuresMetricsShowUserSpecific: 'features.metrics.showUserSpecific',

      // invitesEnabled: 'invites.enabled',
      // invitesLength: 'invites.length',

      // websiteTitle: 'website.title',
      // websiteTitleLogo: 'website.titleLogo',
      // websiteExternalLinks: 'website.externalLinks',
      // websiteLoginBackground: 'website.loginBackground',
      // websiteLoginBackgroundBlur: 'website.loginBackgroundBlur',
      // websiteDefaultAvatar: 'website.defaultAvatar',
      // websiteTos: 'website.tos',

      // websiteThemeDefault: 'website.theme.default',
      // websiteThemeDark: 'website.theme.dark',
      // websiteThemeLight: 'website.theme.light',

      // oauthBypassLocalLogin: 'oauth.bypassLocalLogin',
      // oauthLoginOnly: 'oauth.loginOnly',

      // oauthDiscordClientId: 'oauth.discord.clientId',
      // oauthDiscordClientSecret: 'oauth.discord.clientSecret',
      // oauthDiscordRedirectUri: 'oauth.discord.redirectUri',

      // oauthGoogleClientId: 'oauth.google.clientId',
      // oauthGoogleClientSecret: 'oauth.google.clientSecret',
      // oauthGoogleRedirectUri: 'oauth.google.redirectUri',

      // oauthGithubClientId: 'oauth.github.clientId',
      // oauthGithubClientSecret: 'oauth.github.clientSecret',
      // oauthGithubRedirectUri: 'oauth.github.redirectUri',

      // oauthOidcClientId: 'oauth.oidc.clientId',
      // oauthOidcClientSecret: 'oauth.oidc.clientSecret',
      // oauthOidcAuthorizeUrl: 'oauth.oidc.authorizeUrl',
      // oauthOidcUserinfoUrl: 'oauth.oidc.userinfoUrl',
      // oauthOidcTokenUrl: 'oauth.oidc.tokenUrl',
      // oauthOidcRedirectUri: 'oauth.oidc.redirectUri',

      // mfaTotpEnabled: 'mfa.totp.enabled',
      // mfaTotpIssuer: 'mfa.totp.issuer',
      // mfaPasskeys: 'mfa.passkeys',

      // ratelimitEnabled: 'ratelimit.enabled',
      // ratelimitMax: 'ratelimit.max',
      // ratelimitWindow: 'ratelimit.window',
      // ratelimitAdminBypass: 'ratelimit.adminBypass',
      // ratelimitAllowList: 'ratelimit.allowList',

      // httpWebhookOnUpload: 'httpWebhook.onUpload',
      // httpWebhookOnShorten: 'httpWebhook.onShorten',

      // discordWebhookUrl: 'discord.webhookUrl',
      // discordUsername: 'discord.username',
      // discordAvatarUrl: 'discord.avatarUrl',

      // discordOnUploadWebhookUrl: 'discord.onUpload.webhookUrl',
      // discordOnUploadUsername: 'discord.onUpload.username',
      // discordOnUploadAvatarUrl: 'discord.onUpload.avatarUrl',
      // discordOnUploadContent: 'discord.onUpload.content',
      // discordOnUploadEmbed: 'discord.onUpload.embed',

      // discordOnShortenWebhookUrl: 'discord.onShorten.webhookUrl',
      // discordOnShortenUsername: 'discord.onShorten.username',
      // discordOnShortenAvatarUrl: 'discord.onShorten.avatarUrl',
      // discordOnShortenContent: 'discord.onShorten.content',
      // discordOnShortenEmbed: 'discord.onShorten.embed',

      // pwaEnabled: 'pwa.enabled',
      // pwaTitle: 'pwa.title',
      // pwaShortName: 'pwa.shortName',
      // pwaDescription: 'pwa.description',
      // pwaThemeColor: 'pwa.themeColor',
      // pwaBackgroundColor: 'pwa.backgroundColor',

      // env('core.returnHttpsUrls', 'boolean'),
      // env('core.defaultDomain', 'string'),
      // env('core.tempDirectory', 'string'),
      
      // env('chunks.max', 'string'),
      // env('chunks.size', 'string'),
      // env('chunks.enabled', 'boolean'),

      // env('tasks.deleteInterval', 'ms'),
      // env('tasks.clearInvitesInterval', 'ms'),
      // env('tasks.maxViewsInterval', 'ms'),
      // env('tasks.thumbnailsInterval', 'ms'),
      // env('tasks.metricsInterval', 'ms'),

      // env('files.route', 'string'),
      // env('files.length', 'number'),
      // env('files.defaultFormat', 'string'),
      // env('files.disabledExtensions', 'string[]'),
      // env('files.maxFileSize', 'byte'),
      // env('files.defaultExpiration', 'string'),
      // env('files.assumeMimetypes', 'boolean'),
      // env('files.defaultDateFormat', 'string'),
      // env('files.removeGpsMetadata', 'boolean'),
      // env('files.randomWordsNumAdjectives', 'number'),
      // env('files.randomWordsSeparator', 'string'),

      // env('urls.route', 'string'),
      // env('urls.length', 'number'),

      // env('features.imageCompression', 'boolean'),
      // env('features.robotsTxt', 'boolean'),
      // env('features.healthcheck', 'boolean'),
      // env('features.userRegistration', 'boolean'),
      // env('features.oauthRegistration', 'boolean'),
      // env('features.deleteOnMaxViews', 'boolean'),
      // env('features.thumbnails.enabled', 'boolean'),
      // env('features.thumbnails.num_threads', 'number'),
      // env('features.metrics.enabled', 'boolean'),
      // env('features.metrics.adminOnly', 'boolean'),
      // env('features.metrics.showUserSpecific', 'boolean'),
      
      // env('invites.enabled', 'boolean'),
      // env('invites.length', 'number'),

      // env('website.title', 'string'),
      // env('website.titleLogo', 'string'),
      // env('website.externalLinks', 'json[]'),
      // env('website.loginBackground', 'string'),
      // env('website.loginBackgroundBlur', 'boolean'),
      // env('website.defaultAvatar', 'string'),
      // env('website.tos', 'string'),
      // env('website.theme.default', 'string'),
      // env('website.theme.dark', 'string'),
      // env('website.theme.light', 'string'),

      // env('oauth.bypassLocalLogin', 'boolean'),
      // env('oauth.loginOnly', 'boolean'),
      // env('oauth.discord.clientId', 'string'),
      // env('oauth.discord.clientSecret', 'string'),
      // env('oauth.discord.redirectUri', 'string'),
      // env('oauth.google.clientId', 'string'),
      // env('oauth.google.clientSecret', 'string'),
      // env('oauth.google.redirectUri', 'string'),
      // env('oauth.github.clientId', 'string'),
      // env('oauth.github.clientSecret', 'string'),
      // env('oauth.github.redirectUri', 'string'),
      // env('oauth.oidc.clientId', 'string'),
      // env('oauth.oidc.clientSecret', 'string'),
      // env('oauth.oidc.authorizeUrl', 'string'),
      // env('oauth.oidc.userinfoUrl', 'string'),
      // env('oauth.oidc.tokenUrl', 'string'),
      // env('oauth.oidc.redirectUri', 'string'),

      // env('mfa.totp.enabled', 'boolean'),
      // env('mfa.totp.issuer', 'string'),
      // env('mfa.passkeys', 'boolean'),

      // env('ratelimit.enabled', 'boolean'),
      // env('ratelimit.max', 'number'),
      // env('ratelimit.window', 'number'),
      // env('ratelimit.adminBypass', 'boolean'),
      // env('ratelimit.allowList', 'string[]'),

      // env('httpWebhook.onUpload', 'string'),
      // env('httpWebhook.onShorten', 'string'),

      // env('discord.webhookUrl', 'string'),
      // env('discord.username', 'string'),
      // env('discord.avatarUrl', 'string'),
      // env('discord.onUpload.webhookUrl', 'string'),
      // env('discord.onUpload.username', 'string'),
      // env('discord.onUpload.avatarUrl', 'string'),
      // env('discord.onUpload.content', 'string'),
      // env('discord.onUpload.embed', 'json[]'),
      // env('discord.onShorten.webhookUrl', 'string'),
      // env('discord.onShorten.username', 'string'),
      // env('discord.onShorten.avatarUrl', 'string'),
      // env('discord.onShorten.content', 'string'),
      // env('discord.onShorten.embed', 'json[]'),

      // env('pwa.enabled', 'boolean'),
      // env('pwa.title', 'string'),
      // env('pwa.shortName', 'string'),
      // env('pwa.description', 'string'),
      // env('pwa.themeColor', 'string'),
      // env('pwa.backgroundColor', 'string'),
      zipline: {
        coreReturnHttpsUrls: {
          needs: { coreReturnHttpsUrls: true },
          compute({ coreReturnHttpsUrls }: { coreReturnHttpsUrls: boolean }) {
            return replaceDatabaseValueWithEnv('coreReturnHttpsUrls', coreReturnHttpsUrls, 'boolean');
          },
        },
        coreDefaultDomain: {
          needs: { coreDefaultDomain: true },
          compute({ coreDefaultDomain }: { coreDefaultDomain: string }) {
            return replaceDatabaseValueWithEnv('coreDefaultDomain', coreDefaultDomain, 'string');
          },
        },
        coreTempDirectory: {
          needs: { coreTempDirectory: true },
          compute({ coreTempDirectory }: { coreTempDirectory: string }) {
            return replaceDatabaseValueWithEnv('coreTempDirectory', coreTempDirectory, 'string');
          },
        },
        chunksMax: {
          needs: { chunksMax: true },
          compute({ chunksMax }: { chunksMax: string }) {
            return replaceDatabaseValueWithEnv('chunksMax', chunksMax, 'string');
          },
        },
        chunksSize: {
          needs: { chunksSize: true },
          compute({ chunksSize }: { chunksSize: string }) {
            return replaceDatabaseValueWithEnv('chunksSize', chunksSize, 'string');
          },
        },
        chunksEnabled: {
          needs: { chunksEnabled: true },
          compute({ chunksEnabled }: { chunksEnabled: boolean }) {
            return replaceDatabaseValueWithEnv('chunksEnabled', chunksEnabled, 'boolean');
          },
        },
        tasksDeleteInterval: {
          needs: { tasksDeleteInterval: true },
          compute({ tasksDeleteInterval }: { tasksDeleteInterval: string }) {
            return replaceDatabaseValueWithEnv('tasksDeleteInterval', tasksDeleteInterval, 'ms');
          },
        },
        tasksClearInvitesInterval: {
          needs: { tasksClearInvitesInterval: true },
          compute({ tasksClearInvitesInterval }: { tasksClearInvitesInterval: string }) {
            return replaceDatabaseValueWithEnv('tasksClearInvitesInterval', tasksClearInvitesInterval, 'ms');
          },
        },
        tasksMaxViewsInterval: {
          needs: { tasksMaxViewsInterval: true },
          compute({ tasksMaxViewsInterval }: { tasksMaxViewsInterval: string }) {
            return replaceDatabaseValueWithEnv('tasksMaxViewsInterval', tasksMaxViewsInterval, 'ms');
          },
        },
        tasksThumbnailsInterval: {
          needs: { tasksThumbnailsInterval: true },
          compute({ tasksThumbnailsInterval }: { tasksThumbnailsInterval: string }) {
            return replaceDatabaseValueWithEnv('tasksThumbnailsInterval', tasksThumbnailsInterval, 'ms');
          },
        },
        tasksMetricsInterval: {
          needs: { tasksMetricsInterval: true },
          compute({ tasksMetricsInterval }: { tasksMetricsInterval: string }) {
            return replaceDatabaseValueWithEnv('tasksMetricsInterval', tasksMetricsInterval, 'ms');
          },
        },
        filesRoute: {
          needs: { filesRoute: true },
          compute({ filesRoute }: { filesRoute: string }) {
            return replaceDatabaseValueWithEnv('filesRoute', filesRoute, 'string');
          },
        },
        filesLength: {
          needs: { filesLength: true },
          compute({ filesLength }: { filesLength: number }) {
            return replaceDatabaseValueWithEnv('filesLength', filesLength, 'number');
          },
        },
        filesDefaultFormat: {
          needs: { filesDefaultFormat: true },
          compute({ filesDefaultFormat }: { filesDefaultFormat: string }) {
            return replaceDatabaseValueWithEnv('filesDefaultFormat', filesDefaultFormat, 'string');
          },
        },
        filesDisabledExtensions: {
          needs: { filesDisabledExtensions: true },
          compute({ filesDisabledExtensions }: { filesDisabledExtensions: string[] }) {
            return replaceDatabaseValueWithEnv('filesDisabledExtensions', filesDisabledExtensions, 'string[]');
          },
        },
        filesMaxFileSize: {
          needs: { filesMaxFileSize: true },
          compute({ filesMaxFileSize }: { filesMaxFileSize: string}) {
            return replaceDatabaseValueWithEnv('filesMaxFileSize', filesMaxFileSize, 'byte');
          },
        },
        filesDefaultExpiration: {
          needs: { filesDefaultExpiration: true },
          compute({ filesDefaultExpiration }: { filesDefaultExpiration: string }) {
            return replaceDatabaseValueWithEnv('filesDefaultExpiration', filesDefaultExpiration, 'string');
          },
        },
        filesAssumeMimetypes: {
          needs: { filesAssumeMimetypes: true },
          compute({ filesAssumeMimetypes }: { filesAssumeMimetypes: boolean }) {
            return replaceDatabaseValueWithEnv('filesAssumeMimetypes', filesAssumeMimetypes, 'boolean');
          },
        },
        filesDefaultDateFormat: {
          needs: { filesDefaultDateFormat: true },
          compute({ filesDefaultDateFormat }: { filesDefaultDateFormat: string }) {
            return replaceDatabaseValueWithEnv('filesDefaultDateFormat', filesDefaultDateFormat, 'string');
          },
        },
        filesRemoveGpsMetadata: {
          needs: { filesRemoveGpsMetadata: true },
          compute({ filesRemoveGpsMetadata }: { filesRemoveGpsMetadata: boolean }) {
            return replaceDatabaseValueWithEnv('filesRemoveGpsMetadata', filesRemoveGpsMetadata, 'boolean');
          },
        },
        filesRandomWordsNumAdjectives: {
          needs: { filesRandomWordsNumAdjectives: true },
          compute({ filesRandomWordsNumAdjectives }: { filesRandomWordsNumAdjectives: number }) {
            return replaceDatabaseValueWithEnv('filesRandomWordsNumAdjectives', filesRandomWordsNumAdjectives, 'number');
          },
        },
        filesRandomWordsSeparator: {
          needs: { filesRandomWordsSeparator: true },
          compute({ filesRandomWordsSeparator }: { filesRandomWordsSeparator: string }) {
            return replaceDatabaseValueWithEnv('filesRandomWordsSeparator', filesRandomWordsSeparator, 'string');
          },
        },
        urlsRoute: {
          needs: { urlsRoute: true },
          compute({ urlsRoute }: { urlsRoute: string }) {
            return replaceDatabaseValueWithEnv('urlsRoute', urlsRoute, 'string');
          },
        },
        urlsLength: {
          needs: { urlsLength: true },
          compute({ urlsLength }: { urlsLength: number }) {
            return replaceDatabaseValueWithEnv('urlsLength', urlsLength, 'number');
          },
        },
        featuresImageCompression: {
          needs: { featuresImageCompression: true },
          compute({ featuresImageCompression }: { featuresImageCompression: boolean }) {
            return replaceDatabaseValueWithEnv('featuresImageCompression', featuresImageCompression, 'boolean');
          },
        },
        featuresRobotsTxt: {
          needs: { featuresRobotsTxt: true },
          compute({ featuresRobotsTxt }: { featuresRobotsTxt: boolean }) {
            return replaceDatabaseValueWithEnv('featuresRobotsTxt', featuresRobotsTxt, 'boolean');
          },
        },
        featuresHealthcheck: {
          needs: { featuresHealthcheck: true },
          compute({ featuresHealthcheck }: { featuresHealthcheck: boolean }) {
            return replaceDatabaseValueWithEnv('featuresHealthcheck', featuresHealthcheck, 'boolean');
          },
        },
        featuresUserRegistration: {
          needs: { featuresUserRegistration: true },
          compute({ featuresUserRegistration }: { featuresUserRegistration: boolean }) {
            return replaceDatabaseValueWithEnv('featuresUserRegistration', featuresUserRegistration, 'boolean');
          },
        },
        featuresOauthRegistration: {
          needs: { featuresOauthRegistration: true },
          compute({ featuresOauthRegistration }: { featuresOauthRegistration: boolean }) {
            return replaceDatabaseValueWithEnv('featuresOauthRegistration', featuresOauthRegistration, 'boolean');
          },
        },
        featuresDeleteOnMaxViews: {
          needs: { featuresDeleteOnMaxViews: true },
          compute({ featuresDeleteOnMaxViews }: { featuresDeleteOnMaxViews: boolean }) {
            return replaceDatabaseValueWithEnv('featuresDeleteOnMaxViews', featuresDeleteOnMaxViews, 'boolean');
          },
        },
        featuresThumbnailsEnabled: {
          needs: { featuresThumbnailsEnabled: true },
          compute({ featuresThumbnailsEnabled }: { featuresThumbnailsEnabled: boolean }) {
            return replaceDatabaseValueWithEnv('featuresThumbnailsEnabled', featuresThumbnailsEnabled, 'boolean');
          },
        },
        featuresThumbnailsNumberThreads: {
          needs: { featuresThumbnailsNumberThreads: true },
          compute({ featuresThumbnailsNumberThreads }: { featuresThumbnailsNumberThreads: number }) {
            return replaceDatabaseValueWithEnv('featuresThumbnailsNumberThreads', featuresThumbnailsNumberThreads, 'number');
          },
        },
        featuresMetricsEnabled: {
          needs: { featuresMetricsEnabled: true },
          compute({ featuresMetricsEnabled }: { featuresMetricsEnabled: boolean }) {
            return replaceDatabaseValueWithEnv('featuresMetricsEnabled', featuresMetricsEnabled, 'boolean');
          },
        },
        featuresMetricsAdminOnly: {
          needs: { featuresMetricsAdminOnly: true },
          compute({ featuresMetricsAdminOnly }: { featuresMetricsAdminOnly: boolean }) {
            return replaceDatabaseValueWithEnv('featuresMetricsAdminOnly', featuresMetricsAdminOnly, 'boolean');
          },
        },
        featuresMetricsShowUserSpecific: {
          needs: { featuresMetricsShowUserSpecific: true },
          compute({ featuresMetricsShowUserSpecific }: { featuresMetricsShowUserSpecific: boolean }) {
            return replaceDatabaseValueWithEnv('featuresMetricsShowUserSpecific', featuresMetricsShowUserSpecific, 'boolean');
          },
        },
        invitesEnabled: {
          needs: { invitesEnabled: true },
          compute({ invitesEnabled }: { invitesEnabled: boolean }) {
            return replaceDatabaseValueWithEnv('invitesEnabled', invitesEnabled, 'boolean');
          },
        },
        invitesLength: {
          needs: { invitesLength: true },
          compute({ invitesLength }: { invitesLength: number }) {
            return replaceDatabaseValueWithEnv('invitesLength', invitesLength, 'number');
          },
        },
        websiteTitle: {
          needs: { websiteTitle: true },
          compute({ websiteTitle }: { websiteTitle: string }) {
            return replaceDatabaseValueWithEnv('websiteTitle', websiteTitle, 'string');
          },
        },
        websiteTitleLogo: {
          needs: { websiteTitleLogo: true },
          compute({ websiteTitleLogo }: { websiteTitleLogo: string }) {
            return replaceDatabaseValueWithEnv('websiteTitleLogo', websiteTitleLogo, 'string');
          },
        },
        websiteExternalLinks: {
          needs: { websiteExternalLinks: true },
          compute({ websiteExternalLinks }: { websiteExternalLinks: Prisma.JsonValue }) {
            return replaceDatabaseValueWithEnv('websiteExternalLinks', websiteExternalLinks, 'json[]');
          },
        },
        websiteLoginBackground: {
          needs: { websiteLoginBackground: true },
          compute({ websiteLoginBackground }: { websiteLoginBackground: string }) {
            return replaceDatabaseValueWithEnv('websiteLoginBackground', websiteLoginBackground, 'string');
          },
        },
        websiteLoginBackgroundBlur: {
          needs: { websiteLoginBackgroundBlur: true },
          compute({ websiteLoginBackgroundBlur }: { websiteLoginBackgroundBlur: boolean }) {
            return replaceDatabaseValueWithEnv('websiteLoginBackgroundBlur', websiteLoginBackgroundBlur, 'boolean');
          },
        },
        websiteDefaultAvatar: {
          needs: { websiteDefaultAvatar: true },
          compute({ websiteDefaultAvatar }: { websiteDefaultAvatar: string }) {
            return replaceDatabaseValueWithEnv('websiteDefaultAvatar', websiteDefaultAvatar, 'string');
          },
        },
        websiteTos: {
          needs: { websiteTos: true },
          compute({ websiteTos }: { websiteTos: string }) {
            return replaceDatabaseValueWithEnv('websiteTos', websiteTos, 'string');
          },
        },
        websiteThemeDefault: {
          needs: { websiteThemeDefault: true },
          compute({ websiteThemeDefault }: { websiteThemeDefault: string }) {
            return replaceDatabaseValueWithEnv('websiteThemeDefault', websiteThemeDefault, 'string');
          },
        },
        websiteThemeDark: {
          needs: { websiteThemeDark: true },
          compute({ websiteThemeDark }: { websiteThemeDark: string }) {
            return replaceDatabaseValueWithEnv('websiteThemeDark', websiteThemeDark, 'string');
          },
        },
        websiteThemeLight: {
          needs: { websiteThemeLight: true },
          compute({ websiteThemeLight }: { websiteThemeLight: string }) {
            return replaceDatabaseValueWithEnv('websiteThemeLight', websiteThemeLight, 'string');
          },
        },
        oauthBypassLocalLogin: {
          needs: { oauthBypassLocalLogin: true },
          compute({ oauthBypassLocalLogin }: { oauthBypassLocalLogin: boolean }) {
            return replaceDatabaseValueWithEnv('oauthBypassLocalLogin', oauthBypassLocalLogin, 'boolean');
          },
        },
        oauthLoginOnly: {
          needs: { oauthLoginOnly: true },
          compute({ oauthLoginOnly }: { oauthLoginOnly: boolean }) {
            return replaceDatabaseValueWithEnv('oauthLoginOnly', oauthLoginOnly, 'boolean');
          },
        },
        oauthDiscordClientId: {
          needs: { oauthDiscordClientId: true },
          compute({ oauthDiscordClientId }: { oauthDiscordClientId: string }) {
            return replaceDatabaseValueWithEnv('oauthDiscordClientId', oauthDiscordClientId, 'string');
          },
        },
        oauthDiscordClientSecret: {
          needs: { oauthDiscordClientSecret: true },
          compute({ oauthDiscordClientSecret }: { oauthDiscordClientSecret: string }) {
            return replaceDatabaseValueWithEnv('oauthDiscordClientSecret', oauthDiscordClientSecret, 'string');
          },
        },
        oauthDiscordRedirectUri: {
          needs: { oauthDiscordRedirectUri: true },
          compute({ oauthDiscordRedirectUri }: { oauthDiscordRedirectUri: string }) {
            return replaceDatabaseValueWithEnv('oauthDiscordRedirectUri', oauthDiscordRedirectUri, 'string');
          },
        },
        oauthGoogleClientId: {
          needs: { oauthGoogleClientId: true },
          compute({ oauthGoogleClientId }: { oauthGoogleClientId: string }) {
            return replaceDatabaseValueWithEnv('oauthGoogleClientId', oauthGoogleClientId, 'string');
          },
        },
        oauthGoogleClientSecret: {
          needs: { oauthGoogleClientSecret: true },
          compute({ oauthGoogleClientSecret }: { oauthGoogleClientSecret: string }) {
            return replaceDatabaseValueWithEnv('oauthGoogleClientSecret', oauthGoogleClientSecret, 'string');
          },
        },
        oauthGoogleRedirectUri: {
          needs: { oauthGoogleRedirectUri: true },
          compute({ oauthGoogleRedirectUri }: { oauthGoogleRedirectUri: string }) {
            return replaceDatabaseValueWithEnv('oauthGoogleRedirectUri', oauthGoogleRedirectUri, 'string');
          },
        },
        oauthGithubClientId: {
          needs: { oauthGithubClientId: true },
          compute({ oauthGithubClientId }: { oauthGithubClientId: string }) {
            return replaceDatabaseValueWithEnv('oauthGithubClientId', oauthGithubClientId, 'string');
          },
        },
        oauthGithubClientSecret: {
          needs: { oauthGithubClientSecret: true },
          compute({ oauthGithubClientSecret }: { oauthGithubClientSecret: string }) {
            return replaceDatabaseValueWithEnv('oauthGithubClientSecret', oauthGithubClientSecret, 'string');
          },
        },
        oauthGithubRedirectUri: {
          needs: { oauthGithubRedirectUri: true },
          compute({ oauthGithubRedirectUri }: { oauthGithubRedirectUri: string }) {
            return replaceDatabaseValueWithEnv('oauthGithubRedirectUri', oauthGithubRedirectUri, 'string');
          },
        },
        oauthOidcClientId: {
          needs: { oauthOidcClientId: true },
          compute({ oauthOidcClientId }: { oauthOidcClientId: string }) {
            return replaceDatabaseValueWithEnv('oauthOidcClientId', oauthOidcClientId, 'string');
          },
        },
        oauthOidcClientSecret: {
          needs: { oauthOidcClientSecret: true },
          compute({ oauthOidcClientSecret }: { oauthOidcClientSecret: string }) {
            return replaceDatabaseValueWithEnv('oauthOidcClientSecret', oauthOidcClientSecret, 'string');
          },
        },
        oauthOidcAuthorizeUrl: {
          needs: { oauthOidcAuthorizeUrl: true },
          compute({ oauthOidcAuthorizeUrl }: { oauthOidcAuthorizeUrl: string }) {
            return replaceDatabaseValueWithEnv('oauthOidcAuthorizeUrl', oauthOidcAuthorizeUrl, 'string');
          },
        },
        oauthOidcUserinfoUrl: {
          needs: { oauthOidcUserinfoUrl: true },
          compute({ oauthOidcUserinfoUrl }: { oauthOidcUserinfoUrl: string }) {
            return replaceDatabaseValueWithEnv('oauthOidcUserinfoUrl', oauthOidcUserinfoUrl, 'string');
          },
        },
        oauthOidcTokenUrl: {
          needs: { oauthOidcTokenUrl: true },
          compute({ oauthOidcTokenUrl }: { oauthOidcTokenUrl: string }) {
            return replaceDatabaseValueWithEnv('oauthOidcTokenUrl', oauthOidcTokenUrl, 'string');
          },
        },
        oauthOidcRedirectUri: {
          needs: { oauthOidcRedirectUri: true },
          compute({ oauthOidcRedirectUri }: { oauthOidcRedirectUri: string }) {
            return replaceDatabaseValueWithEnv('oauthOidcRedirectUri', oauthOidcRedirectUri, 'string');
          },
        },
        mfaTotpEnabled: {
          needs: { mfaTotpEnabled: true },
          compute({ mfaTotpEnabled }: { mfaTotpEnabled: boolean }) {
            return replaceDatabaseValueWithEnv('mfaTotpEnabled', mfaTotpEnabled, 'boolean');
          },
        },
        mfaTotpIssuer: {
          needs: { mfaTotpIssuer: true },
          compute({ mfaTotpIssuer }: { mfaTotpIssuer: string }) {
            return replaceDatabaseValueWithEnv('mfaTotpIssuer', mfaTotpIssuer, 'string');
          },
        },
        mfaPasskeys: {
          needs: { mfaPasskeys: true },
          compute({ mfaPasskeys }: { mfaPasskeys: boolean }) {
            return replaceDatabaseValueWithEnv('mfaPasskeys', mfaPasskeys, 'boolean');
          },
        },
        ratelimitEnabled: {
          needs: { ratelimitEnabled: true },
          compute({ ratelimitEnabled }: { ratelimitEnabled: boolean }) {
            return replaceDatabaseValueWithEnv('ratelimitEnabled', ratelimitEnabled, 'boolean');
          },
        },
        ratelimitMax: {
          needs: { ratelimitMax: true },
          compute({ ratelimitMax }: { ratelimitMax: number }) {
            return replaceDatabaseValueWithEnv('ratelimitMax', ratelimitMax, 'number');
          },
        },
        ratelimitWindow: {
          needs: { ratelimitWindow: true },
          compute({ ratelimitWindow }: { ratelimitWindow: number }) {
            return replaceDatabaseValueWithEnv('ratelimitWindow', ratelimitWindow, 'number');
          },
        },
        ratelimitAdminBypass: {
          needs: { ratelimitAdminBypass: true },
          compute({ ratelimitAdminBypass }: { ratelimitAdminBypass: boolean }) {
            return replaceDatabaseValueWithEnv('ratelimitAdminBypass', ratelimitAdminBypass, 'boolean');
          },
        },
        ratelimitAllowList: {
          needs: { ratelimitAllowList: true },
          compute({ ratelimitAllowList }: { ratelimitAllowList: string[] }) {
            return replaceDatabaseValueWithEnv('ratelimitAllowList', ratelimitAllowList, 'string[]');
          },
        },
        httpWebhookOnUpload: {
          needs: { httpWebhookOnUpload: true },
          compute({ httpWebhookOnUpload }: { httpWebhookOnUpload: string }) {
            return replaceDatabaseValueWithEnv('httpWebhookOnUpload', httpWebhookOnUpload, 'string');
          },
        },
        httpWebhookOnShorten: {
          needs: { httpWebhookOnShorten: true },
          compute({ httpWebhookOnShorten }: { httpWebhookOnShorten: string }) {
            return replaceDatabaseValueWithEnv('httpWebhookOnShorten', httpWebhookOnShorten, 'string');
          },
        },
        discordWebhookUrl: {
          needs: { discordWebhookUrl: true },
          compute({ discordWebhookUrl }: { discordWebhookUrl: string }) {
            return replaceDatabaseValueWithEnv('discordWebhookUrl', discordWebhookUrl, 'string');
          },
        },
        discordUsername: {
          needs: { discordUsername: true },
          compute({ discordUsername }: { discordUsername: string }) {
            return replaceDatabaseValueWithEnv('discordUsername', discordUsername, 'string');
          },
        },
        discordAvatarUrl: {
          needs: { discordAvatarUrl: true },
          compute({ discordAvatarUrl }: { discordAvatarUrl: string }) {
            return replaceDatabaseValueWithEnv('discordAvatarUrl', discordAvatarUrl, 'string');
          },
        },
        discordOnUploadWebhookUrl: {
          needs: { discordOnUploadWebhookUrl: true },
          compute({ discordOnUploadWebhookUrl }: { discordOnUploadWebhookUrl: string }) {
            return replaceDatabaseValueWithEnv('discordOnUploadWebhookUrl', discordOnUploadWebhookUrl, 'string');
          },
        },
        discordOnUploadUsername: {
          needs: { discordOnUploadUsername: true },
          compute({ discordOnUploadUsername }: { discordOnUploadUsername: string }) {
            return replaceDatabaseValueWithEnv('discordOnUploadUsername', discordOnUploadUsername, 'string');
          },
        },
        discordOnUploadAvatarUrl: {
          needs: { discordOnUploadAvatarUrl: true },
          compute({ discordOnUploadAvatarUrl }: { discordOnUploadAvatarUrl: string }) {
            return replaceDatabaseValueWithEnv('discordOnUploadAvatarUrl', discordOnUploadAvatarUrl, 'string');
          },
        },
        discordOnUploadContent: {
          needs: { discordOnUploadContent: true },
          compute({ discordOnUploadContent }: { discordOnUploadContent: string }) {
            return replaceDatabaseValueWithEnv('discordOnUploadContent', discordOnUploadContent, 'string');
          },
        },
        discordOnUploadEmbed: {
          needs: { discordOnUploadEmbed: true },
          compute({ discordOnUploadEmbed }: { discordOnUploadEmbed: Prisma.JsonValue }) {
            return replaceDatabaseValueWithEnv('discordOnUploadEmbed', discordOnUploadEmbed, 'json[]');
          },
        },
        discordOnShortenWebhookUrl: {
          needs: { discordOnShortenWebhookUrl: true },
          compute({ discordOnShortenWebhookUrl }: { discordOnShortenWebhookUrl: string }) {
            return replaceDatabaseValueWithEnv('discordOnShortenWebhookUrl', discordOnShortenWebhookUrl, 'string');
          },
        },
        discordOnShortenUsername: {
          needs: { discordOnShortenUsername: true },
          compute({ discordOnShortenUsername }: { discordOnShortenUsername: string }) {
            return replaceDatabaseValueWithEnv('discordOnShortenUsername', discordOnShortenUsername, 'string');
          },
        },
        discordOnShortenAvatarUrl: {
          needs: { discordOnShortenAvatarUrl: true },
          compute({ discordOnShortenAvatarUrl }: { discordOnShortenAvatarUrl: string }) {
            return replaceDatabaseValueWithEnv('discordOnShortenAvatarUrl', discordOnShortenAvatarUrl, 'string');
          },
        },
        discordOnShortenContent: {
          needs: { discordOnShortenContent: true },
          compute({ discordOnShortenContent }: { discordOnShortenContent: string }) {
            return replaceDatabaseValueWithEnv('discordOnShortenContent', discordOnShortenContent, 'string');
          },
        },
        discordOnShortenEmbed: {
          needs: { discordOnShortenEmbed: true },
          compute({ discordOnShortenEmbed }: { discordOnShortenEmbed: Prisma.JsonValue }) {
            return replaceDatabaseValueWithEnv('discordOnShortenEmbed', discordOnShortenEmbed, 'json[]');
          },
        },
        pwaEnabled: {
          needs: { pwaEnabled: true },
          compute({ pwaEnabled }: { pwaEnabled: boolean }) {
            return replaceDatabaseValueWithEnv('pwaEnabled', pwaEnabled, 'boolean');
          },
        },
        pwaTitle: {
          needs: { pwaTitle: true },
          compute({ pwaTitle }: { pwaTitle: string }) {
            return replaceDatabaseValueWithEnv('pwaTitle', pwaTitle, 'string');
          },
        },
        pwaShortName: {
          needs: { pwaShortName: true },
          compute({ pwaShortName }: { pwaShortName: string }) {
            return replaceDatabaseValueWithEnv('pwaShortName', pwaShortName, 'string');
          },
        },
        pwaDescription: {
          needs: { pwaDescription: true },
          compute({ pwaDescription }: { pwaDescription: string }) {
            return replaceDatabaseValueWithEnv('pwaDescription', pwaDescription, 'string');
          },
        },
        pwaThemeColor: {
          needs: { pwaThemeColor: true },
          compute({ pwaThemeColor }: { pwaThemeColor: string }) {
            return replaceDatabaseValueWithEnv('pwaThemeColor', pwaThemeColor, 'string');
          },
        },
        pwaBackgroundColor: {
          needs: { pwaBackgroundColor: true },
          compute({ pwaBackgroundColor }: { pwaBackgroundColor: string }) {
            return replaceDatabaseValueWithEnv('pwaBackgroundColor', pwaBackgroundColor, 'string');
          },
        },
      },
    },
  });
  client.$connect();

  return client;
}

export { prisma };
