import { config } from '@/lib/config';
import { log } from '@/lib/logger';
import { getVersion } from '@/lib/version';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';

export type ApiVersionResponse = {
  details: ReturnType<typeof getVersion>;
  data: VersionAPI;
  cached: true;
};

type VersionAPI = {
  isUpstream: boolean;
  isRelease: boolean;
  isLatest: boolean;
  version: {
    tag: string;
    sha: string;
    url: string;
  };
  latest: {
    tag: string;
    url: string;
    commit?: {
      sha: string;
      url: string;
      pull: boolean;
    };
  };
};

const logger = log('api').c('version');

let cachedData: VersionAPI | null = null;
let cachedAt = 0;

export const PATH = '/api/version';
export default typedPlugin(
  async (server) => {
    server.get(PATH, { preHandler: [userMiddleware] }, async (_, res) => {
      if (!config.features.versionChecking) return res.notFound();

      const details = getVersion();

      // 6 hrs cache
      if (cachedData && Date.now() - cachedAt < 6 * 60 * 60 * 1000) {
        return res.send({ data: cachedData, details, cached: true });
      }

      const url = new URL(config.features.versionAPI);
      url.pathname = '/';
      url.searchParams.set('details', JSON.stringify(details));

      try {
        const resp = await fetch(url);

        if (!resp.ok) {
          logger.error('failed to fetch version details', {
            status: resp.status,
            statusText: resp.statusText,
            text: await resp.text(),
          });

          return res.internalServerError('failed to fetch version details');
        }

        const data: VersionAPI = await resp.json();

        cachedData = data;
        cachedAt = Date.now();

        return res.send({
          data,
          details,
          cached: false,
        });
      } catch (e) {
        logger.error('failed to fetch version details').error(e as Error);
        return res.internalServerError('failed to fetch version details');
      }
    });
  },
  { name: PATH },
);
