import { Prisma } from '@prisma/client';
import { prisma } from '.';
import { replaceDatabaseValueWithEnv } from '../config/read';

export const SettingsExtension = Prisma.defineExtension({
  name: 'settings',
  model: {
    zipline: {
      async getSettings(...args: any[]) {
        let settings = await prisma.zipline.findFirst(...args);
        if (!settings) {
          return settings;
        }
        // I was going to do a loop, but i kept getting typescript errors. please forgive me
        settings = {
          id: settings.id,
          createdAt: settings.createdAt,
          updatedAt: settings.updatedAt,
          firstSetup: settings.firstSetup,
          coreReturnHttpsUrls: replaceDatabaseValueWithEnv(
            'coreReturnHttpsUrls',
            settings.coreReturnHttpsUrls,
            'boolean',
          ),
          coreDefaultDomain: replaceDatabaseValueWithEnv(
            'coreDefaultDomain',
            settings.coreDefaultDomain,
            'string',
          ),
          coreTempDirectory: replaceDatabaseValueWithEnv(
            'coreTempDirectory',
            settings.coreTempDirectory,
            'string',
          ),
          chunksMax: replaceDatabaseValueWithEnv('chunksMax', settings.chunksMax, 'string'),
          chunksSize: replaceDatabaseValueWithEnv('chunksSize', settings.chunksSize, 'string'),
          chunksEnabled: replaceDatabaseValueWithEnv('chunksEnabled', settings.chunksEnabled, 'boolean'),
          tasksDeleteInterval: replaceDatabaseValueWithEnv(
            'tasksDeleteInterval',
            settings.tasksDeleteInterval,
            'ms',
          ),
          tasksClearInvitesInterval: replaceDatabaseValueWithEnv(
            'tasksClearInvitesInterval',
            settings.tasksClearInvitesInterval,
            'ms',
          ),
          tasksMaxViewsInterval: replaceDatabaseValueWithEnv(
            'tasksMaxViewsInterval',
            settings.tasksMaxViewsInterval,
            'ms',
          ),
          tasksThumbnailsInterval: replaceDatabaseValueWithEnv(
            'tasksThumbnailsInterval',
            settings.tasksThumbnailsInterval,
            'ms',
          ),
          tasksMetricsInterval: replaceDatabaseValueWithEnv(
            'tasksMetricsInterval',
            settings.tasksMetricsInterval,
            'ms',
          ),
          filesRoute: replaceDatabaseValueWithEnv('filesRoute', settings.filesRoute, 'string'),
          filesLength: replaceDatabaseValueWithEnv('filesLength', settings.filesLength, 'number'),
          filesDefaultFormat: replaceDatabaseValueWithEnv(
            'filesDefaultFormat',
            settings.filesDefaultFormat,
            'string',
          ),
          filesDisabledExtensions: replaceDatabaseValueWithEnv(
            'filesDisabledExtensions',
            settings.filesDisabledExtensions,
            'string[]',
          ),
          filesMaxFileSize: replaceDatabaseValueWithEnv(
            'filesMaxFileSize',
            settings.filesMaxFileSize,
            'byte',
          ),
          filesDefaultExpiration: replaceDatabaseValueWithEnv(
            'filesDefaultExpiration',
            settings.filesDefaultExpiration,
            'string',
          ),
          filesAssumeMimetypes: replaceDatabaseValueWithEnv(
            'filesAssumeMimetypes',
            settings.filesAssumeMimetypes,
            'boolean',
          ),
          filesDefaultDateFormat: replaceDatabaseValueWithEnv(
            'filesDefaultDateFormat',
            settings.filesDefaultDateFormat,
            'string',
          ),
          filesRemoveGpsMetadata: replaceDatabaseValueWithEnv(
            'filesRemoveGpsMetadata',
            settings.filesRemoveGpsMetadata,
            'boolean',
          ),
          filesRandomWordsNumAdjectives: replaceDatabaseValueWithEnv(
            'filesRandomWordsNumAdjectives',
            settings.filesRandomWordsNumAdjectives,
            'number',
          ),
          filesRandomWordsSeparator: replaceDatabaseValueWithEnv(
            'filesRandomWordsSeparator',
            settings.filesRandomWordsSeparator,
            'string',
          ),
          urlsRoute: replaceDatabaseValueWithEnv('urlsRoute', settings.urlsRoute, 'string'),
          urlsLength: replaceDatabaseValueWithEnv('urlsLength', settings.urlsLength, 'number'),
          featuresImageCompression: replaceDatabaseValueWithEnv(
            'featuresImageCompression',
            settings.featuresImageCompression,
            'boolean',
          ),
          featuresRobotsTxt: replaceDatabaseValueWithEnv(
            'featuresRobotsTxt',
            settings.featuresRobotsTxt,
            'boolean',
          ),
          featuresHealthcheck: replaceDatabaseValueWithEnv(
            'featuresHealthcheck',
            settings.featuresHealthcheck,
            'boolean',
          ),
          featuresUserRegistration: replaceDatabaseValueWithEnv(
            'featuresUserRegistration',
            settings.featuresUserRegistration,
            'boolean',
          ),
          featuresOauthRegistration: replaceDatabaseValueWithEnv(
            'featuresOauthRegistration',
            settings.featuresOauthRegistration,
            'boolean',
          ),
          featuresDeleteOnMaxViews: replaceDatabaseValueWithEnv(
            'featuresDeleteOnMaxViews',
            settings.featuresDeleteOnMaxViews,
            'boolean',
          ),
          featuresThumbnailsEnabled: replaceDatabaseValueWithEnv(
            'featuresThumbnailsEnabled',
            settings.featuresThumbnailsEnabled,
            'boolean',
          ),
          featuresThumbnailsNumberThreads: replaceDatabaseValueWithEnv(
            'featuresThumbnailsNumberThreads',
            settings.featuresThumbnailsNumberThreads,
            'number',
          ),
          featuresMetricsEnabled: replaceDatabaseValueWithEnv(
            'featuresMetricsEnabled',
            settings.featuresMetricsEnabled,
            'boolean',
          ),
          featuresMetricsAdminOnly: replaceDatabaseValueWithEnv(
            'featuresMetricsAdminOnly',
            settings.featuresMetricsAdminOnly,
            'boolean',
          ),
          featuresMetricsShowUserSpecific: replaceDatabaseValueWithEnv(
            'featuresMetricsShowUserSpecific',
            settings.featuresMetricsShowUserSpecific,
            'boolean',
          ),
          invitesEnabled: replaceDatabaseValueWithEnv('invitesEnabled', settings.invitesEnabled, 'boolean'),
          invitesLength: replaceDatabaseValueWithEnv('invitesLength', settings.invitesLength, 'number'),
          websiteTitle: replaceDatabaseValueWithEnv('websiteTitle', settings.websiteTitle, 'string'),
          websiteTitleLogo: replaceDatabaseValueWithEnv(
            'websiteTitleLogo',
            settings.websiteTitleLogo,
            'string',
          ),
          websiteExternalLinks: replaceDatabaseValueWithEnv(
            'websiteExternalLinks',
            settings.websiteExternalLinks,
            'json[]',
          ),
          websiteLoginBackground: replaceDatabaseValueWithEnv(
            'websiteLoginBackground',
            settings.websiteLoginBackground,
            'string',
          ),
          websiteLoginBackgroundBlur: replaceDatabaseValueWithEnv(
            'websiteLoginBackgroundBlur',
            settings.websiteLoginBackgroundBlur,
            'boolean',
          ),
          websiteDefaultAvatar: replaceDatabaseValueWithEnv(
            'websiteDefaultAvatar',
            settings.websiteDefaultAvatar,
            'string',
          ),
          websiteTos: replaceDatabaseValueWithEnv('websiteTos', settings.websiteTos, 'string'),
          websiteThemeDefault: replaceDatabaseValueWithEnv(
            'websiteThemeDefault',
            settings.websiteThemeDefault,
            'string',
          ),
          websiteThemeDark: replaceDatabaseValueWithEnv(
            'websiteThemeDark',
            settings.websiteThemeDark,
            'string',
          ),
          websiteThemeLight: replaceDatabaseValueWithEnv(
            'websiteThemeLight',
            settings.websiteThemeLight,
            'string',
          ),
          oauthBypassLocalLogin: replaceDatabaseValueWithEnv(
            'oauthBypassLocalLogin',
            settings.oauthBypassLocalLogin,
            'boolean',
          ),
          oauthLoginOnly: replaceDatabaseValueWithEnv('oauthLoginOnly', settings.oauthLoginOnly, 'boolean'),
          oauthDiscordClientId: replaceDatabaseValueWithEnv(
            'oauthDiscordClientId',
            settings.oauthDiscordClientId,
            'string',
          ),
          oauthDiscordClientSecret: replaceDatabaseValueWithEnv(
            'oauthDiscordClientSecret',
            settings.oauthDiscordClientSecret,
            'string',
          ),
          oauthDiscordRedirectUri: replaceDatabaseValueWithEnv(
            'oauthDiscordRedirectUri',
            settings.oauthDiscordRedirectUri,
            'string',
          ),
          oauthGoogleClientId: replaceDatabaseValueWithEnv(
            'oauthGoogleClientId',
            settings.oauthGoogleClientId,
            'string',
          ),
          oauthGoogleClientSecret: replaceDatabaseValueWithEnv(
            'oauthGoogleClientSecret',
            settings.oauthGoogleClientSecret,
            'string',
          ),
          oauthGoogleRedirectUri: replaceDatabaseValueWithEnv(
            'oauthGoogleRedirectUri',
            settings.oauthGoogleRedirectUri,
            'string',
          ),
          oauthGithubClientId: replaceDatabaseValueWithEnv(
            'oauthGithubClientId',
            settings.oauthGithubClientId,
            'string',
          ),
          oauthGithubClientSecret: replaceDatabaseValueWithEnv(
            'oauthGithubClientSecret',
            settings.oauthGithubClientSecret,
            'string',
          ),
          oauthGithubRedirectUri: replaceDatabaseValueWithEnv(
            'oauthGithubRedirectUri',
            settings.oauthGithubRedirectUri,
            'string',
          ),
          oauthOidcClientId: replaceDatabaseValueWithEnv(
            'oauthOidcClientId',
            settings.oauthOidcClientId,
            'string',
          ),
          oauthOidcClientSecret: replaceDatabaseValueWithEnv(
            'oauthOidcClientSecret',
            settings.oauthOidcClientSecret,
            'string',
          ),
          oauthOidcAuthorizeUrl: replaceDatabaseValueWithEnv(
            'oauthOidcAuthorizeUrl',
            settings.oauthOidcAuthorizeUrl,
            'string',
          ),
          oauthOidcUserinfoUrl: replaceDatabaseValueWithEnv(
            'oauthOidcUserinfoUrl',
            settings.oauthOidcUserinfoUrl,
            'string',
          ),
          oauthOidcTokenUrl: replaceDatabaseValueWithEnv(
            'oauthOidcTokenUrl',
            settings.oauthOidcTokenUrl,
            'string',
          ),
          oauthOidcRedirectUri: replaceDatabaseValueWithEnv(
            'oauthOidcRedirectUri',
            settings.oauthOidcRedirectUri,
            'string',
          ),
          mfaTotpEnabled: replaceDatabaseValueWithEnv('mfaTotpEnabled', settings.mfaTotpEnabled, 'boolean'),
          mfaTotpIssuer: replaceDatabaseValueWithEnv('mfaTotpIssuer', settings.mfaTotpIssuer, 'string'),
          mfaPasskeys: replaceDatabaseValueWithEnv('mfaPasskeys', settings.mfaPasskeys, 'boolean'),
          ratelimitEnabled: replaceDatabaseValueWithEnv(
            'ratelimitEnabled',
            settings.ratelimitEnabled,
            'boolean',
          ),
          ratelimitMax: replaceDatabaseValueWithEnv('ratelimitMax', settings.ratelimitMax, 'number'),
          ratelimitWindow: replaceDatabaseValueWithEnv('ratelimitWindow', settings.ratelimitWindow, 'number'),
          ratelimitAdminBypass: replaceDatabaseValueWithEnv(
            'ratelimitAdminBypass',
            settings.ratelimitAdminBypass,
            'boolean',
          ),
          ratelimitAllowList: replaceDatabaseValueWithEnv(
            'ratelimitAllowList',
            settings.ratelimitAllowList,
            'string[]',
          ),
          httpWebhookOnUpload: replaceDatabaseValueWithEnv(
            'httpWebhookOnUpload',
            settings.httpWebhookOnUpload,
            'string',
          ),
          httpWebhookOnShorten: replaceDatabaseValueWithEnv(
            'httpWebhookOnShorten',
            settings.httpWebhookOnShorten,
            'string',
          ),
          discordWebhookUrl: replaceDatabaseValueWithEnv(
            'discordWebhookUrl',
            settings.discordWebhookUrl,
            'string',
          ),
          discordUsername: replaceDatabaseValueWithEnv('discordUsername', settings.discordUsername, 'string'),
          discordAvatarUrl: replaceDatabaseValueWithEnv(
            'discordAvatarUrl',
            settings.discordAvatarUrl,
            'string',
          ),
          discordOnUploadWebhookUrl: replaceDatabaseValueWithEnv(
            'discordOnUploadWebhookUrl',
            settings.discordOnUploadWebhookUrl,
            'string',
          ),
          discordOnUploadUsername: replaceDatabaseValueWithEnv(
            'discordOnUploadUsername',
            settings.discordOnUploadUsername,
            'string',
          ),
          discordOnUploadAvatarUrl: replaceDatabaseValueWithEnv(
            'discordOnUploadAvatarUrl',
            settings.discordOnUploadAvatarUrl,
            'string',
          ),
          discordOnUploadContent: replaceDatabaseValueWithEnv(
            'discordOnUploadContent',
            settings.discordOnUploadContent,
            'string',
          ),
          discordOnUploadEmbed: replaceDatabaseValueWithEnv(
            'discordOnUploadEmbed',
            settings.discordOnUploadEmbed,
            'json[]',
          ),
          discordOnShortenWebhookUrl: replaceDatabaseValueWithEnv(
            'discordOnShortenWebhookUrl',
            settings.discordOnShortenWebhookUrl,
            'string',
          ),
          discordOnShortenUsername: replaceDatabaseValueWithEnv(
            'discordOnShortenUsername',
            settings.discordOnShortenUsername,
            'string',
          ),
          discordOnShortenAvatarUrl: replaceDatabaseValueWithEnv(
            'discordOnShortenAvatarUrl',
            settings.discordOnShortenAvatarUrl,
            'string',
          ),
          discordOnShortenContent: replaceDatabaseValueWithEnv(
            'discordOnShortenContent',
            settings.discordOnShortenContent,
            'string',
          ),
          discordOnShortenEmbed: replaceDatabaseValueWithEnv(
            'discordOnShortenEmbed',
            settings.discordOnShortenEmbed,
            'json[]',
          ),
          pwaEnabled: replaceDatabaseValueWithEnv('pwaEnabled', settings.pwaEnabled, 'boolean'),
          pwaTitle: replaceDatabaseValueWithEnv('pwaTitle', settings.pwaTitle, 'string'),
          pwaShortName: replaceDatabaseValueWithEnv('pwaShortName', settings.pwaShortName, 'string'),
          pwaDescription: replaceDatabaseValueWithEnv('pwaDescription', settings.pwaDescription, 'string'),
          pwaThemeColor: replaceDatabaseValueWithEnv('pwaThemeColor', settings.pwaThemeColor, 'string'),
          pwaBackgroundColor: replaceDatabaseValueWithEnv(
            'pwaBackgroundColor',
            settings.pwaBackgroundColor,
            'string',
          ),
        };
        return settings;
      },
      async getSettingsRaw(...args: any[]) {
        return await prisma.zipline.findFirst(...args);
      },
    },
  },
});
