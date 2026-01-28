import { config } from '@/lib/config';
import { Config } from '@/lib/config/validate';
import { getZipline } from '@/lib/db/models/zipline';
import enabled from '@/lib/oauth/enabled';
import { isTruthy } from '@/lib/primitive';
import typedPlugin from '@/server/typedPlugin';

export type ApiServerPublicResponse = {
  oauth: {
    bypassLocalLogin: boolean;
    loginOnly: boolean;
  };
  oauthEnabled: {
    discord: boolean;
    github: boolean;
    google: boolean;
    oidc: boolean;
  };
  website: {
    loginBackground?: string | null;
    loginBackgroundBlur?: boolean;
    title?: string;
    tos: boolean;
  };
  features: {
    oauthRegistration: boolean;
    userRegistration: boolean;
    metrics?: {
      adminOnly?: boolean;
    };
  };
  mfa: {
    passkeys: boolean;
  };
  turnstile: {
    enabled: boolean;
    siteKey?: string;
  };
  tos?: string | null;
  files: {
    maxFileSize: string;
    defaultFormat: Config['files']['defaultFormat'];
    maxExpiration?: string | null;
  };
  chunks: Config['chunks'];
  firstSetup: boolean;
  domains?: string[];
};

export const PATH = '/api/server/public';
export default typedPlugin(
  async (server) => {
    server.get<{ Body: Body }>(PATH, async (_, res) => {
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
        turnstile: {
          enabled: config.turnstile.enabled,
          siteKey: config.turnstile.siteKey,
        },
        files: {
          maxFileSize: config.files.maxFileSize,
          defaultFormat: config.files.defaultFormat,
          maxExpiration: config.files.maxExpiration,
        },
        chunks: config.chunks,
        firstSetup: zipline.firstSetup,
        domains: config.domains,
      };

      if (config.features.metrics.adminOnly) {
        response.features.metrics = { adminOnly: true };
      }

      if (config.website.tos) {
        response.tos = global.__cachedConfigValues__.tos!;
      }

      return res.send(response);
    });
  },
  { name: PATH },
);
