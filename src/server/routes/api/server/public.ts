import { config } from '@/lib/config';
import { Config } from '@/lib/config/validate';
import { getZipline } from '@/lib/db/models/zipline';
import { log } from '@/lib/logger';
import enabled from '@/lib/oauth/enabled';
import fastifyPlugin from 'fastify-plugin';
import { readFile } from 'fs/promises';

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

const logger = log('api').c('server').c('public');

let tosCache: string | null = null;

export const PATH = '/api/server/public';
export default fastifyPlugin(
  (server, _, done) => {
    server.get<{ Body: Body }>(PATH, async (req, res) => {
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
          passkeys: config.mfa.passkeys,
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
        try {
          if (tosCache === null) {
            const tos = await readFile(config.website.tos, 'utf8');
            tosCache = tos;
          }
          response.tos = tosCache;
        } catch {
          response.tos = null;
        }
      }

      return res.send(response);
    });

    done();
  },
  { name: PATH },
);
