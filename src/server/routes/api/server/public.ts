import { config } from '@/lib/config';
import { schema as configSchema } from '@/lib/config/validate';
import { getZipline } from '@/lib/db/models/zipline';
import enabled from '@/lib/oauth/enabled';
import { isTruthy } from '@/lib/primitive';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiServerPublicResponse = z.infer<typeof publicConfigSchema>;

const publicConfigSchema = z.object({
  oauth: z.object({
    bypassLocalLogin: z.boolean(),
    loginOnly: z.boolean(),
  }),
  oauthEnabled: z.object({
    discord: z.boolean(),
    github: z.boolean(),
    google: z.boolean(),
    oidc: z.boolean(),
  }),
  website: z.object({
    loginBackground: z.string().nullable().optional(),
    loginBackgroundBlur: z.boolean().optional(),
    title: z.string().optional(),
    tos: z.boolean(),
  }),
  features: z.object({
    oauthRegistration: z.boolean(),
    userRegistration: z.boolean(),
    metrics: z
      .object({
        adminOnly: z.boolean().optional(),
      })
      .optional(),
  }),
  mfa: z.object({
    passkeys: z.boolean(),
  }),
  tos: z.string().nullable().optional(),
  files: z.object({
    maxFileSize: z.string(),
    defaultFormat: configSchema.shape.files.shape.defaultFormat,
    maxExpiration: z.string().nullable().optional(),
  }),
  chunks: configSchema.shape.chunks,
  firstSetup: z.boolean(),
  domains: z.array(z.string()).optional(),
  returnHttps: z.boolean(),
});

export const PATH = '/api/server/public';
export default typedPlugin(
  async (server) => {
    server.get<{ Body: Body }>(
      PATH,
      {
        schema: {
          description:
            'Return the public Zipline configuration used by the client, including OAuth, website, feature, file and chunk settings.',
          response: {
            200: publicConfigSchema.describe('the public configuration for the Zipline instance'),
          },
        },
      },
      async (_, res) => {
        const zipline = await getZipline();

        const response: ApiServerPublicResponse = {
          oauth: {
            bypassLocalLogin: config.oauth.bypassLocalLogin,
            loginOnly: config.oauth.loginOnly,
          },
          oauthEnabled: enabled(config),
          website: {
            loginBackground: config.website.loginBackground,
            loginBackgroundBlur: config.website.loginBackgroundBlur,
            title: config.website.title,
            tos: config.website.tos !== undefined,
          },
          features: {
            oauthRegistration: config.features.oauthRegistration,
            userRegistration: config.features.userRegistration,
          },
          mfa: {
            passkeys: isTruthy(
              config.mfa.passkeys.enabled,
              config.mfa.passkeys.rpID,
              config.mfa.passkeys.origin,
            ),
          },
          files: {
            maxFileSize: config.files.maxFileSize,
            defaultFormat: config.files.defaultFormat,
            maxExpiration: config.files.maxExpiration,
          },
          chunks: config.chunks,
          firstSetup: zipline.firstSetup,
          domains: config.domains,
          returnHttps: config.core.returnHttpsUrls,
        };

        if (config.features.metrics.adminOnly) {
          response.features.metrics = { adminOnly: true };
        }

        if (config.website.tos) {
          response.tos = global.__cachedConfigValues__.tos!;
        }

        return res.send(response);
      },
    );
  },
  { name: PATH },
);
