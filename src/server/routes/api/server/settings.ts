import { bytes } from '@/lib/bytes';
import { reloadSettings } from '@/lib/config';
import { readDatabaseSettings } from '@/lib/config/read';
import { prisma } from '@/lib/db';
import { readThemes } from '@/lib/theme/file';
import { administratorMiddleware } from '@/server/middleware/administrator';
import { userMiddleware } from '@/server/middleware/user';
import fastifyPlugin from 'fastify-plugin';
import { statSync } from 'fs';
import ms from 'ms';
import { cpus } from 'os';
import { z } from 'zod';

type Settings = Awaited<ReturnType<typeof readDatabaseSettings>>;

export type ApiServerSettingsResponse = Settings;
type Body = Partial<Settings>;

const zMs = z
  .union([z.number().min(1), z.string()])
  .transform((value) => (typeof value === 'string' ? ms(value) : value))
  .refine((value) => value > 0, 'Value must be greater than 0');

const zBytes = z
  .union([z.number().min(1), z.string()])
  .transform((value) => (typeof value === 'string' ? bytes(value) : value))
  .refine((value) => value > 0, 'Value must be greater than 0');

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
  .transform((value) => (typeof value === 'string' ? JSON.parse(value) : value))
  .transform((value) =>
    typeof value === 'object' ? (Object.keys(value || {}).length ? value : null) : value,
  );

export const PATH = '/api/server/settings';
export default fastifyPlugin(
  (server, _, done) => {
    server.get<{ Body: Body }>(
      PATH,
      {
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

        if (!settings) return res.notFound('no settings table found');

        return res.send(settings);
      },
    );

    server.patch<{ Body: Body }>(
      PATH,
      {
        preHandler: [userMiddleware, administratorMiddleware],
      },
      async (req, res) => {
        const settings = await prisma.zipline.findFirst();
        if (!settings) return res.notFound('no settings table found');

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
            coreDefaultDomain: z.string().nullable(),
            coreReturnHttpsUrls: z.boolean(),

            chunksEnabled: z.boolean(),
            chunksMax: zBytes,
            chunksSize: zBytes,

            tasksDeleteInterval: zMs,
            tasksClearInvitesInterval: zMs,
            tasksMaxViewsInterval: zMs,
            tasksThumbnailsInterval: zMs,
            tasksMetricsInterval: zMs,

            filesRoute: z.string().startsWith('/'),
            filesLength: z.number().min(1).max(64),
            filesDefaultFormat: z.enum(['random', 'date', 'uuid', 'name', 'gfycat']),
            filesDisabledExtensions: z
              .union([z.array(z.string()), z.string()])
              .transform((value) =>
                typeof value === 'string' ? value.split(',').map((ext) => ext.trim()) : value,
              ),
            filesMaxFileSize: zMs,

            filesDefaultExpiration: zBytes,
            filesAssumeMimetypes: z.boolean(),
            filesDefaultDateFormat: z.string(),
            filesRemoveGpsMetadata: z.boolean(),

            urlsRoute: z.string().startsWith('/'),
            urlsLength: z.number().min(1).max(64),

            featuresImageCompression: z.boolean(),
            featuresRobotsTxt: z.boolean(),
            featuresHealthcheck: z.boolean(),
            featuresUserRegistration: z.boolean(),
            featuresOauthRegistration: z.boolean(),
            featuresDeleteOnMaxViews: z.boolean(),

            featuresThumbnailsEnabled: z.boolean(),
            featuresThumbnailsNumberThreads: z.number().min(1).max(cpus().length),

            featuresMetricsEnabled: z.boolean(),
            featuresMetricsAdminOnly: z.boolean(),
            featuresMetricsShowUserSpecific: z.boolean(),

            invitesEnabled: z.boolean(),
            invitesLength: z.number().min(1).max(64),

            websiteTitle: z.string(),
            websiteTitleLogo: z.string().url().nullable(),
            websiteExternalLinks: z
              .union([
                z.array(
                  z.object({
                    name: z.string(),
                    url: z.string().url(),
                  }),
                ),
                z.string(),
              ])
              .transform((value) => (typeof value === 'string' ? JSON.parse(value) : value)),
            websiteLoginBackground: z.string().url().nullable(),
            websiteDefaultAvatar: z.string().url().nullable(),
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
            oauthGoogleClientId: z.string().nullable(),
            oauthGoogleClientSecret: z.string().nullable(),
            oauthGithubClientId: z.string().nullable(),
            oauthGithubClientSecret: z.string().nullable(),
            oauthOidcClientId: z.string().nullable(),
            oauthOidcClientSecret: z.string().nullable(),
            oauthOidcAuthorizeUrl: z.string().url().nullable(),
            oauthOidcTokenUrl: z.string().url().nullable(),
            oauthOidcUserinfoUrl: z.string().url().nullable(),

            mfaTotpEnabled: z.boolean(),
            mfaTotpIssuer: z.string(),
            mfaPasskeys: z.boolean(),

            ratelimitEnabled: z.boolean(),
            ratelimitMax: z.number().refine((value) => value > 0, 'Value must be greater than 0'),
            ratelimitWindow: z.number().nullable(),
            ratelimitAdminBypass: z.boolean(),
            ratelimitAllowList: z
              .union([z.array(z.string()), z.string()])
              .transform((value) => (typeof value === 'string' ? value.split(',') : value)),

            httpWebhookOnUpload: z.string().url().nullable(),
            httpWebhookOnShorten: z.string().url().nullable(),

            discordWebhookUrl: z.string().url().nullable(),
            discordUsername: z.string().nullable(),
            discordAvatarUrl: z.string().url().nullable(),

            discordOnUploadWebhookUrl: z.string().url().nullable(),
            discordOnUploadUsername: z.string().nullable(),
            discordOnUploadAvatarUrl: z.string().url().nullable(),
            discordOnUploadContent: z.string().nullable(),
            discordOnUploadEmbed: discordEmbed,

            discordOnShortenWebhookUrl: z.string().url().nullable(),
            discordOnShortenUsername: z.string().nullable(),
            discordOnShortenAvatarUrl: z.string().url().nullable(),
            discordOnShortenContent: z.string().nullable(),
            discordOnShortenEmbed: discordEmbed,
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
          });

        const result = settingsBodySchema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).send({
            statusCode: 400,
            issues: result.error.issues,
          });
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

        return res.send(newSettings);
      },
    );

    done();
  },
  { name: PATH },
);
