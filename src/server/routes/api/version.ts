import { ApiError } from '@/lib/api/errors';
import { config } from '@/lib/config';
import { log } from '@/lib/logger';
import { isAdministrator } from '@/lib/role';
import { getVersion } from '@/lib/version';
import { userMiddleware } from '@/server/middleware/user';
import typedPlugin from '@/server/typedPlugin';
import z from 'zod';

export type ApiVersionResponse = {
  details: ReturnType<typeof getVersion>;
  data: VersionAPI;
  cached: true;
};

const versionApiSchema = z.object({
  isUpstream: z.boolean(),
  isRelease: z.boolean(),
  isLatest: z.boolean(),
  version: z.object({
    tag: z.string(),
    sha: z.string(),
    url: z.string(),
  }),
  latest: z.object({
    tag: z.string(),
    url: z.string(),
    commit: z
      .object({
        sha: z.string(),
        url: z.string(),
        pull: z.boolean(),
      })
      .optional(),
  }),
});

type VersionAPI = z.infer<typeof versionApiSchema>;

const logger = log('api').c('version');

let cachedData: VersionAPI | null = null;
let cachedAt = 0;

export const PATH = '/api/version';
export default typedPlugin(
  async (server) => {
    server.get(
      PATH,
      {
        schema: {
          description:
            'Return backend version information, including current build details and upstream/latest version metadata.',
          response: {
            200: z.object({
              data: versionApiSchema.describe('version information from the version checking API'),
              details: z.object({
                version: z.string(),
                sha: z.string().nullable(),
              }),
              cached: z.boolean(),
            }),
          },
          tags: ['auth'],
        },
        preHandler: [userMiddleware],
      },
      async (req, res) => {
        if (!config.features.versionChecking && !isAdministrator(req.user.role)) throw new ApiError(9002);

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

            throw new ApiError(6001);
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
          throw new ApiError(6001);
        }
      },
    );
  },
  { name: PATH },
);
