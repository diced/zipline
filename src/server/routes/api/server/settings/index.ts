import { ApiError } from '@/lib/api/errors';
import { bytes } from '@/lib/bytes';
import { checkOutput, COMPRESS_TYPES } from '@/lib/compress';
import { applySettings, prepareSettings } from '@/lib/config';
import { DATABASE_TO_PROP, type readDatabaseSettings } from '@/lib/config/read/db';
import { safeConfig } from '@/lib/config/safe';
import {
  schema as configSchema,
  discordContent,
  MAX_SAFE_TIMEOUT_MS,
  MIME_REGEX,
  trustedProxiesSchema,
} from '@/lib/config/validate';
import { db } from '@/lib/db';
import { getSettings, updateSettings } from '@/lib/db/models/zipline';
import { zipline } from '@/lib/db/schema';
import { log } from '@/lib/logger';
import { secondlyRatelimit } from '@/lib/ratelimits';
import { RESERVED_ROUTES } from '@/lib/reservedRoutes';
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
const jsonTransform = (value: unknown, ctx: z.RefinementCtx) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
    return z.NEVER;
  }
};

const zMs = zStringTrimmed.refine(
  (value) => value.length > 0 && ms(value as StringValue) > 0,
  'Value must be greater than 0',
);
const zBytes = zStringTrimmed.refine((value) => bytes(value) > 0, 'Value must be greater than 0');

const zIntervalMs = zStringTrimmed
  .refine(
    (value) => value.length > 0 && ms(value as StringValue) >= 0,
    'Value must be greater than or equal to 0',
  )
  .refine(
    (value) => value.length > 0 && ms(value as StringValue) <= MAX_SAFE_TIMEOUT_MS,
    `Value must be less than or equal to ${MAX_SAFE_TIMEOUT_MS}ms`,
  );

const discordEmbed = z.preprocess(jsonTransform, discordContent.unwrap().unwrap().shape.embed);

const logger = log('api').c('server').c('settings');

function invalidSettings(error: z.ZodError) {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join('.');
    const fields = Object.entries(DATABASE_TO_PROP)
      .filter(
        ([field, property]) =>
          issue.path[0] === field ||
          path === property ||
          path.startsWith(`${property}.`) ||
          property.startsWith(`${path}.`),
      )
      .map(([field]) => field);

    return { ...issue, path: fields.length ? fields : issue.path };
  });

  logger.warn('invalid settings update', { issues });

  return new ApiError(1022).add('issues', issues);
}

export const PATH = '/api/server/settings';
export default typedPlugin(
  async (server) => {
    let pendingUpdate = Promise.resolve();

    server.get(
      PATH,
      {
        schema: {
          description:
            'Fetch the full Zipline server settings row along with a list of configuration keys that were overridden at runtime.',
          response: {
            200: z.object({
              settings: z.custom<Settings>(),
              tampered: z.array(z.string()),
            }),
          },
          tags: ['auth', 'superadmin'],
        },
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (req, res) => {
        if (req.user.role !== 'SUPERADMIN') throw new ApiError(3015);

        const settings = await getSettings();

        if (!settings) throw new ApiError(4010);

        return res.send({ settings, tampered: global.__tamperedConfig__ || [] });
      },
    );

    server.patch(
      PATH,
      {
        schema: {
          description: 'Partially update Zipline server settings.',
          body: z.custom<Partial<Settings>>(),
          response: {
            200: z.custom<ApiServerSettingsResponse>(),
          },
          tags: ['auth', 'superadmin'],
        },
        preHandler: [userMiddleware, administratorMiddleware],
        ...secondlyRatelimit(1),
      },
      async (req, res) => {
        if (req.user.role !== 'SUPERADMIN') throw new ApiError(3015);

        const availableThemes = await readThemes();
        const themes = availableThemes.map((theme) => theme.id);

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
            coreTrustedProxies: trustedProxiesSchema,

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
                (value) => !RESERVED_ROUTES.some((route) => value.startsWith(route)),
                'Provided route is reserved',
              ),
            filesLength: z.number().int().min(1).max(64),
            filesDisabledTypes: z.array(z.string().regex(MIME_REGEX, 'Invalid MIME type')),
            filesDisabledTypesDefault: z.string().regex(MIME_REGEX, 'Invalid MIME type').nullable(),
            filesDefaultFormat: z.enum(['random', 'date', 'uuid', 'name', 'gfycat', 'random-words']),
            filesDisabledExtensions: z
              .union([z.array(z.string()), z.string()])
              .transform((value) =>
                typeof value === 'string'
                  ? value
                      .split(',')
                      .map((ext) => ext.trim())
                      .filter(Boolean)
                  : value,
              )
              .pipe(z.array(z.string().refine((s) => !s.startsWith('.'), 'extension can\'t include "."'))),
            filesMaxFileSize: zBytes,
            filesDefaultExpiration: zMs.nullable(),
            filesMaxExpiration: zMs.nullable(),
            filesAssumeMimetypes: z.boolean(),
            filesDefaultDateFormat: z.string(),
            filesRemoveGpsMetadata: z.boolean(),
            filesRandomWordsNumAdjectives: z.number().int().min(1).max(20),
            filesRandomWordsSeparator: z.string(),
            filesDefaultCompressionFormat: z
              .enum(COMPRESS_TYPES)
              .refine((v) => checkOutput(v), 'System does not support outputting this image format.'),
            filesMaxFilesPerUpload: z.number().int().min(1).max(2147483647),
            filesExtensionlessUrls: z.boolean(),

            urlsRoute: z
              .string()
              .startsWith('/')
              .refine(
                (value) => !RESERVED_ROUTES.some((route) => value.startsWith(route)),
                'Provided route is reserved',
              ),
            urlsLength: z.number().int().min(1).max(64),

            featuresImageCompression: z.boolean(),
            featuresRobotsTxt: z.boolean(),
            featuresHealthcheck: z.boolean(),
            featuresUserRegistration: z.boolean(),
            featuresOauthRegistration: z.boolean(),
            featuresDeleteOnMaxViews: z.boolean(),

            featuresThumbnailsEnabled: z.boolean(),
            featuresThumbnailsNumberThreads: z
              .number()
              .int()
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

            invitesEnabled: z.boolean(),
            invitesLength: z.number().int().min(1).max(64),

            websiteTitle: z.string(),
            websiteTitleLogo: z.url().nullable(),
            websiteExternalLinks: z.preprocess(jsonTransform, configSchema.shape.website.shape.externalLinks),
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
                typeof value === 'string'
                  ? value
                      .split(',')
                      .map((id) => id.trim())
                      .filter(Boolean)
                  : value,
              ),
            oauthDiscordDeniedIds: z
              .union([
                z.array(z.string().refine((s) => /^\d+$/.test(s), 'Discord ID must be a number')),
                z
                  .string()
                  .refine((s) => s === '' || /^\d+(,\d+)*$/.test(s), 'Discord IDs must be comma-separated'),
              ])
              .transform((value) =>
                typeof value === 'string'
                  ? value
                      .split(',')
                      .map((id) => id.trim())
                      .filter(Boolean)
                  : value,
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
            oauthOidcEndSessionUrl: z.url().nullable(),
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
            ratelimitMax: z.number().int().min(1).max(2147483647),
            ratelimitWindow: z.number().int().min(0).max(2147483647).nullable(),
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

            domains: z
              .union([z.array(z.string()), z.string()])
              .transform((value) =>
                typeof value === 'string'
                  ? value
                      .split(',')
                      .map((domain) => domain.trim())
                      .filter(Boolean)
                  : value,
              )
              .pipe(
                z.array(
                  z
                    .string()
                    .regex(
                      /^(?:[a-zA-Z0-9_](?:[a-zA-Z0-9_-]{0,61}[a-zA-Z0-9_])?\.)+[a-zA-Z]{2,63}$/i,
                      'Invalid Domain',
                    ),
                ),
              ),
          })
          .partial()
          .refine((data) => Object.keys(data).length > 0, {
            message: 'No settings provided to update',
          });

        const result = settingsBodySchema.safeParse(req.body);
        if (!result.success) throw invalidSettings(result.error);

        const update = pendingUpdate.then(async () => {
          const updated = await db.transaction(async (tx) => {
            const [settings] = await tx.select().from(zipline).limit(1).for('update');
            if (!settings) throw new ApiError(4010);

            let prepared;
            try {
              prepared = await prepareSettings({ ...settings, ...result.data });
            } catch (error) {
              if (error instanceof z.ZodError) throw invalidSettings(error);
              throw error;
            }

            const newSettings = await updateSettings(settings.id, result.data, tx);
            if (!newSettings) throw new ApiError(4010);

            return { settings: newSettings, prepared };
          });

          applySettings(updated.prepared);
          return updated;
        });

        pendingUpdate = update.then(
          () => undefined,
          () => undefined,
        );
        const updated = await update;

        logger.info('settings updated', {
          updated: Object.keys(result.data),
          by: req.user.username,
        });

        return res.send({ settings: updated.settings, tampered: updated.prepared.tampered });
      },
    );
  },
  { name: PATH },
);
