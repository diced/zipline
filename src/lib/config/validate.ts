import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { type ZodIssue, z } from 'zod';
import { log } from '../logger';
import { PROP_TO_ENV, ParsedConfig } from './read';
import { parseSettings } from '@/server/routes/api/server/settings';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      ZIPLINE_BUILD?: string;
      ZIPLINE_DB_LOG?: string;
      ZIPLINE_OVERRIDE_DISABLED_WORKER_LOG?: string;
    }
  }
}

export const discordContent = z
  .object({
    webhookUrl: z.string().url().nullable().default(null),
    username: z.string().nullable().default(null),
    avatarUrl: z.string().nullable().default(null),
    content: z.string().nullable().default(null),
    embed: z
      .object({
        title: z.string().nullable().default(null),
        description: z.string().nullable().default(null),
        footer: z.string().nullable().default(null),
        color: z
          .string()
          .regex(/^#?([a-f0-9]{6}|[a-f0-9]{3})$/)
          .nullable()
          .default(null),
        thumbnail: z.boolean().default(false),
        imageOrVideo: z.boolean().default(false),
        timestamp: z.boolean().default(false),
        url: z.boolean().default(false),
      })
      .nullable()
      .default(null),
  })
  .nullable()
  .default(null);

export const schema = z.object({
  core: z.object({
    port: z.number().default(3000),
    hostname: z.string().default('0.0.0.0'),
    secret: z.string().superRefine((s, c) => {
      if (s === 'changethis')
        return c.addIssue({
          code: 'custom',
          message: 'Secret must be changed from the default value',
        });

      if (s.length < 32) {
        return c.addIssue({
          code: 'too_small',
          minimum: 32,
          type: 'string',
          inclusive: true,
          message: 'Secret must contain at least 32 characters',
          exact: false,
        });
      }
    }),
    databaseUrl: z.string().url(),
    returnHttpsUrls: z.boolean().default(false),
    defaultDomain: z.string().nullable().default(null),
    tempDirectory: z
      .string()
      .transform((s) => resolve(s))
      .default(join(tmpdir(), 'zipline')),
  }),
  chunks: z.object({
    max: z.string().default('95mb'),
    size: z.string().default('25mb'),
    enabled: z.boolean().default(true),
  }),
  tasks: z.object({
    deleteInterval: z.string().default('30min'),
    clearInvitesInterval: z.string().default('30min'),
    maxViewsInterval: z.string().default('30min'),
    thumbnailsInterval: z.string().default('30min'),
    metricsInterval: z.string().default('30min'),
  }),
  files: z.object({
    route: z.string().startsWith('/').min(1).trim().toLowerCase().default('/u'),
    length: z.number().default(6),
    defaultFormat: z.enum(['random', 'date', 'uuid', 'name', 'gfycat', 'random-words']).default('random'),
    disabledExtensions: z.array(z.string()).default([]),
    maxFileSize: z.string().default('100mb'),
    defaultExpiration: z.string().nullable().default(null),
    assumeMimetypes: z.boolean().default(false),
    defaultDateFormat: z.string().default('YYYY-MM-DD_HH:mm:ss'),
    removeGpsMetadata: z.boolean().default(false),
    randomWordsNumAdjectives: z.number().default(3),
    randomWordsSeparator: z.string().default('-'),
  }),
  urls: z.object({
    route: z.string().startsWith('/').min(1).trim().toLowerCase().default('/go'),
    length: z.number().default(6),
  }),
  datasource: z
    .object({
      type: z.enum(['local', 's3']).default('local'),
      s3: z
        .object({
          accessKeyId: z.string(),
          secretAccessKey: z.string(),
          region: z.string(),
          bucket: z.string(),
          endpoint: z.string().nullable().default(null),
          forcePathStyle: z.boolean().default(false),
        })
        .optional(),
      local: z
        .object({
          directory: z
            .string()
            .transform((s) => resolve(s))
            .default('./uploads'),
        })
        .optional()
        .default({ directory: './uploads' }),
    })
    .superRefine((s, c) => {
      if (s.type === 's3' && !s.s3) {
        for (const key of ['accessKeyId', 'secretAccessKey', 'region', 'bucket']) {
          c.addIssue({
            code: z.ZodIssueCode.invalid_type,
            expected: 'string',
            received: 'unknown',
            path: ['s3', key],
          });
        }
      } else if (s.type === 'local' && !s.local) {
        c.addIssue({
          code: z.ZodIssueCode.invalid_type,
          expected: 'string',
          received: 'unknown',
          path: ['local', 'directory'],
        });
      }
    }),
  features: z.object({
    imageCompression: z.boolean().default(true),
    robotsTxt: z.boolean().default(false),
    healthcheck: z.boolean().default(true),
    userRegistration: z.boolean().default(false),
    oauthRegistration: z.boolean().default(false),
    deleteOnMaxViews: z.boolean().default(true),
    thumbnails: z.object({
      enabled: z.boolean().default(true),
      num_threads: z.number().default(4),
    }),
    metrics: z.object({
      enabled: z.boolean().default(true),
      adminOnly: z.boolean().default(false),
      showUserSpecific: z.boolean().default(true),
    }),
  }),
  invites: z.object({
    enabled: z.boolean().default(true),
    length: z.number().default(8),
  }),
  website: z.object({
    title: z.string().default('Zipline'),
    titleLogo: z.string().url().nullable().default(null),
    externalLinks: z
      .array(
        z.object({
          name: z.string(),
          url: z.string().url(),
        }),
      )
      .default([
        {
          name: 'GitHub',
          url: 'https://github.com/diced/zipline',
        },
        {
          name: 'Documentation',
          url: 'https://zipline.diced.sh',
        },
      ]),
    loginBackground: z.string().url().nullable().default(null),
    loginBackgroundBlur: z.boolean().default(true),
    defaultAvatar: z
      .string()
      .transform((s) => resolve(s))
      .nullable()
      .default(null),
    theme: z.object({
      default: z.string().default('system'),
      dark: z.string().default('builtin:dark_blue'),
      light: z.string().default('builtin:light_blue'),
    }),
    tos: z
      .string()
      .transform((s) => resolve(s))
      .refine((v) => (v ? v.endsWith('.md') : true))
      .nullable()
      .default(null),
  }),
  mfa: z.object({
    totp: z.object({
      enabled: z.boolean().default(false),
      issuer: z.string().default('Zipline'),
    }),
    passkeys: z.boolean().default(true),
  }),
  oauth: z.object({
    bypassLocalLogin: z.boolean().default(false),
    loginOnly: z.boolean().default(false),
    discord: z
      .object({
        clientId: z.string(),
        clientSecret: z.string(),
        redirectUri: z.string().url().nullable().default(null),
      })
      .or(
        z.object({
          clientId: z.undefined(),
          clientSecret: z.undefined(),
          redirectUri: z.undefined(),
        }),
      ),
    github: z
      .object({
        clientId: z.string(),
        clientSecret: z.string(),
        redirectUri: z.string().url().nullable().default(null),
      })
      .or(
        z.object({
          clientId: z.undefined(),
          clientSecret: z.undefined(),
          redirectUri: z.undefined(),
        }),
      ),
    google: z
      .object({
        clientId: z.string(),
        clientSecret: z.string(),
        redirectUri: z.string().url().nullable().default(null),
      })
      .or(
        z.object({
          clientId: z.undefined(),
          clientSecret: z.undefined(),
          redirectUri: z.undefined(),
        }),
      ),
    oidc: z
      .object({
        clientId: z.string(),
        clientSecret: z.string(),
        authorizeUrl: z.string().url(),
        userinfoUrl: z.string().url(),
        tokenUrl: z.string().url(),
        redirectUri: z.string().url().nullable().default(null),
      })
      .or(
        z.object({
          clientId: z.undefined(),
          clientSecret: z.undefined(),
          authorizeUrl: z.undefined(),
          userinfoUrl: z.undefined(),
          tokenUrl: z.undefined(),
          redirectUri: z.undefined(),
        }),
      ),
  }),
  discord: z
    .object({
      webhookUrl: z.string().url().nullable().default(null),
      username: z.string().nullable().default(null),
      avatarUrl: z.string().url().nullable().default(null),
      onUpload: discordContent,
      onShorten: discordContent,
    })
    .nullable()
    .default(null),
  ratelimit: z.object({
    enabled: z.boolean().default(true),
    max: z.number().default(10),
    window: z
      .number()
      .nullable()
      .default(null)
      .refine((v) => (v ? v > 0 : true)),
    adminBypass: z.boolean().default(true),
    allowList: z.array(z.string()).default([]),
  }),
  httpWebhook: z.object({
    onUpload: z.string().url().nullable().default(null),
    onShorten: z.string().url().nullable().default(null),
  }),
  ssl: z.object({
    key: z
      .string()
      .transform((s) => resolve(s))
      .nullable()
      .default(null),
    cert: z
      .string()
      .transform((s) => resolve(s))
      .nullable()
      .default(null),
  }),
  pwa: z.object({
    enabled: z.boolean().default(true),
    title: z.string().default('Zipline'),
    shortName: z.string().default('Zipline'),
    description: z.string().default('Zipline'),
    themeColor: z.string().default('#000000'),
    backgroundColor: z.string().default('#000000'),
  }),
});

export type Config = z.infer<typeof schema>;

const logger = log('config').c('validate');

export async function validateConfigObject(env: ParsedConfig): Promise<Config> {
  const building = !!process.env.ZIPLINE_BUILD;

  if (building) {
    logger.debug('building, skipping validation');
    // @ts-ignore
    return {};
  }

  const validated = schema.safeParse(env);
  if (!validated.success) {
    logger.error('There was an error while validating the environment.');

    for (const error of validated.error.errors) {
      handleError(error);
    }

    process.exit(1);
  }

  // flatten object for use with settingsValidator
  const flat = {
    "coreReturnHttpsUrls": validated.data.core.returnHttpsUrls,
    "corePort": validated.data.core.port,
    "coreHostname": validated.data.core.hostname,
    "coreSecret": validated.data.core.secret,
    "coreDatabaseUrl": validated.data.core.databaseUrl,
    "coreDefaultDomain": validated.data.core.defaultDomain,
    "coreTempDirectory": validated.data.core.tempDirectory,
    "chunksMax": validated.data.chunks.max,
    "chunksSize": validated.data.chunks.size,
    "chunksEnabled": validated.data.chunks.enabled,
    "tasksDeleteInterval": validated.data.tasks.deleteInterval,
    "tasksClearInvitesInterval": validated.data.tasks.clearInvitesInterval,
    "tasksMaxViewsInterval": validated.data.tasks.maxViewsInterval,
    "tasksThumbnailsInterval": validated.data.tasks.thumbnailsInterval,
    "tasksMetricsInterval": validated.data.tasks.metricsInterval,
    "filesRoute": validated.data.files.route,
    "filesLength": validated.data.files.length,
    "filesDefaultFormat": validated.data.files.defaultFormat,
    "filesDisabledExtensions": validated.data.files.disabledExtensions,
    "filesMaxFileSize": validated.data.files.maxFileSize,
    "filesDefaultExpiration": validated.data.files.defaultExpiration,
    "filesAssumeMimetypes": validated.data.files.assumeMimetypes,
    "filesDefaultDateFormat": validated.data.files.defaultDateFormat,
    "filesRemoveGpsMetadata": validated.data.files.removeGpsMetadata,
    "filesRandomWordsNumAdjectives": validated.data.files.randomWordsNumAdjectives,
    "filesRandomWordsSeparator": validated.data.files.randomWordsSeparator,
    "urlsRoute": validated.data.urls.route,
    "urlsLength": validated.data.urls.length,
    "datasourceType": validated.data.datasource.type,
    "datasourceS3AccessKeyId": validated.data.datasource.s3?.accessKeyId,
    "datasourceS3SecretAccessKey": validated.data.datasource.s3?.secretAccessKey,
    "datasourceS3Region": validated.data.datasource.s3?.region,
    "datasourceS3Bucket": validated.data.datasource.s3?.bucket,
    "datasourceS3Endpoint": validated.data.datasource.s3?.endpoint,
    "datasourceS3ForcePathStyle": validated.data.datasource.s3?.forcePathStyle,
    "datasourceLocalDirectory": validated.data.datasource.local.directory,
    "featuresImageCompression": validated.data.features.imageCompression,
    "featuresRobotsTxt": validated.data.features.robotsTxt,
    "featuresHealthcheck": validated.data.features.healthcheck,
    "featuresUserRegistration": validated.data.features.userRegistration,
    "featuresOauthRegistration": validated.data.features.oauthRegistration,
    "featuresDeleteOnMaxViews": validated.data.features.deleteOnMaxViews,
    "featuresThumbnailsEnabled": validated.data.features.thumbnails.enabled,
    "featuresThumbnailsNumThreads": validated.data.features.thumbnails.num_threads,
    "featuresMetricsEnabled": validated.data.features.metrics.enabled,
    "featuresMetricsAdminOnly": validated.data.features.metrics.adminOnly,
    "featuresMetricsShowUserSpecific": validated.data.features.metrics.showUserSpecific,
    "invitesEnabled": validated.data.invites.enabled,
    "invitesLength": validated.data.invites.length,
    "websiteTitle": validated.data.website.title,
    "websiteTitleLogo": validated.data.website.titleLogo,
    "websiteExternalLinks": validated.data.website.externalLinks,
    "websiteLoginBackground": validated.data.website.loginBackground,
    "websiteLoginBackgroundBlur": validated.data.website.loginBackgroundBlur,
    "websiteDefaultAvatar": validated.data.website.defaultAvatar,
    "websiteThemeDefault": validated.data.website.theme.default,
    "websiteThemeDark": validated.data.website.theme.dark,
    "websiteThemeLight": validated.data.website.theme.light,
    "websiteTos": validated.data.website.tos,
    "mfaTotpEnabled": validated.data.mfa.totp.enabled,
    "mfaTotpIssuer": validated.data.mfa.totp.issuer,
    "mfaPasskeys": validated.data.mfa.passkeys,
    "oauthBypassLocalLogin": validated.data.oauth.bypassLocalLogin,
    "oauthLoginOnly": validated.data.oauth.loginOnly,
    "oauthDiscordClientId": validated.data.oauth.discord.clientId,
    "oauthDiscordClientSecret": validated.data.oauth.discord.clientSecret,
    "oauthDiscordRedirectUri": validated.data.oauth.discord.redirectUri,
    "oauthGithubClientId": validated.data.oauth.github.clientId,
    "oauthGithubClientSecret": validated.data.oauth.github.clientSecret,
    "oauthGithubRedirectUri": validated.data.oauth.github.redirectUri,
    "oauthGoogleClientId": validated.data.oauth.google.clientId,
    "oauthGoogleClientSecret": validated.data.oauth.google.clientSecret,
    "oauthGoogleRedirectUri": validated.data.oauth.google.redirectUri,
    "oauthOidcClientId": validated.data.oauth.oidc.clientId,
    "oauthOidcClientSecret": validated.data.oauth.oidc.clientSecret,
    "oauthOidcAuthorizeUrl": validated.data.oauth.oidc.authorizeUrl,
    "oauthOidcUserinfoUrl": validated.data.oauth.oidc.userinfoUrl,
    "oauthOidcTokenUrl": validated.data.oauth.oidc.tokenUrl,
    "oauthOidcRedirectUri": validated.data.oauth.oidc.redirectUri,
    "discordWebhookUrl": validated.data.discord?.webhookUrl,
    "discordUsername": validated.data.discord?.username,
    "discordAvatarUrl": validated.data.discord?.avatarUrl,
    "discordOnUpload": validated.data.discord?.onUpload,
    "discordOnShorten": validated.data.discord?.onShorten,
    "ratelimitEnabled": validated.data.ratelimit.enabled,
    "ratelimitMax": validated.data.ratelimit.max,
    "ratelimitWindow": validated.data.ratelimit.window,
    "ratelimitAdminBypass": validated.data.ratelimit.adminBypass,
    "ratelimitAllowList": validated.data.ratelimit.allowList,
    "httpWebhookOnUpload": validated.data.httpWebhook.onUpload,
    "httpWebhookOnShorten": validated.data.httpWebhook.onShorten,
  };

  const result = await parseSettings(flat);

  if (!result.success) {
    logger.error('There was an error while validating the environment.');

    for (const error of result.error?.issues ?? []) {
      handleError(error);
    }

    process.exit(1);
  }

  logger.debug('reloaded config');

  return validated.data;
}

function handleError(error: ZodIssue) {
  logger.debug(JSON.stringify(error));

  if (error.code === 'invalid_union') {
    for (const unionError of error.unionErrors) {
      for (const subError of unionError.issues) {
        handleError(subError);
      }
    }

    return;
  }

  const path =
    error.path[1] === 'externalLinks'
      ? `WEBSITE_EXTERNAL_LINKS[${error.path[2]}]`
      : (PROP_TO_ENV[<keyof typeof PROP_TO_ENV>error.path.join('.')] ?? error.path.join('.'));

  logger.error(`${path}: ${error.message}`);
}
