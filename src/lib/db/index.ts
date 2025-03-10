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
            return replaceDatabaseValueWithEnv(
              'filesDisabledExtensions',
              filesDisabledExtensions,
              'string[]',
            );
          },
        },
        filesMaxFileSize: {
          needs: { filesMaxFileSize: true },
          compute({ filesMaxFileSize }: { filesMaxFileSize: string }) {
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
            return replaceDatabaseValueWithEnv(
              'filesRandomWordsNumAdjectives',
              filesRandomWordsNumAdjectives,
              'number',
            );
          },
        },
        filesRandomWordsSeparator: {
          needs: { filesRandomWordsSeparator: true },
          compute({ filesRandomWordsSeparator }: { filesRandomWordsSeparator: string }) {
            return replaceDatabaseValueWithEnv(
              'filesRandomWordsSeparator',
              filesRandomWordsSeparator,
              'string',
            );
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
            return replaceDatabaseValueWithEnv(
              'featuresImageCompression',
              featuresImageCompression,
              'boolean',
            );
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
            return replaceDatabaseValueWithEnv(
              'featuresUserRegistration',
              featuresUserRegistration,
              'boolean',
            );
          },
        },
        featuresOauthRegistration: {
          needs: { featuresOauthRegistration: true },
          compute({ featuresOauthRegistration }: { featuresOauthRegistration: boolean }) {
            return replaceDatabaseValueWithEnv(
              'featuresOauthRegistration',
              featuresOauthRegistration,
              'boolean',
            );
          },
        },
        featuresDeleteOnMaxViews: {
          needs: { featuresDeleteOnMaxViews: true },
          compute({ featuresDeleteOnMaxViews }: { featuresDeleteOnMaxViews: boolean }) {
            return replaceDatabaseValueWithEnv(
              'featuresDeleteOnMaxViews',
              featuresDeleteOnMaxViews,
              'boolean',
            );
          },
        },
        featuresThumbnailsEnabled: {
          needs: { featuresThumbnailsEnabled: true },
          compute({ featuresThumbnailsEnabled }: { featuresThumbnailsEnabled: boolean }) {
            return replaceDatabaseValueWithEnv(
              'featuresThumbnailsEnabled',
              featuresThumbnailsEnabled,
              'boolean',
            );
          },
        },
        featuresThumbnailsNumberThreads: {
          needs: { featuresThumbnailsNumberThreads: true },
          compute({ featuresThumbnailsNumberThreads }: { featuresThumbnailsNumberThreads: number }) {
            return replaceDatabaseValueWithEnv(
              'featuresThumbnailsNumberThreads',
              featuresThumbnailsNumberThreads,
              'number',
            );
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
            return replaceDatabaseValueWithEnv(
              'featuresMetricsAdminOnly',
              featuresMetricsAdminOnly,
              'boolean',
            );
          },
        },
        featuresMetricsShowUserSpecific: {
          needs: { featuresMetricsShowUserSpecific: true },
          compute({ featuresMetricsShowUserSpecific }: { featuresMetricsShowUserSpecific: boolean }) {
            return replaceDatabaseValueWithEnv(
              'featuresMetricsShowUserSpecific',
              featuresMetricsShowUserSpecific,
              'boolean',
            );
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
            return replaceDatabaseValueWithEnv(
              'websiteLoginBackgroundBlur',
              websiteLoginBackgroundBlur,
              'boolean',
            );
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
            return replaceDatabaseValueWithEnv(
              'oauthDiscordClientSecret',
              oauthDiscordClientSecret,
              'string',
            );
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
            return replaceDatabaseValueWithEnv(
              'discordOnUploadWebhookUrl',
              discordOnUploadWebhookUrl,
              'string',
            );
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
            return replaceDatabaseValueWithEnv(
              'discordOnUploadAvatarUrl',
              discordOnUploadAvatarUrl,
              'string',
            );
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
            return replaceDatabaseValueWithEnv(
              'discordOnShortenWebhookUrl',
              discordOnShortenWebhookUrl,
              'string',
            );
          },
        },
        discordOnShortenUsername: {
          needs: { discordOnShortenUsername: true },
          compute({ discordOnShortenUsername }: { discordOnShortenUsername: string }) {
            return replaceDatabaseValueWithEnv(
              'discordOnShortenUsername',
              discordOnShortenUsername,
              'string',
            );
          },
        },
        discordOnShortenAvatarUrl: {
          needs: { discordOnShortenAvatarUrl: true },
          compute({ discordOnShortenAvatarUrl }: { discordOnShortenAvatarUrl: string }) {
            return replaceDatabaseValueWithEnv(
              'discordOnShortenAvatarUrl',
              discordOnShortenAvatarUrl,
              'string',
            );
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
