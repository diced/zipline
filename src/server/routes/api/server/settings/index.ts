import { ApiError } from '@/lib/api/errors';
import { bytes } from '@/lib/bytes';
import { checkOutput, COMPRESS_TYPES } from '@/lib/compress';
import { reloadSettings } from '@/lib/config';
import type { readDatabaseSettings } from '@/lib/config/read/db';
import { safeConfig } from '@/lib/config/safe';
import { MAX_SAFE_TIMEOUT_MS, MIME_REGEX } from '@/lib/config/validate';
import { prisma } from '@/lib/db';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { readThemes } from '@/lib/theme/file';
import { zStringTrimmed } from '@/lib/validation';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import { statSync } from 'fs';
import ms, { StringValue } from 'ms';
import { cpus } from 'os';
import { resolve } from 'path';
import { z } from 'zod';

type Settings = Awaited<ReturnType<typeof readDatabaseSettings>>;

export type ApiServerSettingsResponse = { settings: Settings; tampered: string[] };
export type ApiServerSettingsWebResponse = {
  config: ReturnType<typeof safeConfig>;
  codeMap: { ext: string; mime: string; name: string }[];
};
export const reservedRoutes = [
  '/dashboard',
  '/auth',
  '/api',
  '/raw',
  '/r',
  '/invite',
  '/view',
  '/robots.txt',
  '/manifest.json',
  '/favicon.ico',
];

const jsonTransform = (value: any, ctx: z.RefinementCtx) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
    return z.NEVER;
  }
};

const zMs = zStringTrimmed.refine(
  (value) => ms((value ?? '0') as StringValue) > 0,
  'Value must be greater than 0',
);
const zBytes = zStringTrimmed.refine((value) => bytes(value) > 0, 'Value must be greater than 0');

const zIntervalMs = zStringTrimmed
  .refine((value) => ms((value ?? '0') as StringValue) >= 0, 'Value must be greater than or equal to 0')
  .refine(
    (value) => ms(value as StringValue) <= MAX_SAFE_TIMEOUT_MS,
    `Value must be less than or equal to ${MAX_SAFE_TIMEOUT_MS}ms`,
  );

const discordEmbed = z
  .union([
    z
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
      .transform((value) => (Object.keys(value || {}).length ? value : null)),
    z.string(),
  ])
  .nullable()
  .transform(jsonTransform)
  .transform((value) =>
    typeof value === 'object' ? (Object.keys(value || {}).length ? value : null) : value,
  );

const logger = log('api').c('server').c('settings');

export const PATH = '/api/server/settings';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'Fetch the full Zipline server settings row along with a list of configuration keys that were overridden at runtime (admin only).',
          response: {
            200: z.object({
              settings: z.custom<Settings>(),
              tampered: z.array(z.string()),
            }),
          },
          tags: ['auth', 'admin'],
        },
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (_, res) => {
        const settings = await prisma.zipline.findFirst({
          omit: {
            createdAt: true,
            updatedAt: true,
            id: true,
            firstSetup: true,
          },
        });

        if (!settings) throw new ApiError(4010);

        return res.send({ settings, tampered: global.__tamperedConfig__ || [] });
      },
    );

    server.patch(
      PATH,
      {
        schema: {
          description:
            'Partially update Zipline server settings using a validated subset of configuration keys (admin only).',
          body: z.custom<Partial<Settings>>(),
          response: {
            200: z.custom<ApiServerSettingsResponse>(),
          },
          tags: ['auth', 'admin'],
        },
        preHandler: [userMiddleware, administratorMiddleware],
        ...secondlyRatelimit(1),
      },
      async (req, res) => {
        const settings = await prisma.zipline.findFirst();
        if (!settings) throw new ApiError(4010);

        const themes = (await readThemes()).map((x) => x.id);

        const settingsBodySchema = z
          .object({
            coreTempDirectory: z.string().refine((dir) => {
              try {
                return !dir || statSync(dir).isDirectory();
              } catch {
                return false;
              }
            }, 'Directory does not exist'),
            coreDefaultDomain: z
              .string()
              .nullable()
              .refine((value) => !value || /^[a-z0-9-.]+$/.test(value), 'Invalid domain format'),
            coreReturnHttpsUrls: z.boolean(),
            coreTrustProxy: z.boolean(),

            chunksEnabled: z.boolean(),
            chunksMax: zBytes,
            chunksSize: zBytes,

            tasksDeleteInterval: zIntervalMs,
            tasksClearInvitesInterval: zIntervalMs,
            tasksMaxViewsInterval: zIntervalMs,
            tasksThumbnailsInterval: zIntervalMs,
            tasksMetricsInterval: zIntervalMs,
            tasksCleanThumbnailsInterval: zIntervalMs,

            filesRoute: z
              .string()
              .startsWith('/')
              .refine(
                (value) => !reservedRoutes.some((route) => value.startsWith(route)),
                'Provided route is reserved',
              ),
            filesLength: z.number().min(1).max(64),
            filesDisabledTypes: z.array(z.string().regex(MIME_REGEX, 'Invalid MIME type')),
            filesDisabledTypesDefault: z.string().regex(MIME_REGEX, 'Invalid MIME type').nullable(),
            filesDefaultFormat: z.enum(['random', 'date', 'uuid', 'name', 'gfycat']),
            filesDisabledExtensions: z
              .union([
                z.array(z.string().refine((s) => !s.startsWith('.'), 'extension can\'t include "."')),
                z.string(),
              ])
              .transform((value) =>
                typeof value === 'string' ? value.split(',').map((ext) => ext.trim()) : value,
              ),
            filesMaxFileSize: zBytes,
            filesDefaultExpiration: zMs.nullable(),
            filesMaxExpiration: zMs.nullable(),
            filesAssumeMimetypes: z.boolean(),
            filesDefaultDateFormat: z.string(),
            filesRemoveGpsMetadata: z.boolean(),
            filesRandomWordsNumAdjectives: z.number().min(1).max(20),
            filesRandomWordsSeparator: z.string(),
            filesDefaultCompressionFormat: z
              .enum(COMPRESS_TYPES)
              .refine((v) => checkOutput(v), 'System does not support outputting this image format.'),
            filesMaxFilesPerUpload: z.number().min(1).max(2147483647),
            filesExtensionlessUrls: z.boolean(),

            urlsRoute: z
              .string()
              .startsWith('/')
              .refine(
                (value) => !reservedRoutes.some((route) => value.startsWith(route)),
                'Provided route is reserved',
              ),
            urlsLength: z.number().min(1).max(64),

            featuresImageCompression: z.boolean(),
            featuresRobotsTxt: z.boolean(),
            featuresHealthcheck: z.boolean(),
            featuresUserRegistration: z.boolean(),
            featuresOauthRegistration: z.boolean(),
            featuresDeleteOnMaxViews: z.boolean(),

            featuresThumbnailsEnabled: z.boolean(),
            featuresThumbnailsNumberThreads: z
              .number()
              .min(1)
              .max(
                cpus().length,
                'Number of threads must be less than or equal to the number of CPUs: ' + cpus().length,
              ),
            featuresThumbnailsFormat: z.enum(['jpg', 'png', 'webp']),
            featuresThumbnailsInstantaneous: z.boolean(),

            featuresMetricsEnabled: z.boolean(),
            featuresMetricsAdminOnly: z.boolean(),
            featuresMetricsShowUserSpecific: z.boolean(),

            featuresVersionChecking: z.boolean(),
            featuresVersionAPI: z.url(),

            invitesEnabled: z.boolean(),
            invitesLength: z.number().min(1).max(64),

            websiteTitle: z.string(),
            websiteTitleLogo: z.url().nullable(),
            websiteExternalLinks: z
              .union([
                z.array(
                  z.object({
                    name: z.string(),
                    url: z.url(),
                  }),
                ),
                z.string(),
              ])
              .transform(jsonTransform),
            websiteLoginBackground: z.url().nullable(),
            websiteLoginBackgroundBlur: z.boolean(),
            websiteDefaultAvatar: z
              .string()
              .nullable()
              .transform((s) => (s ? resolve(s) : null))
              .refine((input) => {
                try {
                  return !input || statSync(input).isFile();
                } catch {
                  return false;
                }
              }, 'File does not exist'),
            websiteTos: z
              .string()
              .nullable()
              .refine((input) => !input || input.endsWith('.md'), 'File is not a markdown file')
              .refine((input) => {
                try {
                  return !input || statSync(input).isFile();
                } catch {
                  return false;
                }
              }, 'File does not exist'),

            websiteThemeDefault: z.enum(['system', ...themes]),
            websiteThemeDark: z.enum(themes as unknown as readonly [string, ...string[]]),
            websiteThemeLight: z.enum(themes as unknown as readonly [string, ...string[]]),

            oauthBypassLocalLogin: z.boolean(),
            oauthLoginOnly: z.boolean(),

            oauthDiscordClientId: z.string().nullable(),
            oauthDiscordClientSecret: z.string().nullable(),
            oauthDiscordRedirectUri: z.url().endsWith('/api/auth/oauth/discord').nullable(),
            oauthDiscordAllowedIds: z
              .union([
                z.array(z.string().refine((s) => /^\d+$/.test(s), 'Discord ID must be a number')),
                z
                  .string()
                  .refine((s) => s === '' || /^\d+(,\d+)*$/.test(s), 'Discord IDs must be comma-separated'),
              ])
              .transform((value) =>
                typeof value === 'string' ? value.split(',').map((id) => id.trim()) : value,
              ),
            oauthDiscordDeniedIds: z
              .union([
                z.array(z.string().refine((s) => /^\d+$/.test(s), 'Discord ID must be a number')),
                z
                  .string()
                  .refine((s) => s === '' || /^\d+(,\d+)*$/.test(s), 'Discord IDs must be comma-separated'),
              ])
              .transform((value) =>
                typeof value === 'string' ? value.split(',').map((id) => id.trim()) : value,
              ),

            oauthGoogleClientId: z.string().nullable(),
            oauthGoogleClientSecret: z.string().nullable(),
            oauthGoogleRedirectUri: z.url().endsWith('/api/auth/oauth/google').nullable(),

            oauthGithubClientId: z.string().nullable(),
            oauthGithubClientSecret: z.string().nullable(),
            oauthGithubRedirectUri: z.url().endsWith('/api/auth/oauth/github').nullable(),

            oauthOidcClientId: z.string().nullable(),
            oauthOidcClientSecret: z.string().nullable(),
            oauthOidcAuthorizeUrl: z.url().nullable(),
            oauthOidcTokenUrl: z.url().nullable(),
            oauthOidcUserinfoUrl: z.url().nullable(),
            oauthOidcRedirectUri: z.url().endsWith('/api/auth/oauth/oidc').nullable(),

            mfaTotpEnabled: z.boolean(),
            mfaTotpIssuer: z.string(),

            mfaPasskeysEnabled: z.boolean(),
            mfaPasskeysRpID: z
              .string()
              .trim()
              .refine(
                (v) => v.length === 0 || /^[a-zA-Z0-9.-]+$/.test(v),
                'RP ID can only contain letters, numbers, dots, and hyphens. Example: example.com, localhost, zipline.example.com.',
              )
              .transform((v) => (v.length === 0 ? null : v))
              .nullable(),
            mfaPasskeysOrigin: z
              .string()
              .trim()
              .refine(
                (v) => v.length === 0 || /^https?:\/\/[a-zA-Z0-9.-]+(:\d+)?(\/.*)?$/.test(v),
                'Origin must be a valid URL starting with http:// or https://',
              )
              .transform((v) => (v.length === 0 ? null : v))
              .nullable(),

            ratelimitEnabled: z.boolean(),
            ratelimitMax: z.number().refine((value) => value > 0, 'Value must be greater than 0'),
            ratelimitWindow: z.number().nullable(),
            ratelimitAdminBypass: z.boolean(),
            ratelimitAllowList: z
              .union([z.array(z.string()), z.string()])
              .transform((value) => (typeof value === 'string' ? value.split(',') : value)),

            httpWebhookOnUpload: z.url().nullable(),
            httpWebhookOnShorten: z.url().nullable(),

            discordWebhookUrl: z.url().nullable(),
            discordUsername: z.string().nullable(),
            discordAvatarUrl: z.url().nullable(),

            discordOnUploadWebhookUrl: z.url().nullable(),
            discordOnUploadUsername: z.string().nullable(),
            discordOnUploadAvatarUrl: z.url().nullable(),
            discordOnUploadContent: z.string().nullable(),
            discordOnUploadEmbed: discordEmbed,

            discordOnShortenWebhookUrl: z.url().nullable(),
            discordOnShortenUsername: z.string().nullable(),
            discordOnShortenAvatarUrl: z.url().nullable(),
            discordOnShortenContent: z.string().nullable(),
            discordOnShortenEmbed: discordEmbed,

            pwaEnabled: z.boolean(),
            pwaTitle: z.string(),
            pwaShortName: z.string(),
            pwaDescription: z.string(),
            pwaThemeColor: z.string().regex(/^#?([a-f0-9]{6}|[a-f0-9]{3})$/, 'Invalid Color'),
            pwaBackgroundColor: z.string().regex(/^#?([a-f0-9]{6}|[a-f0-9]{3})/, 'Invalid Color'),

            domains: z.union([
              z.array(
                z
                  .string()
                  .regex(
                    /^[a-zA-Z0-9][a-zA-Z0-9-_]{0,61}[a-zA-Z0-9]{0,1}\.([a-zA-Z]{1,6}|[a-zA-Z0-9-]{1,30}\.[a-zA-Z]{2,30})$/gi,
                    'Invalid Domain',
                  ),
              ),
              z.string().transform((value) => value.split(',').map((s) => s.trim())),
            ]),
          })
          .partial()
          .refine(
            (data) =>
              (!data.oauthDiscordClientId || data.oauthDiscordClientSecret) &&
              (!data.oauthDiscordClientSecret || data.oauthDiscordClientId),
            {
              message: 'discord oauth fields are incomplete',
              path: ['oauthDiscordClientId', 'oauthDiscordClientSecret'],
            },
          )
          .refine(
            (data) =>
              (!data.oauthGoogleClientId || data.oauthGoogleClientSecret) &&
              (!data.oauthGoogleClientSecret || data.oauthGoogleClientId),
            {
              message: 'google oauth fields are incomplete',
              path: ['oauthGoogleClientId', 'oauthGoogleClientSecret'],
            },
          )
          .refine(
            (data) =>
              (!data.oauthGithubClientId || data.oauthGithubClientSecret) &&
              (!data.oauthGithubClientSecret || data.oauthGithubClientId),
            {
              message: 'github oauth fields are incomplete',
              path: ['oauthGithubClientId', 'oauthGithubClientSecret'],
            },
          )
          .refine(
            (data) =>
              (!data.oauthOidcClientId &&
                !data.oauthOidcClientSecret &&
                !data.oauthOidcAuthorizeUrl &&
                !data.oauthOidcTokenUrl &&
                !data.oauthOidcUserinfoUrl) ||
              (data.oauthOidcClientId &&
                data.oauthOidcClientSecret &&
                data.oauthOidcAuthorizeUrl &&
                data.oauthOidcTokenUrl &&
                data.oauthOidcUserinfoUrl),
            {
              message: 'oidc oauth fields are incomplete',
              path: [
                'oauthOidcClientId',
                'oauthOidcClientSecret',
                'oauthOidcAuthorizeUrl',
                'oauthOidcTokenUrl',
                'oauthOidcUserinfoUrl',
              ],
            },
          )
          .refine((data) => !data.ratelimitWindow || (data.ratelimitMax && data.ratelimitMax > 0), {
            message: 'ratelimitMax must be set if ratelimitWindow is set',
            path: ['ratelimitMax'],
          })
          .superRefine((data, ctx) => {
            if (!data.filesDefaultExpiration || !data.filesMaxExpiration) return;

            const def = ms(data.filesDefaultExpiration as StringValue);
            const max = ms(data.filesMaxExpiration as StringValue);

            if (def > max) {
              ctx.addIssue({
                code: 'custom',
                message: 'filesDefaultExpiration must be less than or equal to filesMaxExpiration',
                path: ['filesDefaultExpiration'],
              });
            }
          })
          .superRefine((data, ctx) => {
            if (data.mfaPasskeysEnabled) {
              if (!data.mfaPasskeysRpID || data.mfaPasskeysRpID.length === 0) {
                ctx.addIssue({
                  path: ['mfaPasskeysRpID'],
                  message: 'RP ID is required when passkeys are enabled',
                  code: 'custom',
                });
              }

              if (!data.mfaPasskeysOrigin || data.mfaPasskeysOrigin.length === 0) {
                ctx.addIssue({
                  path: ['mfaPasskeysOrigin'],
                  message: 'Origin is required when passkeys are enabled',
                  code: 'custom',
                });
              }
            }
          })
          .refine((data) => Object.keys(data).length > 0, {
            message: 'No settings provided to update',
          });

        const result = settingsBodySchema.safeParse(req.body);
        if (!result.success) {
          logger.warn('invalid settings update', {
            issues: result.error.issues,
          });

          throw new ApiError(1022).add('issues', result.error.issues);
        }

        const newSettings = await prisma.zipline.update({
          where: {
            id: settings.id,
          },
          // @ts-ignore
          data: {
            ...result.data,
          },
          omit: {
            createdAt: true,
            updatedAt: true,
            id: true,
            firstSetup: true,
          },
        });

        await reloadSettings();

        logger.info('settings updated', {
          updated: Object.keys(result.data),
          by: req.user.username,
        });

        return res.send({ settings: newSettings, tampered: global.__tamperedConfig__ || [] });
      },
    );
  },
  { name: PATH },
);
